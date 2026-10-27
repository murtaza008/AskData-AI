import "server-only";
import { inferColumns } from "@/lib/uploads/infer";
import { UPLOAD_COLUMN_TYPES, type UploadColumn, type UploadDTO, type UploadLimits } from "@/lib/uploads/types";
import { ownerPool } from "@/server/db/pools";
import { prisma } from "@/server/db/prisma";
import { env, READONLY_ROLE } from "@/server/env";
import { ApiError } from "@/server/http";
import { invalidateUploadTables } from "@/server/sql/schema";
import {
  buildColumnData,
  createUploadTable,
  CsvValueError,
  parseCsvText,
  qualifiedUploadTable,
  UPLOADS_SCHEMA,
  uploadTableBaseName,
} from "@/server/uploads/csv-table";

/**
 * CSV uploads: each file becomes one table in the `uploads` schema, named
 * `u_<user prefix>_<file slug>`.
 *
 * Trust model: creating and dropping tables needs the owner connection, so
 * this is the one place user-supplied content reaches it. Nothing from the
 * file is ever interpolated into SQL except identifiers that were rebuilt from
 * scratch by `toIdentifier` (lowercase a–z, 0–9, underscore) and then quoted;
 * all cell values travel as bind parameters. The agent later reads these
 * tables through the read-only role and the same validator as everything else,
 * with an allow-list containing only the asking user's own tables.
 *
 * Sample uploads (`isSample`) are created by `npm run db:seed` for the demo
 * account: they never expire, cannot be deleted here and do not count
 * towards the upload limit.
 */

export function uploadLimits(): UploadLimits {
  return {
    maxBytes: env.uploadMaxBytes,
    maxRows: 50_000,
    maxColumns: 40,
    maxTables: 5,
    ttlDays: env.uploadTtlDays,
  };
}

type UploadRecord = {
  id: string;
  tableName: string;
  originalName: string;
  columns: unknown;
  rowCount: number;
  sizeBytes: number;
  createdAt: Date;
  expiresAt: Date;
  isSample: boolean;
};

function toDTO(row: UploadRecord): UploadDTO {
  return {
    id: row.id,
    tableName: `${UPLOADS_SCHEMA}.${row.tableName}`,
    originalName: row.originalName,
    columns: row.columns as UploadColumn[],
    rowCount: row.rowCount,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    isSample: row.isSample,
  };
}

async function dropTable(tableName: string): Promise<void> {
  await ownerPool().query(`DROP TABLE IF EXISTS ${qualifiedUploadTable(tableName)}`);
}

/** Delete expired uploads (all users, or one user's). Returns how many were removed. */
export async function cleanupExpiredUploads(userId?: string): Promise<number> {
  const expired = await prisma.upload.findMany({
    where: { expiresAt: { lte: new Date() }, isSample: false, ...(userId ? { userId } : {}) },
    select: { id: true, userId: true, tableName: true },
  });
  for (const upload of expired) {
    await dropTable(upload.tableName);
    await prisma.upload.delete({ where: { id: upload.id } });
    invalidateUploadTables(upload.userId);
  }
  return expired.length;
}

export async function listUploads(userId: string): Promise<UploadDTO[]> {
  // Opportunistic clean-up, so expiry works even without the cron job.
  await cleanupExpiredUploads(userId);
  const rows = await prisma.upload.findMany({
    where: { userId },
    // Samples first, then the newest of the user's own files.
    orderBy: [{ isSample: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toDTO);
}

export async function deleteUpload(userId: string, id: string): Promise<void> {
  const upload = await prisma.upload.findFirst({ where: { id, userId } });
  if (!upload) throw new ApiError(404, "Upload not found.");
  // The demo account is shared: one visitor must not remove the sample for everyone.
  if (upload.isSample) throw new ApiError(403, "This sample file is part of the demo and can't be deleted.");
  await dropTable(upload.tableName);
  await prisma.upload.delete({ where: { id: upload.id } });
  invalidateUploadTables(userId);
}

function parseCsv(text: string, limits: UploadLimits): { headers: string[]; rows: string[][] } {
  const { headers, rows } = parseCsvText(text);

  if (headers.length === 0) throw new ApiError(400, "The file is empty.");
  if (rows.length === 0) throw new ApiError(400, "The file has a header row but no data rows.");
  if (headers.length > limits.maxColumns) {
    throw new ApiError(400, `Too many columns (${headers.length}). The limit is ${limits.maxColumns}.`);
  }
  if (rows.length > limits.maxRows) {
    throw new ApiError(
      400,
      `Too many rows (${rows.length.toLocaleString("en-US")}). The limit is ${limits.maxRows.toLocaleString("en-US")}.`,
    );
  }
  return { headers, rows };
}

async function uniqueTableName(userId: string, fileName: string): Promise<string> {
  const base = uploadTableBaseName(userId, fileName);
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? base : `${base}_${n}`;
    const taken = await prisma.upload.findUnique({ where: { tableName: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  throw new ApiError(409, "Too many uploads share this file name. Rename the file and try again.");
}

export async function createUpload(
  userId: string,
  file: File,
  typeOverrides: Record<string, string> = {},
): Promise<UploadDTO> {
  const limits = uploadLimits();

  if (file.size === 0) throw new ApiError(400, "The file is empty.");
  if (file.size > limits.maxBytes) {
    throw new ApiError(413, `The file is too large. The limit is ${Math.round(limits.maxBytes / 1024 / 1024)} MB.`);
  }
  if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
    throw new ApiError(400, "Only .csv files are supported.");
  }

  await cleanupExpiredUploads(userId);
  const existing = await prisma.upload.count({ where: { userId, isSample: false } });
  if (existing >= limits.maxTables) {
    throw new ApiError(409, `You can keep up to ${limits.maxTables} uploaded tables. Delete one first.`);
  }

  const { headers, rows } = parseCsv(await file.text(), limits);

  // Inferred types, with any the user changed in the preview applied on top.
  const columns = inferColumns(headers, rows).map((column) => {
    const override = UPLOAD_COLUMN_TYPES.find((type) => type === typeOverrides[column.name]);
    return override ? { ...column, type: override } : column;
  });

  let data: (string | null)[][];
  try {
    data = buildColumnData(columns, rows);
  } catch (error) {
    if (error instanceof CsvValueError) throw new ApiError(400, error.message);
    throw error;
  }

  const tableName = await uniqueTableName(userId, file.name);
  const client = await ownerPool().connect();

  try {
    await client.query("BEGIN");
    await createUploadTable(client, { tableName, columns, data, readonlyRole: READONLY_ROLE });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("[upload]", error);
    throw new ApiError(400, "The file could not be loaded. Check that it is a valid CSV with consistent columns.");
  } finally {
    client.release();
  }

  try {
    const record = await prisma.upload.create({
      data: {
        userId,
        tableName,
        originalName: file.name.slice(0, 200),
        columns,
        rowCount: rows.length,
        sizeBytes: file.size,
        expiresAt: new Date(Date.now() + limits.ttlDays * 24 * 60 * 60 * 1000),
      },
    });
    invalidateUploadTables(userId);
    return toDTO(record);
  } catch (error) {
    // Don't leave an orphan table behind if the metadata row could not be written.
    await dropTable(tableName).catch(() => undefined);
    throw error;
  }
}

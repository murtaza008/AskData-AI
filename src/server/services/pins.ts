import "server-only";
import { resolveChartSpec } from "@/lib/agent/chart";
import type { ChartSpec, QueryResult } from "@/lib/agent/types";
import { prisma } from "@/server/db/prisma";
import { ApiError } from "@/server/http";
import { QueryExecutionError, QueryRejectedError, runGuardedQuery } from "@/server/sql/execute";
import { getDataSource } from "@/server/sql/schema";

export type PinDTO = {
  id: string;
  title: string;
  question: string;
  sql: string;
  chart: ChartSpec;
  createdAt: string;
};

export type PinDataDTO = QueryResult & { chart: ChartSpec; refreshedAt: string };

const MAX_PINS = 24;

export async function listPins(userId: string): Promise<PinDTO[]> {
  const rows = await prisma.pinnedChart.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    question: row.question,
    sql: row.sql,
    chart: row.chart as unknown as ChartSpec,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createPin(
  userId: string,
  input: { title: string; question: string; sql: string; chart: ChartSpec },
): Promise<PinDTO> {
  const count = await prisma.pinnedChart.count({ where: { userId } });
  if (count >= MAX_PINS) {
    throw new ApiError(409, `The dashboard holds up to ${MAX_PINS} charts. Unpin one first.`);
  }

  // Never store SQL that would not pass the guard today. Running it also
  // proves the query is valid against this user's data.
  const { allowed } = await getDataSource(userId);
  try {
    await runGuardedQuery(input.sql, allowed);
  } catch (error) {
    if (error instanceof QueryRejectedError || error instanceof QueryExecutionError) {
      throw new ApiError(400, `This query can't be pinned: ${error.message}`);
    }
    throw error;
  }

  const row = await prisma.pinnedChart.create({
    data: { userId, title: input.title, question: input.question, sql: input.sql, chart: input.chart },
  });
  return {
    id: row.id,
    title: row.title,
    question: row.question,
    sql: row.sql,
    chart: input.chart,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function deletePin(userId: string, id: string): Promise<void> {
  const result = await prisma.pinnedChart.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new ApiError(404, "Pinned chart not found.");
}

/**
 * Re-run a pinned chart's stored SQL for fresh data.
 * Stored SQL gets no special trust: it goes through exactly the same
 * validation, row limit, timeout and read-only connection as a live question.
 */
export async function runPin(userId: string, id: string): Promise<PinDataDTO> {
  const pin = await prisma.pinnedChart.findFirst({ where: { id, userId } });
  if (!pin) throw new ApiError(404, "Pinned chart not found.");

  const { allowed } = await getDataSource(userId);
  try {
    const result = await runGuardedQuery(pin.sql, allowed);
    return {
      ...result,
      // Re-resolve against the live columns in case the result shape changed.
      chart: resolveChartSpec(pin.chart as unknown as ChartSpec, result.columns, result.rows),
      refreshedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof QueryRejectedError || error instanceof QueryExecutionError) {
      throw new ApiError(422, error.message);
    }
    throw error;
  }
}

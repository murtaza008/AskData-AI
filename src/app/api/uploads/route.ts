import type { UploadsResponse } from "@/lib/uploads/types";
import { ApiError, requireUser, route } from "@/server/http";
import { createUpload, listUploads, uploadLimits } from "@/server/services/uploads";

export const maxDuration = 60;

export const GET = route(async () => {
  const user = await requireUser();
  const body: UploadsResponse = { uploads: await listUploads(user.id), limits: uploadLimits() };
  return Response.json(body);
});

/** multipart/form-data: `file` (the CSV) and optional `types` (JSON map of column name → type). */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const { maxBytes } = uploadLimits();

  // Reject oversized bodies before buffering them.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes + 64 * 1024) {
    throw new ApiError(413, `The file is too large. The limit is ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, "Expected a file upload.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "No file was attached.");

  let types: Record<string, string> = {};
  const rawTypes = form.get("types");
  if (typeof rawTypes === "string" && rawTypes) {
    try {
      const parsed: unknown = JSON.parse(rawTypes);
      if (parsed && typeof parsed === "object") types = parsed as Record<string, string>;
    } catch {
      throw new ApiError(400, "Column types were malformed.");
    }
  }

  return Response.json({ upload: await createUpload(user.id, file, types) }, { status: 201 });
});

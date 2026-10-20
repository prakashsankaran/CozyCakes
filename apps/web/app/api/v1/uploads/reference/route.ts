import { z } from "zod";
import { ReferenceUploadRequestSchema, ReferenceUploadSchema } from "@cozycakes/core";
import { getDb, uploadsRepository } from "@cozycakes/db";
import { apiError, apiJson } from "@/lib/api";
import { signReferenceUpload } from "@/lib/uploads";

/** Signs a direct upload for a customer's reference photo (FR-008: images up to 10 MB). */
export async function POST(request: Request) {
  const body = ReferenceUploadRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return apiError(
      400,
      "INVALID_UPLOAD",
      "Reference photos must be JPG, PNG, WebP or HEIC images up to 10 MB",
      z.treeifyError(body.error),
    );
  }
  const signed = signReferenceUpload();
  if (!signed) {
    return apiError(503, "UPLOADS_UNAVAILABLE", "Photo uploads are not switched on yet");
  }
  await uploadsRepository(getDb()).createReferenceUpload({
    id: signed.id,
    url: signed.url,
    bytes: body.data.bytes,
    mime: body.data.mime,
  });
  return apiJson(ReferenceUploadSchema, {
    referenceUploadId: signed.id,
    uploadUrl: signed.uploadUrl,
    fields: signed.fields,
    url: signed.url,
  });
}

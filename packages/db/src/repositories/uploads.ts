import type { Database } from "../client";
import { referenceUploads } from "../schema";

/** Customer reference photos (data-model.md "ReferenceUpload"). */
export function uploadsRepository(db: Database) {
  return {
    async createReferenceUpload(upload: { id: string; url: string; bytes: number; mime: string }) {
      await db.insert(referenceUploads).values(upload);
    },
  };
}

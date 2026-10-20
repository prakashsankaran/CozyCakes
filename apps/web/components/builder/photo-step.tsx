"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import {
  REFERENCE_PHOTO_TYPES,
  ReferenceUploadSchema,
  referencePhotoProblem,
  type CakeConfig,
} from "@cozycakes/core";
import { site } from "@/lib/site";

type Photo = CakeConfig["referencePhoto"];

/**
 * Optional reference photo (FR-008, tasks T040). Files are checked on the device first, then sent
 * straight to Cloudinary with a signature from `POST /api/v1/uploads/reference`. A failed upload
 * can be retried without touching any other choice.
 */
export function PhotoStep({
  enabled,
  photo,
  onChange,
}: {
  enabled: boolean;
  photo: Photo;
  onChange: (photo: Photo) => void;
}) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setError(null);
    const problem = referencePhotoProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/v1/uploads/reference", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mime: file.type, bytes: file.size }),
      });
      if (!res.ok) throw new Error(`Sign failed: ${res.status}`);
      const signed = ReferenceUploadSchema.parse(await res.json());
      const form = new FormData();
      for (const [k, v] of Object.entries(signed.fields)) form.append(k, v);
      form.append("file", file);
      const uploaded = await fetch(signed.uploadUrl, { method: "POST", body: form });
      if (!uploaded.ok) throw new Error(`Upload failed: ${uploaded.status}`);
      onChange({ uploadId: signed.referenceUploadId, url: signed.url });
    } catch (err) {
      console.warn(err);
      setError("The photo didn't upload. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <p className="rounded-[var(--radius-md)] bg-caramel-200 p-4">
        Photo uploads are almost ready. For now, describe your theme in the message, or{" "}
        <Link href={site.instagramUrl} className="font-bold underline">
          send me the photo on Instagram
        </Link>{" "}
        after you order.
      </p>
    );
  }

  return (
    <div>
      <p className="text-cocoa-700">
        Share a picture of the theme, colours or characters you love (optional, up to 10 MB).
      </p>
      {photo ? (
        <div className="mt-4 flex items-center gap-4">
          <Image
            src={photo.url}
            alt="Your reference photo"
            width={96}
            height={96}
            className="h-24 w-24 rounded-[var(--radius-md)] object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-[var(--radius-pill)] bg-cream-100 px-4 py-2 font-bold hover:bg-cream-200"
          >
            Remove photo
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-md)] border-2 border-dashed border-cocoa-900/20 bg-cream-50 p-6 text-center has-focus-visible:outline-3 has-focus-visible:outline-blush-700"
        >
          <span aria-hidden="true" className="text-3xl">
            📸
          </span>
          <span className="font-bold">{busy ? "Uploading…" : "Choose a photo"}</span>
          <input
            id={inputId}
            type="file"
            accept={REFERENCE_PHOTO_TYPES.join(",")}
            disabled={busy}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="mt-3 font-bold text-blush-700">
          {error}
        </p>
      )}
    </div>
  );
}

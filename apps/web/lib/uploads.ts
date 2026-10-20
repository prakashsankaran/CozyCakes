import { createHash, randomUUID } from "node:crypto";

/**
 * Signed direct uploads to Cloudinary (research.md §9). The browser sends the file straight to
 * Cloudinary with parameters signed here, so photos never pass through our servers. Configured by
 * `CLOUDINARY_URL` (`cloudinary://<api_key>:<api_secret>@<cloud_name>`); without it, reference
 * photo uploads are switched off and the builder says so.
 */

const ALLOWED_FORMATS = "jpg,jpeg,png,webp,heic";

type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

function config(): CloudinaryConfig | null {
  const raw = process.env.CLOUDINARY_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "cloudinary:" || !url.username || !url.password || !url.hostname) {
      return null;
    }
    return {
      cloudName: url.hostname,
      apiKey: decodeURIComponent(url.username),
      apiSecret: decodeURIComponent(url.password),
    };
  } catch {
    return null;
  }
}

export function uploadsEnabled() {
  return config() !== null;
}

/** Cloudinary's signature: SHA-1 of the sorted `key=value` pairs followed by the API secret. */
export function signParams(params: Record<string, string>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1")
    .update(payload + apiSecret)
    .digest("hex");
}

/** Signs one direct image upload into `folder`; returns null when Cloudinary isn't configured. */
export function signImageUpload(folder: string, now = new Date()) {
  const cfg = config();
  if (!cfg) return null;
  const id = randomUUID();
  const params = {
    allowed_formats: ALLOWED_FORMATS,
    folder,
    public_id: id,
    timestamp: String(Math.floor(now.getTime() / 1000)),
  };
  return {
    id,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
    fields: { ...params, api_key: cfg.apiKey, signature: signParams(params, cfg.apiSecret) },
    // f_auto serves HEIC and other uploads in a format every browser can show.
    url: `https://res.cloudinary.com/${cfg.cloudName}/image/upload/f_auto,q_auto/${folder}/${id}`,
  };
}

/** Customer reference photos (US2). */
export function signReferenceUpload(now = new Date()) {
  return signImageUpload("cozycakes/reference", now);
}

/** Cake photos added by the owner in the back office (US5). */
export function signCakePhotoUpload(now = new Date()) {
  return signImageUpload("cozycakes/cakes", now);
}

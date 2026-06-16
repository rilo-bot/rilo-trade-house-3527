import { randomUUID } from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

/**
 * AWS S3 helper for listing-image uploads.
 *
 * Flow (server multipart): the client POSTs the file to our API as
 * `multipart/form-data`, the server validates it and uploads to S3 with its own
 * credentials, then returns the URL to store on the listing. The file bytes
 * never reach S3 from the browser, so the bucket needs no CORS config.
 */

export function isS3Configured(): boolean {
  return Boolean(
    env.S3_REGION &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY &&
      env.S3_BUCKET_NAME,
  );
}

/** Image MIME types accepted for listing photos. Single source of truth shared
 *  by the upload validator and the image proxy (so what we store is exactly
 *  what we allow ourselves to serve). SVG is intentionally excluded — it can
 *  carry script. */
export const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/**
 * Detect an image's real MIME type from its leading "magic" bytes, ignoring the
 * (spoofable) client-declared Content-Type. Returns one of {@link
 * ALLOWED_IMAGE_MIME} or `null` when the bytes don't match a supported raster
 * image. This is the security-critical check: it stops a mislabeled
 * HTML/SVG/script payload from being stored and later served same-origin
 * (stored-XSS).
 */
export function sniffImageMime(buf: Uint8Array): string | null {
  const b = buf;
  // JPEG: FF D8 FF
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF: "GIF87a" / "GIF89a"
  if (
    b.length >= 6 &&
    b[0] === 0x47 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x38 &&
    (b[4] === 0x37 || b[4] === 0x39) &&
    b[5] === 0x61
  ) {
    return "image/gif";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return "image/webp";
  }
  // AVIF (ISO-BMFF): bytes 4..8 = "ftyp", brand at 8..12 = "avif" / "avis"
  if (
    b.length >= 12 &&
    b[4] === 0x66 &&
    b[5] === 0x74 &&
    b[6] === 0x79 &&
    b[7] === 0x70
  ) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

let cachedClient: S3Client | null = null;

function client(): S3Client {
  if (!isS3Configured()) {
    throw new Error(
      "S3 is not configured — set S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME",
    );
  }
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: env.S3_REGION!,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return cachedClient;
}

/**
 * URL a stored object is served from.
 *
 * Default: a same-origin proxy (`/api/uploads/<key>`) that streams the object
 * using server credentials — so the bucket can stay PRIVATE (no public-read /
 * bucket policy needed) and next/image can still optimize it. Set
 * `S3_PUBLIC_URL` to a public CDN/bucket base (e.g. CloudFront) to serve
 * directly instead, which is faster for production.
 */
export function publicUrl(key: string): string {
  if (env.S3_PUBLIC_URL) {
    return `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }
  return `/api/uploads/${key}`;
}

/** Fetch an object from the bucket (used by the image proxy route). */
export function getObject(key: string): Promise<GetObjectCommandOutput> {
  return client().send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME!, Key: key }),
  );
}

export interface UploadResult {
  /** URL to persist on the listing (served via the private-bucket proxy). */
  url: string;
  /** Object key in the bucket — store this if you ever need to delete it. */
  key: string;
}

/**
 * Upload a listing image to S3 under `listings/<ownerId>/<uuid>-<file>` and
 * return the URL to store on the listing. The bytes are sent from the server
 * with our credentials, so no bucket CORS / public-read is required.
 */
export async function uploadListingImage(opts: {
  ownerId: string;
  fileName: string;
  contentType: string;
  body: Buffer | Uint8Array;
}): Promise<UploadResult> {
  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const key = `listings/${opts.ownerId}/${randomUUID()}-${safeName}`;

  await client().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME!,
      Key: key,
      Body: opts.body,
      ContentType: opts.contentType,
    }),
  );

  return { url: publicUrl(key), key };
}

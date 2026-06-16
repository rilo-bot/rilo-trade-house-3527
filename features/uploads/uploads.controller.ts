import { ok } from "@/lib/api/response";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/auth/guards";
import {
  uploadListingImage,
  isS3Configured,
  sniffImageMime,
  ALLOWED_IMAGE_MIME,
} from "@/lib/s3";

/**
 * POST /api/uploads — upload a listing image (multipart/form-data, field `file`).
 *
 * The browser POSTs the file here; we validate it (auth, size, content sniffed
 * from the actual bytes) and upload to S3 server-side, then return the URL to
 * store on the listing. The file bytes never reach S3 from the browser, so no
 * bucket CORS is needed.
 */
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function handleCreateUpload(request: Request): Promise<Response> {
  // 1. Auth — only signed-in users can upload.
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Sign in to upload");

  if (!isS3Configured()) {
    throw new BadRequestError(
      "Image uploads are not configured yet (missing S3 credentials)",
    );
  }

  // 2. Parse the multipart body.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new BadRequestError("Invalid upload payload");
  }

  // 3. Validate the file field.
  const file = formData.get("file");
  if (!(file instanceof File)) throw new BadRequestError("No file provided");
  if (file.size === 0) throw new BadRequestError("File is empty");
  if (file.size > MAX_SIZE_BYTES) {
    throw new BadRequestError(
      `File exceeds ${MAX_SIZE_BYTES / 1024 / 1024}MB limit`,
    );
  }

  // 4. Validate by MAGIC BYTES, not the client-declared Content-Type (which is
  //    spoofable). The sniffed type — never `file.type` — is what we persist as
  //    the object's Content-Type, so a mislabeled SVG/HTML/script payload can't
  //    be stored and later served same-origin (stored-XSS).
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = sniffImageMime(buffer);
  if (!contentType || !ALLOWED_IMAGE_MIME.has(contentType)) {
    throw new BadRequestError(
      "Unsupported image — use JPEG, PNG, WebP, GIF, or AVIF",
    );
  }

  // 5. Upload to S3 and return the URL to persist.
  const result = await uploadListingImage({
    ownerId: user.id,
    fileName: file.name,
    contentType,
    body: buffer,
  });

  return ok(result);
}

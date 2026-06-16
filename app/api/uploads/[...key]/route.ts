import { getObject, isS3Configured, ALLOWED_IMAGE_MIME } from "@/lib/s3";

/**
 * GET /api/uploads/<key> — streams a listing image from the (private) S3 bucket
 * using server credentials, so the bucket needs no public-read access. Listing
 * images are public content, so this route is unauthenticated; it's restricted
 * to the `listings/` prefix and keys contain UUIDs (not enumerable).
 *
 * In Next 16, route params are async — await them.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  if (!isS3Configured()) {
    return new Response("Uploads not configured", { status: 503 });
  }

  const { key: segments } = await ctx.params;
  const key = segments.map((s) => decodeURIComponent(s)).join("/");

  // Only serve listing images — never arbitrary bucket objects.
  if (!key.startsWith("listings/") || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const obj = await getObject(key);
    const body = obj.Body?.transformToWebStream();
    if (!body) return new Response("Not found", { status: 404 });

    // Only ever serve a known image type. Clamp anything else (an object that
    // somehow has an unexpected stored Content-Type) to octet-stream, and tell
    // the browser never to sniff/execute it — defense-in-depth against a
    // mislabeled payload acting as an active same-origin document.
    const upstreamType = obj.ContentType ?? "";
    const contentType = ALLOWED_IMAGE_MIME.has(upstreamType)
      ? upstreamType
      : "application/octet-stream";

    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        // Object keys are immutable (UUID per upload) — cache aggressively.
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(obj.ContentLength
          ? { "Content-Length": String(obj.ContentLength) }
          : {}),
        ...(obj.ETag ? { ETag: obj.ETag } : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

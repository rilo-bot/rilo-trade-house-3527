import { withErrorHandling } from "@/lib/api/handler";
import { handleCreateUpload } from "@/features/uploads/uploads.controller";

// POST /api/uploads — presigned S3 URL for a listing image
export const POST = withErrorHandling(handleCreateUpload);

"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { imageSrc } from "@/lib/utils";

/**
 * Uploads listing images by POSTing each file to `/api/uploads` as
 * multipart/form-data; the server uploads to S3 and returns the public URL,
 * which we report upward. No bucket CORS is required (browser talks only to us).
 */
export function ImageUploader({
  value,
  onChange,
  max = 20,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (value.length + uploaded.length >= max) break;

        // POST the file to our API as multipart/form-data. Do NOT set the
        // Content-Type header — the browser sets it (with the boundary) so
        // the server's request.formData() can parse it.
        const fd = new FormData();
        fd.append("file", file);

        const res = await fetch("/api/uploads", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || json.error || !json.data?.url) {
          throw new Error(
            json?.error?.message || `Upload failed for ${file.name}`,
          );
        }

        uploaded.push(json.data.url);
      }
      onChange([...value, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = (url: string) => onChange(value.filter((u) => u !== url));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((url) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border"
          >
            <Image src={imageSrc(url)} alt="" fill className="object-cover" sizes="120px" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {value.length < max && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted">
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Upload className="size-5" />
            )}
            <span className="text-xs">Add</span>
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {value.length}/{max} images · JPG, PNG, or WebP
      </p>
    </div>
  );
}

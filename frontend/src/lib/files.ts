import { fetchClient } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";

type Purpose = components["schemas"]["UploadUrlRequest"]["purpose"];

/** Uploads one file straight to Storage through a signed URL and returns its file id (office uploads; no offline queue). */
export async function uploadFile(file: File, purpose: Purpose): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  const { data, error } = await fetchClient.POST("/files/upload-url", { body: { purpose, contentType, sizeBytes: Math.max(1, file.size) } });
  if (error || !data) throw new Error("No upload URL");
  const response = await fetch(data.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  return data.fileId;
}

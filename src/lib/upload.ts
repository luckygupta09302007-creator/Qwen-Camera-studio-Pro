import { APPS_SCRIPT_URL } from "../config";

/**
 * Upload client for the Google Apps Script Web App backend.
 *
 * Protocol: a single POST with a JSON body (sent as text/plain to avoid a
 * CORS preflight, which Apps Script cannot answer). The body carries the
 * file as base64 plus filename/metadata. The backend writes the file to its
 * configured Drive folder (folder id lives in Script Properties, server-side)
 * and replies with JSON describing the stored file.
 *
 * No credentials ever touch the frontend.
 */

export interface DriveUploadResponse {
  success: boolean;
  id?: string;
  name?: string;
  url?: string;
  message?: string;
}

function normalize(raw: unknown): DriveUploadResponse {
  const r = (raw ?? {}) as Record<string, unknown>;
  const data = (r.data ?? r) as Record<string, unknown>;
  const ok =
    r.success === true ||
    r.status === "success" ||
    r.result === "success" ||
    !!r.id ||
    !!r.fileId ||
    !!data.id ||
    !!data.fileId;
  const id = (r.id ?? r.fileId ?? data.id ?? data.fileId) as string | undefined;
  const name = (r.name ?? r.fileName ?? data.name ?? data.fileName) as string | undefined;
  const url = (r.url ?? r.webViewLink ?? r.fileUrl ?? r.link ?? data.url ?? data.webViewLink ?? data.fileUrl) as
    | string
    | undefined;
  const message = (r.message ?? r.error ?? data.message) as string | undefined;
  return { success: !!ok, id, name, url, message };
}

export function uploadToDrive(
  blob: Blob,
  filename: string,
  mimeType: string,
  onProgress?: (fraction: number) => void
): Promise<DriveUploadResponse> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // Phase 1 (0 → 20%): base64 encoding of the local blob.
    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.((e.loaded / e.total) * 0.2);
    };
    reader.onerror = () => reject(new Error("Could not read the file locally."));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      const xhr = new XMLHttpRequest();
      xhr.open("POST", APPS_SCRIPT_URL);
      // text/plain keeps this a "simple request" — no preflight for Apps Script.
      xhr.setRequestHeader("Content-Type", "text/plain;charset=utf-8");
      xhr.timeout = 0;
      // Phase 2 (20 → 100%): network transfer to the backend.
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(0.2 + (e.loaded / e.total) * 0.8);
      };
      xhr.onload = () => {
        let parsed: DriveUploadResponse;
        try {
          parsed = normalize(JSON.parse(xhr.responseText));
        } catch {
          reject(
            new Error(
              xhr.status >= 200 && xhr.status < 300
                ? "Backend returned an unreadable response."
                : `Backend responded with HTTP ${xhr.status}.`
            )
          );
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300 && parsed.success) resolve(parsed);
        else reject(new Error(parsed.message || `Upload failed (HTTP ${xhr.status}).`));
      };
      xhr.onerror = () => reject(new Error("Network error while contacting the Apps Script backend."));
      xhr.ontimeout = () => reject(new Error("Upload timed out."));
      xhr.send(
        JSON.stringify({
          filename,
          mimeType,
          size: blob.size,
          // Both common field names are included for backend compatibility.
          payload: base64,
          data: base64,
        })
      );
    };
    reader.readAsDataURL(blob);
  });
}

/** Lightweight reachability check for the backend endpoint. */
export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(APPS_SCRIPT_URL, { method: "GET", redirect: "follow" });
    return res.ok;
  } catch {
    return false;
  }
}

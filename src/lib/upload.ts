import { APPS_SCRIPT_URL } from "../config";

export interface DriveUploadResponse {
  success: boolean;
  id?: string;
  name?: string;
  url?: string;
  size?: number;
  message?: string;
}

function normalize(raw: unknown): DriveUploadResponse {
  const r = (raw ?? {}) as Record<string, unknown>;

  return {
    success: r.success === true,
    id: (r.id ?? r.fileId) as string | undefined,
    name: (r.name ?? r.fileName) as string | undefined,
    url: (r.url ?? r.fileUrl ?? r.webViewLink) as string | undefined,
    size: r.size as number | undefined,
    message: (r.message ?? r.error) as string | undefined,
  };
}

export function uploadToDrive(
  blob: Blob,
  filename: string,
  mimeType: string,
  onProgress?: (fraction: number) => void
): Promise<DriveUploadResponse> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Could not read the file locally."));
    };

    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result ?? "");
        const base64 = dataUrl.includes(",")
          ? dataUrl.split(",")[1]
          : dataUrl;

        onProgress?.(0.2);

        /*
         * IMPORTANT:
         * Do NOT use XMLHttpRequest.
         * Do NOT set Content-Type.
         * A plain fetch POST avoids the custom-header preflight.
         */
        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({
            filename,
            mimeType,
            size: blob.size,
            payload: base64,
          }),
        });

        onProgress?.(0.9);

        if (!response.ok) {
          throw new Error(`Backend responded with HTTP ${response.status}.`);
        }

        const text = await response.text();

        let parsed: DriveUploadResponse;

        try {
          parsed = normalize(JSON.parse(text));
        } catch {
          throw new Error("Backend returned an unreadable response.");
        }

        if (!parsed.success) {
          throw new Error(parsed.message || "Upload failed.");
        }

        onProgress?.(1);

        resolve(parsed);
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Network error while contacting the Apps Script backend.")
        );
      }
    };

    reader.readAsDataURL(blob);
  });
}

export async function pingBackend(): Promise<boolean> {
  try {
    const response = await fetch(APPS_SCRIPT_URL);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Camera Studio Pro — centralized frontend configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the SINGLE source of truth for non-secret frontend settings.
 * Do not create duplicate config files; import from here.
 *
 * SECURITY
 *  - This file must NEVER contain passwords, API keys, upload secrets,
 *    OAuth tokens, or the Drive Folder ID.
 *  - All secrets and backend configuration (e.g. DRIVE_FOLDER_ID) live in
 *    the Apps Script project's Script Properties, server-side only.
 *  - The web-app URL below is public by design (Apps Script exec endpoint).
 *
 * DEPLOYMENT
 *  - Frontend: Netlify (static build, HTTPS — required for getUserMedia).
 *  - Backend:  Google Apps Script Web App ("Execute as: me", "Access: anyone").
 *  - Storage:  Google Drive folder configured on the backend, never here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Google Apps Script Web App endpoint that proxies uploads to Google Drive. */
export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwli1irYl_ETSh5Y_zrcDg7-ADu8OtoL2pcB-Y5dcZdr18ztRLX5ShwasBh4yL-npU/exec";

/** Hard upload ceiling enforced by the backend (25 MB). */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/** File extensions accepted for capture output and local imports. */
export const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "mp4", "mov", "webm"] as const;

/** MIME families accepted for local imports. */
export const ALLOWED_MIME_PREFIXES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

/** `accept` attribute for the file picker — derived, never duplicated elsewhere. */
export const FILE_PICKER_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm";

export const PHOTO_FORMATS = [
  { id: "jpeg", label: "JPG", mime: "image/jpeg", ext: "jpg" },
  { id: "png", label: "PNG", mime: "image/png", ext: "png" },
  { id: "webp", label: "WEBP", mime: "image/webp", ext: "webp" },
] as const;

export const VIDEO_CODECS = [
  { id: "auto", label: "AUTO" },
  { id: "webm", label: "WEBM" },
  { id: "mp4", label: "MP4" },
] as const;

export const RESOLUTIONS = [
  { id: "hd", label: "HD", width: 1280, height: 720 },
  { id: "fhd", label: "FHD", width: 1920, height: 1080 },
  { id: "uhd", label: "4K", width: 3840, height: 2160 },
] as const;

export const COUNTDOWN_OPTIONS = [0, 3, 5, 10] as const;

/**
 * Viewfinder frame ratios, mirroring a real camera app.
 * "full" fills the display area edge-to-edge; photos are cropped to match
 * whatever the viewfinder shows at capture time.
 */
export const FRAME_RATIOS = [
  { id: "4:3", label: "4:3" },
  { id: "16:9", label: "16:9" },
  { id: "1:1", label: "1:1" },
  { id: "full", label: "Full" },
] as const;

/** Target bitrate for recorded video. */
export const VIDEO_BITRATE = 10_000_000;

/** Filename prefix applied to captured media. */
export const FILENAME_PREFIX = "CSP";

/** localStorage keys (settings + Drive upload history metadata only — never blobs). */
export const STORAGE_KEYS = {
  settings: "csp.settings.v1",
  driveHistory: "csp.driveHistory.v1",
} as const;

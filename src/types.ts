export type CaptureMode = "photo" | "video";

export type MediaKind = "photo" | "video" | "file";

export type UploadStatus = "local" | "uploading" | "uploaded" | "error" | "oversize";

export type CameraStatus = "idle" | "starting" | "live" | "error";

export type Facing = "user" | "environment";

export type BackendState = "untested" | "testing" | "ok" | "fail";

export interface DriveRecord {
  /** Drive file id, when the backend returns one. */
  id?: string;
  /** Name of the file as stored in Drive. */
  name: string;
  size: number;
  mime: string;
  /** webViewLink / open URL, when the backend returns one. */
  url?: string;
  uploadedAt: number;
  /** Original local filename. */
  source: string;
}

export interface MediaItem {
  id: string;
  kind: MediaKind;
  name: string;
  mime: string;
  size: number;
  /** Present while a local copy is held. Cleared after a successful upload. */
  blob?: Blob;
  /** Object URL for preview. Revoked after a successful upload. */
  url?: string;
  createdAt: number;
  status: UploadStatus;
  progress: number;
  drive?: DriveRecord;
  note?: string;
}

export interface Settings {
  mode: CaptureMode;
  ratio: (typeof import("./config").FRAME_RATIOS)[number]["id"];
  photoFormat: (typeof import("./config").PHOTO_FORMATS)[number]["id"];
  photoQuality: number;
  resolution: (typeof import("./config").RESOLUTIONS)[number]["id"];
  countdown: number;
  mirrorFront: boolean;
  grid: boolean;
  recordAudio: boolean;
  codec: (typeof import("./config").VIDEO_CODECS)[number]["id"];
}

export interface Toast {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: "photo",
  ratio: "4:3",
  photoFormat: "jpeg",
  photoQuality: 92,
  resolution: "fhd",
  countdown: 0,
  mirrorFront: true,
  grid: true,
  recordAudio: true,
  codec: "auto",
};

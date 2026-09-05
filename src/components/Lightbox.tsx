import { useEffect } from "react";
import type { MediaItem } from "../types";
import { formatBytes, formatDateTime } from "../lib/helpers";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconExternal,
  IconTrash,
  IconUpload,
  IconX,
} from "./icons";

interface LightboxProps {
  item: MediaItem | null;
  hasPrev: boolean;
  hasNext: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onUpload: (id: string) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
}

export function Lightbox({
  item,
  hasPrev,
  hasNext,
  onClose,
  onPrev,
  onNext,
  onUpload,
  onDownload,
  onDelete,
}: LightboxProps) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, hasPrev, hasNext, onClose, onPrev, onNext]);

  if (!item || !item.url) return null;
  const isVideo = item.mime.startsWith("video/");
  const canUpload = !!item.blob && (item.status === "local" || item.status === "error");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,10,11,0.92)] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${item.name}`}
    >
      <div
        className="animate-pop relative grid w-full max-w-4xl overflow-hidden rounded-lg border border-line bg-bg1 shadow-[0_40px_120px_rgba(0,0,0,0.6)] md:grid-cols-[minmax(0,1fr)_264px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* media pane */}
        <div className="relative flex max-h-[52vh] items-center justify-center bg-black md:max-h-[76vh]">
          {isVideo ? (
            <video src={item.url} controls className="max-h-[52vh] w-full md:max-h-[76vh]" />
          ) : (
            <img
              src={item.url}
              alt={item.name}
              className="max-h-[52vh] w-full object-contain md:max-h-[76vh]"
            />
          )}
          {hasPrev && (
            <button
              onClick={onPrev}
              aria-label="Previous item"
              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full border border-line bg-black/60 p-2 text-mut transition-all hover:scale-105 hover:text-brand"
            >
              <IconChevronLeft className="h-4 w-4" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={onNext}
              aria-label="Next item"
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full border border-line bg-black/60 p-2 text-mut transition-all hover:scale-105 hover:text-brand"
            >
              <IconChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* meta pane */}
        <div className="flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-xs leading-relaxed break-all text-ink">{item.name}</p>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="shrink-0 rounded p-1 text-dim transition hover:bg-bg3 hover:text-ink"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>

          <dl className="mt-4 space-y-2.5 border-t border-line pt-4">
            {[
              ["Type", item.mime || "unknown"],
              ["Size", formatBytes(item.size)],
              ["Captured", formatDateTime(item.createdAt)],
              [
                "Status",
                item.status === "uploaded"
                  ? "In Google Drive"
                  : item.status === "uploading"
                    ? `Syncing ${item.progress}%`
                    : item.status === "oversize"
                      ? "Over 25 MB limit"
                      : item.status === "error"
                        ? "Upload failed"
                        : "Local only",
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3">
                <dt className="font-mono text-[9px] tracking-[0.2em] text-dim uppercase">{k}</dt>
                <dd className="truncate text-right font-mono text-[11px] text-mut">{v}</dd>
              </div>
            ))}
          </dl>

          {item.note && <p className="mt-3 text-[11px] leading-snug text-rec/90">{item.note}</p>}

          <div className="mt-auto flex flex-col gap-2 pt-5">
            {canUpload && (
              <button
                onClick={() => onUpload(item.id)}
                className="flex items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-sm font-bold text-bg0 transition-all hover:bg-brandsoft active:scale-[0.98]"
              >
                <IconUpload className="h-4 w-4" />
                Upload to Drive
              </button>
            )}
            {item.status === "uploaded" && item.drive?.url && (
              <a
                href={item.drive.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-md bg-ok/15 py-2.5 text-sm font-bold text-ok ring-1 ring-ok/40 transition-all hover:bg-ok/25 active:scale-[0.98]"
              >
                <IconExternal className="h-4 w-4" />
                Open in Drive
              </a>
            )}
            <button
              onClick={() => onDownload(item.id)}
              className="flex items-center justify-center gap-2 rounded-md border border-line2 py-2.5 text-sm font-semibold text-mut transition-all hover:border-brand/60 hover:text-ink active:scale-[0.98]"
            >
              <IconDownload className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold text-dim transition-all hover:text-rec"
            >
              <IconTrash className="h-3.5 w-3.5" />
              Remove from session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

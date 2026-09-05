import type { DriveRecord, MediaItem, UploadStatus } from "../types";
import { formatBytes, formatDateTime } from "../lib/helpers";
import { useReveal } from "../hooks/useReveal";
import {
  IconCamera,
  IconCloud,
  IconDownload,
  IconDrive,
  IconExternal,
  IconEye,
  IconTrash,
  IconUpload,
  IconVideo,
} from "./icons";

interface LibraryProps {
  items: MediaItem[];
  records: DriveRecord[];
  tab: "session" | "drive";
  onTab: (t: "session" | "drive") => void;
  onUpload: (id: string) => void;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onPreview: (id: string) => void;
  onRemoveRecord: (r: DriveRecord) => void;
  onClearRecords: () => void;
  onClearSession: () => void;
}

const STATUS_CHIP: Record<UploadStatus, { label: string; cls: string }> = {
  local: { label: "Local", cls: "border-info/40 bg-info/10 text-info" },
  uploading: { label: "Syncing", cls: "border-brand/40 bg-brand/10 text-brand" },
  uploaded: { label: "In Drive", cls: "border-ok/40 bg-ok/10 text-ok" },
  error: { label: "Failed", cls: "border-rec/40 bg-rec/10 text-rec" },
  oversize: { label: "Over 25 MB", cls: "border-rec/40 bg-rec/10 text-rec" },
};

function ActionBtn({
  onClick,
  title,
  danger,
  children,
  disabled,
}: {
  onClick?: () => void;
  title: string;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`flex h-7 flex-1 items-center justify-center rounded text-[9px] font-mono font-semibold tracking-wider uppercase transition-colors disabled:pointer-events-none disabled:opacity-30 ${
        danger ? "text-mut hover:bg-rec/10 hover:text-rec" : "text-mut hover:bg-bg3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function Library({
  items,
  records,
  tab,
  onTab,
  onUpload,
  onDelete,
  onDownload,
  onPreview,
  onRemoveRecord,
  onClearRecords,
  onClearSession,
}: LibraryProps) {
  const { ref, seen } = useReveal<HTMLElement>();
  const inDrive = items.filter((i) => i.status === "uploaded").length;

  return (
    <section
      ref={ref}
      className={`transition-all duration-700 ease-out ${seen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
    >
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.28em] text-brand uppercase">
            Library
          </p>
          <h2 className="font-display mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Session library
          </h2>
          <p className="mt-1 text-sm text-mut">
            {items.length} item{items.length === 1 ? "" : "s"} captured · {inDrive} already in Drive
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-line bg-bg2 p-1">
            <button
              onClick={() => onTab("session")}
              className={`rounded px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider uppercase transition-all ${
                tab === "session" ? "bg-bg3 text-brand ring-1 ring-brand/40" : "text-mut hover:text-ink"
              }`}
            >
              Session · {items.length}
            </button>
            <button
              onClick={() => onTab("drive")}
              className={`rounded px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider uppercase transition-all ${
                tab === "drive" ? "bg-bg3 text-ok ring-1 ring-ok/40" : "text-mut hover:text-ink"
              }`}
            >
              Drive · {records.length}
            </button>
          </div>
          {tab === "session" ? (
            <button
              onClick={onClearSession}
              disabled={items.length === 0}
              className="rounded-md border border-line px-3 py-2 font-mono text-[10px] font-semibold tracking-wider text-mut uppercase transition-all hover:border-rec/60 hover:text-rec active:scale-95 disabled:pointer-events-none disabled:opacity-35"
            >
              Clear
            </button>
          ) : (
            <button
              onClick={onClearRecords}
              disabled={records.length === 0}
              className="rounded-md border border-line px-3 py-2 font-mono text-[10px] font-semibold tracking-wider text-mut uppercase transition-all hover:border-rec/60 hover:text-rec active:scale-95 disabled:pointer-events-none disabled:opacity-35"
            >
              Clear history
            </button>
          )}
        </div>
      </div>

      {/* session tab */}
      {tab === "session" &&
        (items.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-line2 bg-bg1/50 px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-bg2">
              <IconCamera className="h-6 w-6 text-dim" />
            </span>
            <h3 className="font-display mt-4 text-lg font-bold text-ink">Nothing captured yet</h3>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-mut">
              Snap a photo, record a clip, or import files — everything you keep syncs straight to
              Google Drive.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item, idx) => {
              const chip = STATUS_CHIP[item.status];
              const uploaded = item.status === "uploaded";
              const isVideo = item.mime.startsWith("video/");
              return (
                <article
                  key={item.id}
                  className="animate-rise group relative overflow-hidden rounded-md border border-line bg-bg1 transition-all duration-200 hover:-translate-y-0.5 hover:border-line2 hover:shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
                  style={{ animationDelay: `${Math.min(idx, 8) * 45}ms` }}
                >
                  {/* media */}
                  <div className="relative aspect-video overflow-hidden bg-black">
                    {uploaded ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-bg2">
                        <IconCloud className="h-7 w-7 text-ok/80" />
                        <span className="font-mono text-[9px] tracking-[0.2em] text-ok/80 uppercase">
                          Stored in Drive
                        </span>
                      </div>
                    ) : isVideo ? (
                      <>
                        <video
                          src={item.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-ink">
                          <IconVideo className="h-4 w-4" />
                        </span>
                      </>
                    ) : (
                      <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                    )}

                    <span className="absolute top-2 left-2 rounded-sm bg-black/65 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-ink uppercase">
                      {item.kind}
                    </span>
                    <span className="absolute top-2 right-2 rounded-sm bg-black/65 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-ink/85 uppercase">
                      {formatBytes(item.size)}
                    </span>

                    {(item.status === "error" || item.status === "oversize") && !uploaded && (
                      <span className="absolute bottom-2 left-2 rounded-sm bg-rec px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-white uppercase">
                        {item.status === "oversize" ? "Over 25 MB" : "Upload failed"}
                      </span>
                    )}

                    {item.status === "uploading" && (
                      <div className="absolute right-0 bottom-0 left-0 h-1 bg-black/50">
                        <div
                          className="h-full bg-brand transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* meta */}
                  <div className="p-3">
                    <p className="truncate font-mono text-[11px] text-ink" title={item.name}>
                      {item.name}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span
                        className={`rounded-sm border px-1.5 py-px font-mono text-[9px] font-semibold tracking-wider uppercase ${chip.cls}`}
                      >
                        {chip.label}
                      </span>
                      <span className="font-mono text-[10px] text-dim tabular-nums">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {item.note && (item.status === "error" || item.status === "oversize") && (
                      <p className="mt-1.5 text-[11px] leading-snug text-rec/90">{item.note}</p>
                    )}

                    {/* actions */}
                    <div className="mt-2.5 flex items-center gap-1 border-t border-line pt-2">
                      {!uploaded && item.url && (
                        <ActionBtn title="Preview" onClick={() => onPreview(item.id)}>
                          <IconEye className="h-3.5 w-3.5" />
                        </ActionBtn>
                      )}
                      {item.blob && (item.status === "local" || item.status === "error") && (
                        <ActionBtn title="Upload to Drive" onClick={() => onUpload(item.id)}>
                          <IconUpload className="h-3.5 w-3.5" />
                        </ActionBtn>
                      )}
                      {item.status === "uploading" && (
                        <ActionBtn title="Uploading…" disabled>
                          <span className="font-mono text-[9px] text-brand tabular-nums">
                            {item.progress}%
                          </span>
                        </ActionBtn>
                      )}
                      {!uploaded && item.url && (
                        <ActionBtn title="Download" onClick={() => onDownload(item.id)}>
                          <IconDownload className="h-3.5 w-3.5" />
                        </ActionBtn>
                      )}
                      {uploaded && item.drive?.url && (
                        <a
                          href={item.drive.url}
                          target="_blank"
                          rel="noreferrer"
                          title="Open in Drive"
                          className="flex h-7 flex-1 items-center justify-center rounded font-mono text-[9px] font-semibold tracking-wider text-ok uppercase transition-colors hover:bg-bg3"
                        >
                          <IconExternal className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <ActionBtn title="Remove" danger onClick={() => onDelete(item.id)}>
                        <IconTrash className="h-3.5 w-3.5" />
                      </ActionBtn>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ))}

      {/* drive history tab */}
      {tab === "drive" &&
        (records.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-line2 bg-bg1/50 px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-bg2">
              <IconDrive className="h-6 w-6 text-dim" />
            </span>
            <h3 className="font-display mt-4 text-lg font-bold text-ink">No Drive uploads yet</h3>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-mut">
              Every successful sync from this browser is logged here — metadata only, no files are
              kept locally.
            </p>
          </div>
        ) : (
          <ul className="animate-rise mt-4 divide-y divide-line overflow-hidden rounded-md border border-line bg-bg1">
            {records.map((r) => (
              <li key={`${r.uploadedAt}-${r.name}`} className="flex items-center gap-3 px-4 py-3">
                <IconDrive className="h-4 w-4 shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-ink" title={r.name}>
                    {r.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-dim">
                    {formatBytes(r.size)} · {formatDateTime(r.uploadedAt)}
                  </p>
                </div>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    title="Open in Drive"
                    className="flex h-7 w-7 items-center justify-center rounded text-mut transition-colors hover:bg-bg3 hover:text-ok"
                  >
                    <IconExternal className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => onRemoveRecord(r)}
                  title="Remove from history"
                  className="flex h-7 w-7 items-center justify-center rounded text-mut transition-colors hover:bg-rec/10 hover:text-rec"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}

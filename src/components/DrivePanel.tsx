import type { BackendState } from "../types";
import { APPS_SCRIPT_URL } from "../config";
import { formatBytes } from "../lib/helpers";
import { IconDrive, IconUpload, IconZap } from "./icons";

interface DrivePanelProps {
  backendState: BackendState;
  onTest: () => void;
  localCount: number;
  batch: { done: number; total: number } | null;
  onUploadAll: () => void;
  sessionCount: number;
  sessionBytes: number;
}

const STATE_META: Record<BackendState, { dot: string; label: string; text: string }> = {
  untested: { dot: "bg-dim", label: "Not tested", text: "text-dim" },
  testing: { dot: "bg-brand animate-blink", label: "Testing…", text: "text-brand" },
  ok: { dot: "bg-ok", label: "Reachable", text: "text-ok" },
  fail: { dot: "bg-rec", label: "Unreachable", text: "text-rec" },
};

export function DrivePanel({
  backendState,
  onTest,
  localCount,
  batch,
  onUploadAll,
  sessionCount,
  sessionBytes,
}: DrivePanelProps) {
  const meta = STATE_META[backendState];
  const endpoint = APPS_SCRIPT_URL.replace("https://", "");
  const short = endpoint.length > 34 ? `${endpoint.slice(0, 30)}…` : endpoint;

  return (
    <section className="rounded-lg border border-line bg-bg1 p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold tracking-[0.28em] text-brand uppercase">
          Drive sync
        </p>
        <IconDrive className="h-4 w-4 text-dim" />
      </div>

      {/* endpoint + reachability */}
      <div className="mt-4 flex items-center gap-2.5 rounded-md border border-line bg-bg2 px-3 py-2.5">
        <IconDrive className="h-4 w-4 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[10px] text-mut" title={endpoint}>
            {short}
          </p>
          <p className={`mt-0.5 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] uppercase ${meta.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </p>
        </div>
        <button
          onClick={onTest}
          disabled={backendState === "testing"}
          className="flex shrink-0 items-center gap-1 rounded border border-line2 px-2 py-1 font-mono text-[10px] font-semibold tracking-wider text-mut transition-all hover:border-brand hover:text-brand active:scale-95 disabled:opacity-50"
        >
          <IconZap className="h-3 w-3" />
          PING
        </button>
      </div>

      {/* session stats */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-line bg-bg2 px-3 py-2.5">
          <p className="font-display text-xl font-extrabold text-ink tabular-nums">{sessionCount}</p>
          <p className="mt-0.5 font-mono text-[9px] tracking-[0.18em] text-dim uppercase">Files synced</p>
        </div>
        <div className="rounded-md border border-line bg-bg2 px-3 py-2.5">
          <p className="font-display text-xl font-extrabold text-ink tabular-nums">{formatBytes(sessionBytes)}</p>
          <p className="mt-0.5 font-mono text-[9px] tracking-[0.18em] text-dim uppercase">Data to Drive</p>
        </div>
      </div>

      {/* upload all */}
      <button
        onClick={onUploadAll}
        disabled={localCount === 0 || batch !== null}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-sm font-bold text-bg0 transition-all hover:bg-brandsoft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <IconUpload className="h-4 w-4" />
        {batch ? `Uploading ${batch.done}/${batch.total}…` : `Upload all (${localCount})`}
      </button>
      {batch && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg3">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${batch.total ? (batch.done / batch.total) * 100 : 0}%` }}
          />
        </div>
      )}

      <p className="mt-3.5 font-mono text-[9px] leading-relaxed tracking-[0.1em] text-dim uppercase">
        Files stream to Drive via Apps Script · secrets stay in Script Properties · local copies are
        cleared after upload
      </p>
    </section>
  );
}

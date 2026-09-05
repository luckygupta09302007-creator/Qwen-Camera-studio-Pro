import type { Toast } from "../types";
import { IconAlert, IconCheck, IconX, IconZap } from "./icons";

const STYLES: Record<Toast["kind"], { border: string; icon: string }> = {
  success: { border: "border-l-ok", icon: "text-ok" },
  error: { border: "border-l-rec", icon: "text-rec" },
  info: { border: "border-l-info", icon: "text-info" },
};

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => {
        const s = STYLES[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2.5 rounded-md border border-line ${s.border} animate-toastin border-l-[3px] bg-bg2 px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)]`}
          >
            <span className={`mt-0.5 shrink-0 ${s.icon}`}>
              {t.kind === "success" ? (
                <IconCheck className="h-4 w-4" />
              ) : t.kind === "error" ? (
                <IconAlert className="h-4 w-4" />
              ) : (
                <IconZap className="h-4 w-4" />
              )}
            </span>
            <p className="flex-1 text-[13px] leading-snug text-ink">{t.message}</p>
            <button
              onClick={() => onDismiss(t.id)}
              className="shrink-0 rounded p-0.5 text-dim transition hover:text-ink"
              aria-label="Dismiss notification"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

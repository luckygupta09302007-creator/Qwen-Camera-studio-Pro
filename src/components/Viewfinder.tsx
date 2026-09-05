import { useEffect, useState } from "react";
import type { CameraStatus, CaptureMode, Facing, MediaKind } from "../types";
import { FRAME_RATIOS } from "../config";
import { formatTimecode } from "../lib/helpers";
import {
  IconAlert,
  IconAperture,
  IconCompress,
  IconExpand,
  IconFilm,
  IconFlip,
} from "./icons";

type RatioId = (typeof FRAME_RATIOS)[number]["id"];

interface ViewfinderProps {
  wrapRef: React.RefObject<HTMLDivElement | null>;
  boxRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  errorName: string;
  facing: Facing;
  mode: CaptureMode;
  ratio: RatioId;
  recording: boolean;
  elapsed: number;
  resLabel: string;
  mirrored: boolean;
  grid: boolean;
  countdown: number | null;
  flashKey: number;
  fs: boolean;
  lastShot: { id: string; url: string; kind: MediaKind } | null;
  onRetry: () => void;
  onOpenLast: () => void;
  onToggleFs: () => void;
  onCycleRatio: () => void;
  onShutter: () => void;
  onFlip: () => void;
}

interface FocusPoint {
  x: number;
  y: number;
  k: number;
}

const ERROR_COPY: Record<string, { title: string; body: string }> = {
  NotAllowedError: {
    title: "Permission denied",
    body: "Camera access was blocked. Allow it in your browser's site settings, then retry.",
  },
  NotFoundError: {
    title: "No camera found",
    body: "No usable camera was detected on this device.",
  },
  NotReadableError: {
    title: "Camera is busy",
    body: "Another application is holding the camera. Close it and retry.",
  },
  OverconstrainedError: {
    title: "Camera unavailable",
    body: "The requested camera mode is not supported by this device.",
  },
  UnsupportedError: {
    title: "Not supported",
    body: "This browser does not support live camera capture.",
  },
};

export function Viewfinder(props: ViewfinderProps) {
  const {
    wrapRef,
    boxRef,
    videoRef,
    status,
    errorName,
    facing,
    mode,
    ratio,
    recording,
    elapsed,
    resLabel,
    mirrored,
    grid,
    countdown,
    flashKey,
    fs,
    lastShot,
    onRetry,
    onOpenLast,
    onToggleFs,
    onCycleRatio,
    onShutter,
    onFlip,
  } = props;

  const [focus, setFocus] = useState<FocusPoint | null>(null);

  useEffect(() => {
    if (!focus) return;
    const t = window.setTimeout(() => setFocus(null), 950);
    return () => window.clearTimeout(t);
  }, [focus]);

  const live = status === "live";
  const err = ERROR_COPY[errorName] ?? {
    title: "Camera offline",
    body: "The sensor could not be started. Check permissions and retry.",
  };
  const ratioLabel = FRAME_RATIOS.find((r) => r.id === ratio)?.label ?? ratio;

  const boxSize =
    ratio === "full"
      ? "h-full w-full"
      : ratio === "1:1"
        ? "w-full aspect-square lg:w-auto lg:h-full"
        : ratio === "16:9"
          ? "w-full aspect-video lg:w-auto lg:h-full"
          : "w-full aspect-[4/3] lg:w-auto lg:h-full";

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!live || countdown !== null || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    setFocus({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
      k: Date.now(),
    });
  };

  return (
    /* full-height stage — the viewfinder owns the screen like a real camera app */
    <div
      ref={wrapRef}
      className="relative flex h-[56vh] min-h-[400px] w-full items-center justify-center lg:h-[calc(100dvh-14rem)]"
    >
      <div
        ref={boxRef}
        onPointerDown={handlePointer}
        className={`group/vf relative overflow-hidden rounded-lg border bg-black shadow-[0_24px_70px_rgba(0,0,0,0.5)] transition-colors ${boxSize} ${
          recording ? "border-rec/70" : "border-line"
        } ${live ? "cursor-crosshair" : ""} ${fs ? "rounded-none border-transparent" : ""}`}
      >
        {/* sensor feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`h-full w-full object-cover transition-opacity duration-500 ${live ? "opacity-100" : "opacity-0"}`}
          style={{ transform: mirrored ? "scaleX(-1)" : "none" }}
        />

        {/* ambient vignette over the feed */}
        {live && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgba(0,0,0,0.42)_100%)]" />
        )}

        {/* scanning line — a little sensor life */}
        {live && !recording && (
          <div className="animate-scan pointer-events-none absolute right-0 left-0 h-10 bg-gradient-to-b from-transparent via-brand/8 to-transparent" />
        )}

        {/* rule-of-thirds grid */}
        {live && grid && (
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute top-0 bottom-0 left-1/3 w-px bg-ink/25" />
            <div className="absolute top-0 bottom-0 left-2/3 w-px bg-ink/25" />
            <div className="absolute left-0 right-0 top-1/3 h-px bg-ink/25" />
            <div className="absolute left-0 right-0 top-2/3 h-px bg-ink/25" />
          </div>
        )}

        {/* AF corner brackets */}
        {live && !fs && (
          <>
            <span className="pointer-events-none absolute top-3 left-3 h-6 w-6 rounded-tl border-t-2 border-l-2 border-brand/80 transition-all group-hover/vf:h-7 group-hover/vf:w-7" />
            <span className="pointer-events-none absolute top-3 right-3 h-6 w-6 rounded-tr border-t-2 border-r-2 border-brand/80 transition-all group-hover/vf:h-7 group-hover/vf:w-7" />
            <span className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 rounded-bl border-b-2 border-l-2 border-brand/80 transition-all group-hover/vf:h-7 group-hover/vf:w-7" />
            <span className="pointer-events-none absolute right-3 bottom-3 h-6 w-6 rounded-br border-r-2 border-b-2 border-brand/80 transition-all group-hover/vf:h-7 group-hover/vf:w-7" />
          </>
        )}

        {/* tap-to-focus reticle */}
        {focus && (
          <div
            key={focus.k}
            className="animate-af pointer-events-none absolute z-10 h-16 w-16 rounded-sm border-2 border-brand"
            style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
          >
            <span className="absolute top-1/2 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand" />
          </div>
        )}

        {/* HUD — top left: mode · REC · ratio cycler */}
        {live && (
          <div className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-2 sm:left-4 sm:translate-x-0 sm:justify-start">
            <span className="rounded-sm bg-black/60 px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.18em] text-ink/90 uppercase">
              {mode === "photo" ? "Photo" : "Video"}
            </span>
            {recording && (
              <span className="flex items-center gap-1.5 rounded-sm bg-rec/90 px-2 py-1 font-mono text-[10px] font-bold tracking-[0.18em] text-white uppercase">
                <span className="animate-blink h-1.5 w-1.5 rounded-full bg-white" />
                REC {formatTimecode(elapsed)}
              </span>
            )}
            <button
              onClick={onCycleRatio}
              title="Cycle frame ratio"
              className="rounded-sm bg-black/60 px-2 py-1 font-mono text-[10px] font-bold tracking-[0.18em] text-brand uppercase transition-all hover:bg-brand hover:text-bg0 active:scale-90"
            >
              {ratioLabel}
            </button>
          </div>
        )}

        {/* HUD — top right */}
        {live && (
          <>
            <div className="absolute top-3 right-12 hidden items-center gap-2 sm:flex">
              {mirrored && (
                <span className="rounded-sm bg-black/60 px-2 py-1 font-mono text-[10px] tracking-[0.18em] text-info uppercase">
                  MIR
                </span>
              )}
              <span className="rounded-sm bg-black/60 px-2 py-1 font-mono text-[10px] tracking-[0.18em] text-ink/80 uppercase">
                {facing === "user" ? "Front" : "Rear"}
              </span>
              <span className="rounded-sm bg-black/60 px-2 py-1 font-mono text-[10px] tracking-[0.18em] text-brand uppercase">
                {resLabel}
              </span>
            </div>
            <button
              onClick={onToggleFs}
              title={fs ? "Exit full mode" : "Full mode"}
              className="absolute top-3 right-3 rounded-sm bg-black/60 p-1.5 text-ink/85 transition-all hover:bg-brand hover:text-bg0 active:scale-90"
            >
              {fs ? <IconCompress className="h-4 w-4" /> : <IconExpand className="h-4 w-4" />}
            </button>
          </>
        )}

        {/* HUD — bottom hint */}
        {live && !fs && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 sm:left-4 sm:translate-x-0">
            <span className="rounded-sm bg-black/50 px-2 py-1 font-mono text-[9px] tracking-[0.22em] text-ink/55 uppercase">
              {focus ? "AF lock" : "Tap to focus"}
            </span>
          </div>
        )}

        {/* last capture pop */}
        {lastShot && live && !fs && (
          <button
            onClick={onOpenLast}
            key={lastShot.id}
            title="Open last capture"
            className="animate-pop absolute right-3 bottom-3 block aspect-video w-24 overflow-hidden rounded-md border-2 border-brand/80 bg-bg2 shadow-lg transition-transform hover:scale-105"
          >
            {lastShot.kind === "video" ? (
              <span className="flex h-full w-full items-center justify-center bg-bg3">
                <IconFilm className="h-6 w-6 text-brand" />
              </span>
            ) : (
              <img src={lastShot.url} alt="Last capture" className="h-full w-full object-cover" />
            )}
          </button>
        )}

        {/* full-mode control bar (deck is offscreen in fullscreen) */}
        {fs && live && (
          <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-8 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-6 pt-16 pb-7">
            <button
              onClick={onFlip}
              title="Flip camera"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/30 bg-black/40 text-ink transition-all hover:scale-105 hover:border-brand hover:text-brand active:scale-90"
            >
              <IconFlip className="h-5 w-5" />
            </button>
            <button
              onClick={onShutter}
              aria-label={mode === "photo" ? "Capture photo" : recording ? "Stop recording" : "Start recording"}
              className={`group relative flex h-[76px] w-[76px] items-center justify-center rounded-full transition-all ${
                mode === "photo"
                  ? "border-4 border-ink/90"
                  : recording
                    ? "animate-recpulse border-4 border-rec"
                    : "border-4 border-rec/90"
              }`}
            >
              {mode === "photo" ? (
                <span className="h-14 w-14 rounded-full bg-ink transition-transform group-active:scale-75" />
              ) : recording ? (
                <span className="h-7 w-7 rounded-md bg-rec transition-transform group-active:scale-75" />
              ) : (
                <span className="h-14 w-14 rounded-full bg-rec transition-transform group-active:scale-75" />
              )}
            </button>
            <button
              onClick={onCycleRatio}
              title="Cycle frame ratio"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/30 bg-black/40 font-mono text-[10px] font-bold tracking-wider text-brand uppercase transition-all hover:scale-105 hover:border-brand active:scale-90"
            >
              {ratioLabel}
            </button>
          </div>
        )}

        {/* shutter flash */}
        {flashKey > 0 && (
          <div key={flashKey} className="animate-flash pointer-events-none absolute inset-0 z-20 bg-white" />
        )}

        {/* countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55">
            <span
              key={countdown}
              className="animate-countpop font-display text-[7rem] font-extrabold text-brand drop-shadow-[0_0_38px_rgba(245,165,36,0.45)]"
            >
              {countdown}
            </span>
          </div>
        )}

        {/* booting state */}
        {(status === "idle" || status === "starting") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-lg bg-bg1">
            <IconAperture className="animate-spin-slow h-14 w-14 text-brand" />
            <div className="text-center">
              <p className="font-display text-lg font-bold tracking-tight text-ink">Initializing sensor</p>
              <p className="mt-1 font-mono text-[11px] tracking-[0.2em] text-dim uppercase">
                Requesting camera access…
              </p>
            </div>
            <div
              className="animate-shimmer h-1 w-44 rounded-full bg-bg3"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, transparent, rgba(245,165,36,0.55), transparent)",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
        )}

        {/* error state */}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-bg1 p-6">
            <div className="w-full max-w-sm rounded-lg border border-line bg-bg2 p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-rec/40 bg-rec/10">
                <IconAlert className="h-6 w-6 text-rec" />
              </span>
              <h3 className="font-display mt-4 text-xl font-bold text-ink">{err.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-mut">{err.body}</p>
              <button
                onClick={onRetry}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-bg0 transition hover:bg-brandsoft active:scale-95"
              >
                <IconFlip className="h-4 w-4" />
                Retry camera
              </button>
              <p className="mt-3 font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
                Import from the control deck still works
              </p>
            </div>
          </div>
        )}

        {/* recording frame glow */}
        {recording && (
          <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-rec/60 ring-inset" />
        )}
      </div>
    </div>
  );
}

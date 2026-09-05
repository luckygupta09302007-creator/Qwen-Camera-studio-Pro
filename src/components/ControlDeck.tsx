import { useRef } from "react";
import type { Settings } from "../types";
import { COUNTDOWN_OPTIONS, FILE_PICKER_ACCEPT, FRAME_RATIOS, PHOTO_FORMATS, VIDEO_CODECS } from "../config";
import { formatTimecode } from "../lib/helpers";
import { IconCamera, IconFlip, IconTimer, IconUpload, IconVideo } from "./icons";

interface ControlDeckProps {
  settings: Settings;
  onPatch: (p: Partial<Settings>) => void;
  cameraLive: boolean;
  facing: "user" | "environment";
  canVideo: boolean;
  codec: { webm: boolean; mp4: boolean };
  recording: boolean;
  elapsed: number;
  onShutter: () => void;
  onFlip: () => void;
  onImport: (files: FileList) => void;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line2 bg-bg3 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-mut">
      {children}
    </kbd>
  );
}

export function ControlDeck({
  settings,
  onPatch,
  cameraLive,
  facing,
  canVideo,
  codec,
  recording,
  elapsed,
  onShutter,
  onFlip,
  onImport,
}: ControlDeckProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const mode = settings.mode;

  const cycleCountdown = () => {
    const idx = COUNTDOWN_OPTIONS.indexOf(settings.countdown as (typeof COUNTDOWN_OPTIONS)[number]);
    const next = COUNTDOWN_OPTIONS[(idx + 1) % COUNTDOWN_OPTIONS.length];
    onPatch({ countdown: next });
  };

  return (
    <section className="rounded-lg border border-line bg-bg1 p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold tracking-[0.28em] text-brand uppercase">
          Control deck
        </p>
        <span
          className={`flex items-center gap-1.5 font-mono text-[9px] tracking-[0.2em] uppercase ${
            cameraLive ? "text-ok" : "text-dim"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${cameraLive ? "bg-ok" : "bg-dim"}`} />
          {cameraLive ? "Armed" : "Standby"}
        </span>
      </div>

      {/* mode switch */}
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-md border border-line bg-bg2 p-1">
        <button
          onClick={() => onPatch({ mode: "photo" })}
          className={`flex items-center justify-center gap-2 rounded py-2 text-[11px] font-bold tracking-[0.18em] uppercase transition-all ${
            mode === "photo" ? "bg-brand text-bg0 shadow" : "text-mut hover:text-ink"
          }`}
        >
          <IconCamera className="h-3.5 w-3.5" />
          Photo
        </button>
        <button
          onClick={() => canVideo && onPatch({ mode: "video" })}
          disabled={!canVideo}
          title={canVideo ? "Switch to video" : "MediaRecorder is not supported in this browser"}
          className={`flex items-center justify-center gap-2 rounded py-2 text-[11px] font-bold tracking-[0.18em] uppercase transition-all disabled:cursor-not-allowed disabled:opacity-35 ${
            mode === "video" ? "bg-rec text-white shadow" : "text-mut hover:text-ink"
          }`}
        >
          <IconVideo className="h-3.5 w-3.5" />
          Video
        </button>
      </div>

      {/* shutter row */}
      <div className="mt-5 grid grid-cols-3 items-center">
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={cycleCountdown}
            title="Self-timer"
            className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all hover:scale-105 active:scale-95 ${
              settings.countdown > 0
                ? "border-brand/70 bg-brand/10 text-brand"
                : "border-line2 bg-bg2 text-mut hover:text-ink"
            }`}
          >
            <IconTimer className="h-4.5 w-4.5" />
          </button>
          <span className="font-mono text-[9px] tracking-[0.2em] text-dim uppercase">
            {settings.countdown > 0 ? `${settings.countdown}s` : "Timer off"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={onShutter}
            disabled={!cameraLive}
            aria-label={mode === "photo" ? "Capture photo" : recording ? "Stop recording" : "Start recording"}
            className={`group relative flex h-20 w-20 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-35 ${
              mode === "photo"
                ? "border-4 border-ink/85 hover:border-ink"
                : recording
                  ? "animate-recpulse border-4 border-rec"
                  : "border-4 border-rec/85 hover:border-rec"
            }`}
          >
            {mode === "photo" ? (
              <span className="h-14 w-14 rounded-full bg-ink transition-transform duration-150 group-hover:scale-105 group-active:scale-75" />
            ) : recording ? (
              <span className="h-7 w-7 rounded-md bg-rec transition-transform group-active:scale-75" />
            ) : (
              <span className="h-14 w-14 rounded-full bg-rec transition-transform duration-150 group-hover:scale-105 group-active:scale-75" />
            )}
          </button>
          <span className="font-mono text-[9px] tracking-[0.2em] text-dim uppercase tabular-nums">
            {recording ? `Stop · ${formatTimecode(elapsed)}` : mode === "photo" ? "Capture" : "Record"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={onFlip}
            title="Flip front / rear camera"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line2 bg-bg2 text-mut transition-all hover:scale-105 hover:border-brand/60 hover:text-brand active:scale-95"
          >
            <IconFlip
              className="h-4.5 w-4.5 transition-transform duration-300"
              // visual hint of which way the lens faces
            />
          </button>
          <span className="font-mono text-[9px] tracking-[0.2em] text-dim uppercase">
            {facing === "user" ? "Front" : "Rear"}
          </span>
        </div>
      </div>

      {/* format / codec */}
      <div className="mt-5">
        <p className="font-mono text-[9px] tracking-[0.22em] text-dim uppercase">
          {mode === "photo" ? "Photo format" : "Video codec"}
        </p>
        <div className="mt-1.5 flex gap-1.5">
          {mode === "photo"
            ? PHOTO_FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onPatch({ photoFormat: f.id })}
                  className={`rounded border px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wider transition-all active:scale-95 ${
                    settings.photoFormat === f.id
                      ? "border-brand bg-brand text-bg0"
                      : "border-line2 text-mut hover:border-brand/60 hover:text-ink"
                  }`}
                >
                  {f.label}
                </button>
              ))
            : VIDEO_CODECS.map((c) => {
                const unsupported = (c.id === "webm" && !codec.webm) || (c.id === "mp4" && !codec.mp4);
                return (
                  <button
                    key={c.id}
                    onClick={() => !unsupported && onPatch({ codec: c.id })}
                    disabled={unsupported}
                    title={unsupported ? "Not supported by this browser" : `Prefer ${c.label}`}
                    className={`rounded border px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wider transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 ${
                      settings.codec === c.id
                        ? "border-rec bg-rec text-white"
                        : "border-line2 text-mut hover:border-rec/60 hover:text-ink"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
        </div>
      </div>

      {/* frame ratio */}
      <div className="mt-4">
        <p className="font-mono text-[9px] tracking-[0.22em] text-dim uppercase">Frame ratio</p>
        <div className="mt-1.5 flex gap-1.5">
          {FRAME_RATIOS.map((r) => (
            <button
              key={r.id}
              onClick={() => onPatch({ ratio: r.id })}
              title={`Set ${r.label} frame`}
              className={`flex-1 rounded border px-2 py-1.5 font-mono text-[11px] font-semibold tracking-wider transition-all active:scale-95 ${
                settings.ratio === r.id
                  ? "border-brand bg-brand text-bg0"
                  : "border-line2 text-mut hover:border-brand/60 hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* import */}
      <label className="group mt-4 block cursor-pointer rounded-md border border-dashed border-line2 bg-bg2/60 px-4 py-3.5 text-center transition-all hover:border-brand/70 hover:bg-bg2">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={FILE_PICKER_ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onImport(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="flex items-center justify-center gap-2 text-sm font-semibold text-ink">
          <IconUpload className="h-4 w-4 text-brand transition-transform group-hover:-translate-y-0.5" />
          Import media
        </span>
        <span className="mt-1 block font-mono text-[9px] tracking-[0.16em] text-dim uppercase">
          JPG · PNG · WEBP · MP4 · MOV · WEBM — max 25 MB
        </span>
      </label>

      {/* shortcuts */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3.5 font-mono text-[10px] text-dim">
        <span className="flex items-center gap-1.5">
          <Kbd>Space</Kbd> capture
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>F</Kbd> flip
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>M</Kbd> mode
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>G</Kbd> grid
        </span>
      </div>
    </section>
  );
}

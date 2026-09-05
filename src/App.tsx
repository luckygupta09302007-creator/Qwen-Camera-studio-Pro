import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Viewfinder } from "./components/Viewfinder";
import { ControlDeck } from "./components/ControlDeck";
import { SettingsPanel } from "./components/SettingsPanel";
import { DrivePanel } from "./components/DrivePanel";
import { Library } from "./components/Library";
import { Lightbox } from "./components/Lightbox";
import { Toasts } from "./components/Toasts";
import { IconAperture } from "./components/icons";
import { useCamera } from "./hooks/useCamera";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { pingBackend, uploadToDrive } from "./lib/upload";
import {
  captureName,
  codecSupport,
  extFromMime,
  formatBytes,
  formatClock,
  isAllowedFile,
  mimeFromExt,
  pickVideoMime,
  uid,
} from "./lib/helpers";
import {
  FRAME_RATIOS,
  MAX_FILE_SIZE_BYTES,
  PHOTO_FORMATS,
  RESOLUTIONS,
  STORAGE_KEYS,
  VIDEO_BITRATE,
} from "./config";
import {
  DEFAULT_SETTINGS,
  type BackendState,
  type DriveRecord,
  type MediaItem,
  type MediaKind,
  type Settings,
  type Toast,
} from "./types";

export default function App() {
  // ── persistent state ──────────────────────────────────────────────────────
  const [settings, setSettings] = useLocalStorage<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  const [records, setRecords] = useLocalStorage<DriveRecord[]>(STORAGE_KEYS.driveHistory, []);

  // ── session state ─────────────────────────────────────────────────────────
  const [items, setItems] = useState<MediaItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [backendState, setBackendState] = useState<BackendState>("untested");
  const [sessionSync, setSessionSync] = useState({ count: 0, bytes: 0 });
  const [libTab, setLibTab] = useState<"session" | "drive">("session");
  const [clock, setClock] = useState(() => formatClock(new Date()));

  // ── refs ──────────────────────────────────────────────────────────────────
  const itemsRef = useRef<MediaItem[]>(items);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedIvRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const countingRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const camera = useCamera({ resolutionId: settings.resolution });
  const canVideo = typeof MediaRecorder !== "undefined";
  const codec = useMemo(() => codecSupport(), []);

  // ── toasts ────────────────────────────────────────────────────────────────
  const notify = useCallback((kind: Toast["kind"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  // ── clock ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const iv = window.setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => window.clearInterval(iv);
  }, []);

  // guard against a persisted "video" mode in browsers without MediaRecorder
  useEffect(() => {
    if (!canVideo && settings.mode === "video") setSettings((s) => ({ ...s, mode: "photo" }));
  }, [canVideo, settings.mode, setSettings]);

  // warn before leaving mid-upload
  const uploadingNow = batch !== null || items.some((i) => i.status === "uploading");
  useEffect(() => {
    if (!uploadingNow) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [uploadingNow]);

  // ── media helpers ─────────────────────────────────────────────────────────
  const addMedia = useCallback(
    (kind: MediaKind, blob: Blob, mime: string, name: string) => {
      const oversize = blob.size > MAX_FILE_SIZE_BYTES;
      const item: MediaItem = {
        id: uid(),
        kind,
        name,
        mime: mime || "application/octet-stream",
        size: blob.size,
        blob,
        url: URL.createObjectURL(blob),
        createdAt: Date.now(),
        status: oversize ? "oversize" : "local",
        progress: 0,
        note: oversize
          ? "Exceeds the 25 MB Drive limit — download it, shrink it, then re-import."
          : undefined,
      };
      setItems((p) => [item, ...p]);
      if (oversize) notify("error", `${name} is over the 25 MB Drive limit.`);
    },
    [notify]
  );

  const capturePhoto = useCallback(() => {
    const video = camera.videoRef.current;
    if (!video || !video.videoWidth) {
      notify("error", "The camera is not ready yet.");
      return;
    }
    const fmt = PHOTO_FORMATS.find((f) => f.id === settings.photoFormat) ?? PHOTO_FORMATS[0];
    const mirror = settings.mirrorFront && camera.facing === "user";
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Match the capture to the viewfinder frame: cover-crop to the selected
    // ratio, exactly like a real camera app saves what it shows.
    let target =
      settings.ratio === "4:3"
        ? 4 / 3
        : settings.ratio === "16:9"
          ? 16 / 9
          : settings.ratio === "1:1"
            ? 1
            : 0;
    if (target === 0) {
      const el = vfBoxRef.current;
      target =
        el && el.clientWidth > 0 && el.clientHeight > 0 ? el.clientWidth / el.clientHeight : vw / vh;
    }
    let cw = vw;
    let ch = vh;
    if (vw / vh > target) cw = vh * target;
    else ch = vw / target;
    const sx = (vw - cw) / 2;
    const sy = (vh - ch) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cw);
    canvas.height = Math.round(ch);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      notify("error", "Capture failed — canvas is unavailable.");
      return;
    }
    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          notify("error", "Capture failed — the frame was empty.");
          return;
        }
        addMedia("photo", blob, blob.type, captureName("photo", extFromMime(blob.type)));
        setFlashKey((k) => k + 1);
      },
      fmt.mime,
      settings.photoQuality / 100
    );
  }, [addMedia, camera.facing, camera.videoRef, notify, settings.mirrorFront, settings.photoFormat, settings.photoQuality, settings.ratio]);

  // ── recording ─────────────────────────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (recording) {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      return;
    }
    const stream = camera.getStream();
    if (!stream || camera.status !== "live") {
      notify("error", "The camera is not live.");
      return;
    }
    const mime = pickVideoMime(settings.codec);
    if (!mime) {
      notify("error", "Video recording is not supported in this browser.");
      return;
    }
    const tracks = [...stream.getVideoTracks()];
    if (settings.recordAudio && camera.hasAudio) tracks.push(...stream.getAudioTracks());
    const composed = new MediaStream(tracks);

    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(composed, { mimeType: mime, videoBitsPerSecond: VIDEO_BITRATE });
    } catch {
      try {
        rec = new MediaRecorder(composed);
      } catch {
        notify("error", "The recorder failed to start.");
        return;
      }
    }

    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const type = rec.mimeType || mime;
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      if (elapsedIvRef.current !== null) {
        window.clearInterval(elapsedIvRef.current);
        elapsedIvRef.current = null;
      }
      setRecording(false);
      if (blob.size > 0) {
        addMedia("video", blob, type, captureName("video", type.includes("mp4") ? "mp4" : "webm"));
      } else {
        notify("error", "The recording produced no data.");
      }
    };

    rec.start(1000);
    recorderRef.current = rec;
    setRecording(true);
    setElapsed(0);
    startedAtRef.current = Date.now();
    elapsedIvRef.current = window.setInterval(() => setElapsed(Date.now() - startedAtRef.current), 250);
  }, [addMedia, camera, notify, recording, settings.codec, settings.recordAudio]);

  // ── shutter (with self-timer) ─────────────────────────────────────────────
  const shutter = useCallback(() => {
    if (camera.status !== "live") {
      notify("error", "The camera is not live yet.");
      return;
    }
    if (settings.mode === "video") {
      toggleRecording();
      return;
    }
    if (countingRef.current) return;
    if (settings.countdown > 0) {
      countingRef.current = true;
      let n = settings.countdown;
      setCountdown(n);
      const iv = window.setInterval(() => {
        n -= 1;
        if (n <= 0) {
          window.clearInterval(iv);
          setCountdown(null);
          countingRef.current = false;
          capturePhoto();
        } else {
          setCountdown(n);
        }
      }, 1000);
    } else {
      capturePhoto();
    }
  }, [camera.status, capturePhoto, notify, settings.countdown, settings.mode, toggleRecording]);

  const shutterRef = useRef(shutter);
  shutterRef.current = shutter;

  // ── keyboard shortcuts ────────────────────────────────────────────────────
  const flip = camera.flip;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.tagName === "BUTTON" ||
          t.isContentEditable)
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        shutterRef.current();
      } else if (e.code === "KeyF") {
        flip();
      } else if (e.code === "KeyM") {
        setSettings((s) => ({ ...s, mode: s.mode === "photo" ? "video" : "photo" }));
      } else if (e.code === "KeyG") {
        setSettings((s) => ({ ...s, grid: !s.grid }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip, setSettings]);

  // ── settings patch (stops recording when the stream must restart) ─────────
  const patchSettings = useCallback(
    (p: Partial<Settings>) => {
      if (p.resolution && recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      setSettings((s) => ({ ...s, ...p }));
    },
    [setSettings]
  );

  const handleFlip = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    flip();
  }, [flip]);

  // ── full mode (fullscreen) + frame ratio ──────────────────────────────────
  const vfWrapRef = useRef<HTMLDivElement | null>(null);
  const vfBoxRef = useRef<HTMLDivElement | null>(null);
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      vfWrapRef.current
        ?.requestFullscreen()
        .catch(() => notify("error", "Full mode is not available in this browser."));
    }
  }, [notify]);

  const cycleRatio = useCallback(() => {
    const order = FRAME_RATIOS.map((r) => r.id);
    const idx = order.indexOf(settings.ratio);
    const next = order[(idx + 1) % order.length];
    patchSettings({ ratio: next });
  }, [patchSettings, settings.ratio]);

  // ── upload pipeline ───────────────────────────────────────────────────────
  const uploadItem = useCallback(
    async (id: string): Promise<boolean> => {
      const it = itemsRef.current.find((i) => i.id === id);
      if (!it?.blob) return false;
      setItems((p) => p.map((i) => (i.id === id ? { ...i, status: "uploading", progress: 2, note: undefined } : i)));
      try {
        const res = await uploadToDrive(it.blob, it.name, it.mime, (f) => {
          const pct = Math.max(2, Math.round(f * 100));
          setItems((p) => p.map((i) => (i.id === id ? { ...i, progress: pct } : i)));
        });
        if (it.url) URL.revokeObjectURL(it.url); // policy: no local copy after success
        const record: DriveRecord = {
          id: res.id,
          name: res.name ?? it.name,
          size: it.size,
          mime: it.mime,
          url: res.url,
          uploadedAt: Date.now(),
          source: it.name,
        };
        setItems((p) =>
          p.map((i) =>
            i.id === id
              ? { ...i, status: "uploaded", progress: 100, blob: undefined, url: undefined, drive: record, note: undefined }
              : i
          )
        );
        setRecords((r) => [record, ...r]);
        setSessionSync((s) => ({ count: s.count + 1, bytes: s.bytes + it.size }));
        notify("success", `${it.name} saved to Google Drive.`);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown upload error.";
        setItems((p) => p.map((i) => (i.id === id ? { ...i, status: "error", note: msg } : i)));
        notify("error", `Upload failed — ${msg}`);
        return false;
      }
    },
    [notify, setRecords]
  );

  const uploadAll = useCallback(async () => {
    const targets = itemsRef.current.filter((i) => i.blob && (i.status === "local" || i.status === "error"));
    if (targets.length === 0) return;
    setBatch({ done: 0, total: targets.length });
    let ok = 0;
    for (const t of targets) {
      const success = await uploadItem(t.id);
      if (success) ok += 1;
      setBatch((b) => (b ? { ...b, done: b.done + 1 } : b));
    }
    setBatch(null);
    notify(
      ok === targets.length ? "success" : "info",
      `${ok}/${targets.length} file${targets.length > 1 ? "s" : ""} saved to Drive.`
    );
  }, [notify, uploadItem]);

  const testBackend = useCallback(async () => {
    setBackendState("testing");
    const ok = await pingBackend();
    setBackendState(ok ? "ok" : "fail");
    notify(ok ? "success" : "error", ok ? "Apps Script backend is reachable." : "Could not reach the Apps Script backend.");
  }, [notify]);

  // ── import / download / delete ────────────────────────────────────────────
  const importFiles = useCallback(
    (files: FileList) => {
      let added = 0;
      for (const f of Array.from(files)) {
        if (!isAllowedFile(f)) {
          notify("error", `${f.name}: unsupported file type.`);
          continue;
        }
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
        const mime = f.type || mimeFromExt(ext);
        addMedia(mime.startsWith("video/") ? "video" : "photo", f, mime, f.name);
        added += 1;
      }
      if (added > 0) notify("success", `${added} file${added > 1 ? "s" : ""} added to the session.`);
    },
    [addMedia, notify]
  );

  const downloadItem = useCallback(
    (id: string) => {
      const it = itemsRef.current.find((i) => i.id === id);
      if (!it?.url) {
        notify("info", "No local copy available — this file lives in Drive now.");
        return;
      }
      const a = document.createElement("a");
      a.href = it.url;
      a.download = it.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    [notify]
  );

  const deleteItem = useCallback((id: string) => {
    const it = itemsRef.current.find((i) => i.id === id);
    if (it?.url) URL.revokeObjectURL(it.url);
    setItems((p) => p.filter((i) => i.id !== id));
    setLightboxId((cur) => (cur === id ? null : cur));
  }, []);

  const clearSession = useCallback(() => {
    itemsRef.current.forEach((i) => i.url && URL.revokeObjectURL(i.url));
    setItems([]);
    setLightboxId(null);
    notify("info", "Session library cleared.");
  }, [notify]);

  // ── derived ───────────────────────────────────────────────────────────────
  const mirrored = settings.mirrorFront && camera.facing === "user";
  const resLabel =
    camera.trackInfo && camera.trackInfo.w > 0
      ? `${camera.trackInfo.w}×${camera.trackInfo.h}`
      : (RESOLUTIONS.find((r) => r.id === settings.resolution)?.label ?? "—");

  const lastShotItem = items.find((i) => !!i.url) ?? null;
  const lastShot = lastShotItem?.url
    ? { id: lastShotItem.id, url: lastShotItem.url, kind: lastShotItem.kind }
    : null;

  const viewable = useMemo(() => items.filter((i) => !!i.url), [items]);
  const lightboxIndex = viewable.findIndex((i) => i.id === lightboxId);
  const lightboxItem = lightboxIndex >= 0 ? viewable[lightboxIndex] : null;

  const localCount = items.filter((i) => i.blob && (i.status === "local" || i.status === "error")).length;

  const sensorLabel =
    camera.status === "live" ? "Live" : camera.status === "error" ? "Offline" : "Booting";
  const sensorDot =
    camera.status === "live" ? "bg-ok" : camera.status === "error" ? "bg-rec" : "bg-brand animate-blink";
  const driveDot =
    backendState === "ok" ? "bg-ok" : backendState === "fail" ? "bg-rec" : backendState === "testing" ? "bg-brand animate-blink" : "bg-dim";

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen">
      {/* ambient drifting light */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="animate-drift-a absolute -top-44 -left-44 h-[34rem] w-[34rem] rounded-full bg-brand/6 blur-[130px]" />
        <div className="animate-drift-b absolute -right-44 -bottom-44 h-[30rem] w-[30rem] rounded-full bg-ok/5 blur-[130px]" />
      </div>

      {/* header */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg0/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-brand/40 bg-brand/10 text-brand">
            <IconAperture className="h-5 w-5 transition-transform duration-700 hover:rotate-[60deg]" />
          </span>
          <h1 className="font-display text-lg font-extrabold tracking-tight text-ink">
            Camera Studio <span className="text-brand">Pro</span>
          </h1>
          <span className="hidden rounded-sm border border-line bg-bg2 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.2em] text-mut uppercase sm:inline">
            v1.0
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-sm border border-line bg-bg2 px-2 py-1 font-mono text-[9px] tracking-[0.18em] text-mut uppercase sm:flex">
              <span className={`h-1.5 w-1.5 rounded-full ${sensorDot}`} />
              Sensor {sensorLabel}
            </span>
            <span className="flex items-center gap-1.5 rounded-sm border border-line bg-bg2 px-2 py-1 font-mono text-[9px] tracking-[0.18em] text-mut uppercase">
              <span className={`h-1.5 w-1.5 rounded-full ${driveDot}`} />
              Drive
            </span>
            <span className="hidden font-mono text-xs text-mut tabular-nums md:block">{clock}</span>
          </div>
        </div>
      </header>

      {/* main */}
      <main className="relative z-10 mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* left — the viewfinder */}
          <div className="flex flex-col gap-4">
            <Viewfinder
              wrapRef={vfWrapRef}
              boxRef={vfBoxRef}
              videoRef={camera.videoRef}
              status={camera.status}
              errorName={camera.errorName}
              facing={camera.facing}
              mode={settings.mode}
              ratio={settings.ratio}
              recording={recording}
              elapsed={elapsed}
              resLabel={resLabel}
              mirrored={mirrored}
              grid={settings.grid}
              countdown={countdown}
              flashKey={flashKey}
              fs={fs}
              lastShot={lastShot}
              onRetry={() => void camera.start()}
              onOpenLast={() => lastShot && setLightboxId(lastShot.id)}
              onToggleFs={toggleFs}
              onCycleRatio={cycleRatio}
              onShutter={shutter}
              onFlip={handleFlip}
            />

            {/* HUD readout strip */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Mode", value: settings.mode.toUpperCase(), accent: settings.mode === "video" ? "text-rec" : "text-brand" },
                { label: "Sensor", value: sensorLabel.toUpperCase(), accent: camera.status === "live" ? "text-ok" : camera.status === "error" ? "text-rec" : "text-brand" },
                { label: "Resolution", value: resLabel, accent: "text-ink" },
                { label: "Synced", value: `${sessionSync.count} · ${formatBytes(sessionSync.bytes)}`, accent: "text-ok" },
              ].map((s) => (
                <div key={s.label} className="rounded-md border border-line bg-bg1 px-3 py-2.5 transition-colors hover:border-line2">
                  <p className="font-mono text-[9px] tracking-[0.2em] text-dim uppercase">{s.label}</p>
                  <p className={`font-display mt-0.5 truncate text-sm font-bold ${s.accent}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* right — control rail */}
          <div className="flex flex-col gap-5">
            <ControlDeck
              settings={settings}
              onPatch={patchSettings}
              cameraLive={camera.status === "live"}
              facing={camera.facing}
              canVideo={canVideo}
              codec={codec}
              recording={recording}
              elapsed={elapsed}
              onShutter={shutter}
              onFlip={handleFlip}
              onImport={importFiles}
            />
            <SettingsPanel settings={settings} onPatch={patchSettings} hasAudio={camera.hasAudio} />
            <DrivePanel
              backendState={backendState}
              onTest={() => void testBackend()}
              localCount={localCount}
              batch={batch}
              onUploadAll={() => void uploadAll()}
              sessionCount={sessionSync.count}
              sessionBytes={sessionSync.bytes}
            />
          </div>

          {/* bottom — library */}
          <div className="lg:col-span-2">
            <Library
              items={items}
              records={records}
              tab={libTab}
              onTab={setLibTab}
              onUpload={(id) => void uploadItem(id)}
              onDelete={deleteItem}
              onDownload={downloadItem}
              onPreview={setLightboxId}
              onRemoveRecord={(r) =>
                setRecords((rs) => rs.filter((x) => x.uploadedAt !== r.uploadedAt || x.name !== r.name))
              }
              onClearRecords={() => {
                setRecords([]);
                notify("info", "Drive history cleared.");
              }}
              onClearSession={clearSession}
            />
          </div>
        </div>
      </main>

      {/* footer */}
      <footer className="relative z-10 mt-10 border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
            Camera Studio Pro — Netlify × Apps Script × Google Drive
          </p>
          <p className="font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
            Max 25 MB · JPG PNG WEBP MP4 MOV WEBM · no secrets in this bundle
          </p>
        </div>
      </footer>

      {/* overlays */}
      <Lightbox
        item={lightboxItem}
        hasPrev={lightboxIndex > 0}
        hasNext={lightboxIndex >= 0 && lightboxIndex < viewable.length - 1}
        onClose={() => setLightboxId(null)}
        onPrev={() => lightboxIndex > 0 && setLightboxId(viewable[lightboxIndex - 1].id)}
        onNext={() =>
          lightboxIndex >= 0 && lightboxIndex < viewable.length - 1 && setLightboxId(viewable[lightboxIndex + 1].id)
        }
        onUpload={(id) => void uploadItem(id)}
        onDownload={downloadItem}
        onDelete={deleteItem}
      />
      <Toasts toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

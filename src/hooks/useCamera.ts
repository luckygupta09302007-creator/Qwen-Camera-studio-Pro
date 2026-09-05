import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraStatus, Facing } from "../types";
import { RESOLUTIONS } from "../config";

interface UseCameraOptions {
  resolutionId: (typeof RESOLUTIONS)[number]["id"];
}

export interface CameraApi {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  errorName: string;
  facing: Facing;
  hasAudio: boolean;
  trackInfo: { w: number; h: number } | null;
  start: () => Promise<void>;
  flip: () => void;
  getStream: () => MediaStream | null;
}

/**
 * Manages the getUserMedia lifecycle: start/stop, front↔rear flip,
 * resolution changes, mic fallback when audio permission is refused.
 */
export function useCamera({ resolutionId }: UseCameraOptions): CameraApi {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorName, setErrorName] = useState("");
  const [facing, setFacing] = useState<Facing>("environment");
  const [hasAudio, setHasAudio] = useState(true);
  const [trackInfo, setTrackInfo] = useState<{ w: number; h: number } | null>(null);

  const facingRef = useRef(facing);
  facingRef.current = facing;
  const resRef = useRef(resolutionId);
  resRef.current = resolutionId;

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorName("UnsupportedError");
      setStatus("error");
      return;
    }
    setStatus("starting");
    stopTracks();

    const res = RESOLUTIONS.find((r) => r.id === resRef.current) ?? RESOLUTIONS[1];
    const videoConstraints: MediaTrackConstraints = {
      facingMode: facingRef.current,
      width: { ideal: res.width },
      height: { ideal: res.height },
    };

    let stream: MediaStream | null = null;
    let audio = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true });
    } catch (firstErr) {
      audio = false;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
      } catch (secondErr) {
        const name =
          (secondErr as DOMException)?.name || (firstErr as DOMException)?.name || "UnknownError";
        setErrorName(name);
        setStatus("error");
        return;
      }
    }

    streamRef.current = stream;
    setHasAudio(audio);
    setErrorName("");

    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      await video.play().catch(() => undefined);
    }

    const s = stream.getVideoTracks()[0]?.getSettings();
    setTrackInfo(s && (s.width || s.height) ? { w: s.width ?? 0, h: s.height ?? 0 } : null);
    setStatus("live");
  }, [stopTracks]);

  useEffect(() => {
    void start();
    return stopTracks;
  }, [start, stopTracks, facing, resolutionId]);

  const flip = useCallback(() => {
    setFacing((f) => (f === "user" ? "environment" : "user"));
  }, []);

  const getStream = useCallback(() => streamRef.current, []);

  return { videoRef, status, errorName, facing, hasAudio, trackInfo, start, flip, getStream };
}

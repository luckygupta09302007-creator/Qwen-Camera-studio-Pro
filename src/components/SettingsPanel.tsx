import type { CSSProperties } from "react";
import type { Settings } from "../types";
import { RESOLUTIONS } from "../config";
import { IconGear } from "./icons";

interface SettingsPanelProps {
  settings: Settings;
  onPatch: (p: Partial<Settings>) => void;
  hasAudio: boolean;
}

function Toggle({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
        on ? "bg-ok" : "bg-line2"
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] h-3.5 w-3.5 rounded-full bg-bg0 transition-transform duration-200 ${
          on ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        {sub && <p className="mt-0.5 text-[11px] leading-snug text-dim">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsPanel({ settings, onPatch, hasAudio }: SettingsPanelProps) {
  const fill = `${((settings.photoQuality - 60) / 40) * 100}%`;

  return (
    <section className="rounded-lg border border-line bg-bg1 p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold tracking-[0.28em] text-brand uppercase">
          Capture settings
        </p>
        <IconGear className="h-4 w-4 text-dim" />
      </div>

      <div className="mt-4 space-y-5">
        {/* resolution */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">Sensor resolution</p>
            <span className="font-mono text-[10px] tracking-wider text-brand uppercase">
              {RESOLUTIONS.find((r) => r.id === settings.resolution)?.label}
            </span>
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-md border border-line bg-bg2 p-1">
            {RESOLUTIONS.map((r) => (
              <button
                key={r.id}
                onClick={() => onPatch({ resolution: r.id })}
                className={`rounded py-1.5 font-mono text-[11px] font-semibold tracking-wider transition-all ${
                  settings.resolution === r.id
                    ? "bg-bg3 text-brand shadow ring-1 ring-brand/40"
                    : "text-mut hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* quality */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">Photo quality</p>
            <span className="font-mono text-[10px] tracking-wider text-brand tabular-nums">
              {settings.photoQuality}
            </span>
          </div>
          <input
            type="range"
            min={60}
            max={100}
            step={1}
            value={settings.photoQuality}
            onChange={(e) => onPatch({ photoQuality: Number(e.target.value) })}
            className="mt-2.5"
            style={{ "--fill": fill } as CSSProperties}
            aria-label="Photo quality"
          />
        </div>

        {/* toggles */}
        <div className="space-y-3.5 border-t border-line pt-4">
          <Row label="Mirror front camera" sub="Saved selfies match the preview">
            <Toggle
              on={settings.mirrorFront}
              onChange={(v) => onPatch({ mirrorFront: v })}
              label="Mirror front camera"
            />
          </Row>
          <Row label="Rule-of-thirds grid">
            <Toggle on={settings.grid} onChange={(v) => onPatch({ grid: v })} label="Grid overlay" />
          </Row>
          <Row
            label="Record audio"
            sub={hasAudio ? "Mix the microphone into video clips" : "No microphone detected on this device"}
          >
            <Toggle
              on={settings.recordAudio && hasAudio}
              onChange={(v) => onPatch({ recordAudio: v })}
              disabled={!hasAudio}
              label="Record audio"
            />
          </Row>
        </div>
      </div>
    </section>
  );
}

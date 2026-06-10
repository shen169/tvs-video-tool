"use client";
import { useState } from "react";
import { Icon, SvgIcon } from "./Icons";

const SHOT_TYPES = ["wide", "medium", "close_up"];
const ANGLES = ["eye_level", "top_down", "low_hero", "45_degree"];
const CAMERA_MOVES = [
  "static", "slow_push_in", "slow_pull_out", "dolly_right",
  "tracking_arc", "steadicam_float", "handheld_subtle", "handheld_walk",
  "snap_zoom", "crash_zoom", "handheld_settle", "focus_rack",
  "macro_pan", "extreme_slow_push", "depth_reveal", "whip_pan",
];
const LIGHTINGS = ["soft_studio", "natural_window", "dramatic_rim"];
const TRANSITIONS = ["cut", "dissolve", "fade"];

function Select({ value, options, onChange, className }: {
  value: string; options: string[]; onChange: (v: string) => void; className?: string;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`text-[10px] px-2 py-1 rounded-md bg-[#0d0d0f] border border-zinc-700/30 text-zinc-300
        focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 cursor-pointer ${className || ""}`}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function ScriptEditor({ shot, index, onChange }: {
  shot: any;
  index: number;
  onChange: (updated: any) => void;
}) {
  const [local, setLocal] = useState({ ...shot });

  const update = (field: string, value: any) => {
    const next = { ...local, [field]: value };
    setLocal(next);
    onChange(next);
  };

  return (
    <div className="rounded-xl bg-[#0d0d0f] border border-zinc-700/20 overflow-hidden group hover:border-zinc-600/40 transition-colors">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-700/20 bg-[#0a0a0d]">
        <span className="text-xs font-bold text-zinc-400 font-mono">Shot {index + 1}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 font-medium">
          {shot.purpose}
        </span>
        <span className="text-[10px] text-zinc-600 ml-auto">{local.duration}s</span>
      </div>

      {/* Props row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 border-b border-zinc-700/10">
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-zinc-600">Shot:</span>
          <Select value={local.shot_type} options={SHOT_TYPES} onChange={v => update("shot_type", v)} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-zinc-600">Angle:</span>
          <Select value={local.angle} options={ANGLES} onChange={v => update("angle", v)} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-zinc-600">Camera:</span>
          <Select value={local.camera_move} options={CAMERA_MOVES} onChange={v => update("camera_move", v)} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-zinc-600">Light:</span>
          <Select value={local.lighting} options={LIGHTINGS} onChange={v => update("lighting", v)} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-zinc-600">Trans:</span>
          <Select value={local.transition} options={TRANSITIONS} onChange={v => update("transition", v)} />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[9px] text-zinc-600">Dur(s):</span>
          <input type="number" step="0.1" min="0.5" max="10" value={local.duration}
            onChange={e => update("duration", parseFloat(e.target.value) || 1)}
            className="text-[10px] w-14 px-2 py-1 rounded-md bg-[#0d0d0f] border border-zinc-700/30 text-zinc-300
              focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20" />
        </div>
      </div>

      {/* Editable text fields */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Scene */}
        <div>
          <label className="flex items-center gap-1.5 text-[9px] text-zinc-500 uppercase tracking-wider mb-1">
            <SvgIcon d={Icon.image} size={2.5} className="text-zinc-600" />
            Scene Description
          </label>
          <textarea value={local.scene} onChange={e => update("scene", e.target.value)}
            rows={2}
            className="w-full text-[11px] px-3 py-2 rounded-lg bg-[#0a0a0d] border border-zinc-700/20 text-zinc-300
              focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 resize-none
              placeholder:text-zinc-600" />
        </div>

        {/* Voiceover */}
        <div>
          <label className="flex items-center gap-1.5 text-[9px] text-zinc-500 uppercase tracking-wider mb-1">
            <SvgIcon d={Icon.play} size={2.5} className="text-amber-500/60" />
            Voiceover (AI Narration)
          </label>
          <textarea value={local.voiceover} onChange={e => update("voiceover", e.target.value)}
            rows={2}
            className="w-full text-[11px] px-3 py-2 rounded-lg bg-[#0a0a0d] border border-zinc-700/20 text-amber-300/80
              focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 resize-none
              placeholder:text-zinc-600 italic" />
        </div>

        {/* Subtitle */}
        <div>
          <label className="flex items-center gap-1.5 text-[9px] text-zinc-500 uppercase tracking-wider mb-1">
            <SvgIcon d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" size={2.5} className="text-zinc-600" />
            Subtitle (On-Screen Text)
          </label>
          <input value={local.subtitle} onChange={e => update("subtitle", e.target.value)}
            maxLength={60}
            className="w-full text-[11px] px-3 py-2 rounded-lg bg-[#0a0a0d] border border-zinc-700/20 text-zinc-300
              focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20
              placeholder:text-zinc-600" />
        </div>
      </div>
    </div>
  );
}

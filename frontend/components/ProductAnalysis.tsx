"use client";
import { useState } from "react";

export default function ProductAnalysis({ info, collapsed }: { info: Record<string, any> | null; collapsed?: boolean }) {
  const [open, setOpen] = useState(!collapsed);
  if (!info) return <div className="shimmer h-48 rounded-2xl" />;

  const hasAI = info.ai_analyzed;
  const features = info.key_features || [];
  const audience = info.target_audience || [];
  const pains = info.pain_points || [];
  const scenarios = info.use_scenarios || [];
  const hooks = info.video_hook_angles || [];

  return (
    <div className="rounded-2xl bg-[#121214] border border-[#27272c] p-6 grain animate-in animate-in-1">
      {/* Header */}
      <div className="flex items-start justify-between mb-5" onClick={collapsed ? () => setOpen(!open) : undefined}
        style={{ cursor: collapsed ? "pointer" : "default" }}>
        <div className="flex items-start gap-4 min-w-0">
          {info.images?.[0] && (
            <img src={info.images[0]} className="w-16 h-16 rounded-xl object-cover border border-[#27272c] flex-shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-zinc-100 text-base leading-snug">{info.title || "Product"}</h3>
              {hasAI && <Badge color="amber">AI Analysis</Badge>}
              {info.data_source && info.data_source !== "none" && (
                <Badge color="zinc">{info.data_source}</Badge>
              )}
            </div>
            {info.price && <p className="text-2xl font-bold text-amber-400 mt-1.5">{info.price}</p>}
          </div>
        </div>
        {collapsed && <span className="text-zinc-600 text-sm mt-1">{open ? "▲" : "▼"}</span>}
      </div>

      {(!collapsed || open) && (
        <>
          {/* AI Grid */}
          {hasAI && features.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <InsightCard icon="🔑" label="Key Features" color="amber" items={features.slice(0, 5)} />
              {audience.length > 0 && <InsightCard icon="👤" label="Target Audience" color="cyan" items={audience.slice(0, 4)} />}
              {pains.length > 0 && <InsightCard icon="💢" label="Pain Points" color="red" items={pains.slice(0, 4)} />}
              {scenarios.length > 0 && <InsightCard icon="🎬" label="Use Scenarios" color="violet" items={scenarios.slice(0, 4)} />}
            </div>
          )}

          {/* Hooks */}
          {hooks.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/10">
              <p className="text-[10px] text-amber-400/80 font-semibold uppercase tracking-wider mb-2.5">🎯 Video Hook Angles</p>
              <div className="flex flex-wrap gap-1.5">
                {hooks.map((h: string, i: number) => (
                  <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-[#1c1c20] text-zinc-400 border border-zinc-700/30">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fallback */}
          {!hasAI && info.description && (
            <p className="text-sm text-zinc-400 leading-relaxed">{info.description}</p>
          )}
        </>
      )}
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/15",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/15",
    zinc: "bg-zinc-500/10 text-zinc-400 border-zinc-500/10",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${colors[color] || colors.zinc}`}>
      {children}
    </span>
  );
}

function InsightCard({ icon, label, color, items }: {
  icon: string; label: string; color: string; items: string[];
}) {
  const borders: Record<string, string> = {
    amber: "border-amber-500/10", cyan: "border-cyan-500/10",
    red: "border-red-500/10", violet: "border-violet-500/10",
  };
  const texts: Record<string, string> = {
    amber: "text-amber-400", cyan: "text-cyan-400",
    red: "text-red-400", violet: "text-violet-400",
  };
  return (
    <div className={`p-3.5 rounded-xl bg-[#0d0d0f] border ${borders[color] || "border-zinc-700/20"}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${texts[color] || "text-zinc-400"}`}>
        {icon} {label}
      </p>
      <ul className="space-y-1.5">
        {items.map((item: string, i: number) => (
          <li key={i} className="text-[11px] text-zinc-400 leading-relaxed flex gap-1.5">
            <span className="text-zinc-700 flex-shrink-0">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

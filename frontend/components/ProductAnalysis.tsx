"use client";
import { useState } from "react";

export default function ProductAnalysis({ info }: { info: Record<string, any> | null }) {
  if (!info) return <div className="shimmer h-48 rounded-xl" />;

  const hasAI = info.ai_analyzed;
  const features = info.key_features || [];
  const audience = info.target_audience || [];
  const pains = info.pain_points || [];
  const scenarios = info.use_scenarios || [];
  const hooks = info.video_hook_angles || [];
  const source = info.data_source;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        {info.images?.[0] && (
          <img src={info.images[0]} alt="" className="w-20 h-20 rounded-xl object-cover border border-[#1f1f24] flex-shrink-0" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-zinc-200 text-lg leading-tight">{info.title || "产品分析"}</h3>
            {hasAI && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 flex-shrink-0">
                AI 分析
              </span>
            )}
          </div>
          {info.price && <span className="text-xl font-bold text-emerald-400">{info.price}</span>}
          {source && source !== "none" && (
            <span className="text-[10px] text-zinc-600 ml-2">via {source}</span>
          )}
        </div>
      </div>

      {/* AI Analysis Grid */}
      {hasAI && features.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {/* Key Features */}
          <Section title="🔑 核心卖点" color="emerald">
            {features.slice(0, 5).map((f: string, i: number) => (
              <li key={i}>{f}</li>
            ))}
          </Section>

          {/* Target Audience */}
          {audience.length > 0 && (
            <Section title="👤 目标人群" color="blue">
              {audience.slice(0, 4).map((a: string, i: number) => (
                <li key={i}>{a}</li>
              ))}
            </Section>
          )}

          {/* Pain Points */}
          {pains.length > 0 && (
            <Section title="💢 用户痛点" color="red">
              {pains.slice(0, 4).map((p: string, i: number) => (
                <li key={i}>{p}</li>
              ))}
            </Section>
          )}

          {/* Use Scenarios */}
          {scenarios.length > 0 && (
            <Section title="🎬 使用场景" color="purple">
              {scenarios.slice(0, 4).map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </Section>
          )}
        </div>
      )}

      {/* Video Hook Angles */}
      {hooks.length > 0 && (
        <div className="p-3 rounded-lg bg-emerald-600/5 border border-emerald-600/10">
          <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider mb-2">🪝 可用视频 Hook</p>
          <div className="flex flex-wrap gap-1.5">
            {hooks.map((h: string, i: number) => (
              <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-[#1f1f24] text-zinc-400">
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fallback: old-style display */}
      {!hasAI && (
        <>
          {info.description && (
            <p className="text-sm text-zinc-400 leading-relaxed">{info.description}</p>
          )}
          {info.category_hints?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {info.category_hints.map((c: string) => (
                <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1f1f24] text-zinc-500">{c}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const borders: Record<string, string> = {
    emerald: "border-emerald-600/10",
    blue: "border-blue-600/10",
    red: "border-red-600/10",
    purple: "border-purple-600/10",
  };
  const texts: Record<string, string> = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    red: "text-red-400",
    purple: "text-purple-400",
  };
  return (
    <div className={`p-3 rounded-lg bg-[#131316] border ${borders[color] || "border-[#1f1f24]"}`}>
      <p className={`text-[10px] font-medium uppercase tracking-wider mb-2 ${texts[color] || "text-zinc-400"}`}>
        {title}
      </p>
      <ul className="space-y-1">
        {children}
      </ul>
    </div>
  );
}

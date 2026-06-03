export default function CreativePicker({ directions, onSelect }: { directions: Record<string, any>[]; onSelect: (d: any) => void }) {
  const riskColors: Record<string, string> = { high: "text-emerald-400", medium: "text-amber-400", low: "text-red-400" };

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-200 mb-1">选择创意方向</h3>
      <p className="text-xs text-zinc-500 mb-6">AI 分析了你的产品，提出 3 个创意方向</p>
      <div className="grid grid-cols-1 gap-4">
        {directions?.map((d) => (
          <button key={d.id} onClick={() => onSelect(d)}
            className="p-5 rounded-xl bg-[#131316] border border-[#1f1f24] hover:border-emerald-600/30 hover:bg-emerald-600/[0.02] text-left transition-all duration-200 group">
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">{d.title}</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1f1f24] text-zinc-500">{d.narrative_model?.replace("_", " ")}</span>
            </div>
            <p className="text-sm text-zinc-400 mb-3">{d.concept}</p>
            <div className="space-y-1.5 text-xs text-zinc-500">
              <div>💡 <span className="text-zinc-400">{d.big_idea}</span></div>
              <div>👀 {d.reason_to_watch}</div>
              <div>🪝 前3秒: {d.hook_moment}</div>
            </div>
            <div className="flex gap-3 mt-4 pt-3 border-t border-[#1f1f24]">
              <span className="text-[10px] text-zinc-600">{d.world_type?.replace("_", " ")}</span>
              <span className="text-[10px] text-zinc-600">{d.product_integration_mode?.replace("_", " ")}</span>
              <span className="text-[10px] text-zinc-600">{d.brand_tone}</span>
              <span className={`text-[10px] ${riskColors[d.ai_feasibility?.split(" ")[0]] || "text-zinc-500"}`}>🤖 {d.ai_feasibility}</span>
            </div>
            <p className="text-[10px] text-zinc-600 mt-2 italic">⚠ {d.risk}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

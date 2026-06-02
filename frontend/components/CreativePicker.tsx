export default function CreativePicker({ directions, onSelect }: { directions: Record<string, any>[]; onSelect: (d: any) => void }) {
  const riskColors: Record<string, string> = { high: "text-green-400", medium: "text-yellow-400", low: "text-red-400" };
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">选择创意方向</h3>
      <p className="text-sm text-zinc-400">AI 基于产品分析提出了 3 个创意方向，选择最符合你品牌调性的</p>
      <div className="grid grid-cols-1 gap-4">
        {directions?.map((d) => (
          <button key={d.id} onClick={() => onSelect(d)} className="p-5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-purple-500 text-left transition space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-purple-400 text-lg">{d.title}</h4>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{d.narrative_model}</span>
            </div>
            <p className="text-sm text-zinc-300 font-medium">{d.concept}</p>
            <p className="text-xs text-zinc-500">💡 Big Idea: {d.big_idea}</p>
            <p className="text-xs text-zinc-500">👀 {d.reason_to_watch}</p>
            <div className="flex gap-3 text-xs">
              <span className="text-zinc-500">🎬 {d.world_type?.replace("_", " ")}</span>
              <span className="text-zinc-500">📦 {d.product_integration_mode?.replace("_", " ")}</span>
              <span className="text-zinc-500">🎨 {d.brand_tone}</span>
              <span className={riskColors[d.ai_feasibility?.split(" ")[0]] || "text-zinc-500"}>🤖 {d.ai_feasibility}</span>
            </div>
            <p className="text-xs text-zinc-600 italic mt-1">⚠️ 风险: {d.risk}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

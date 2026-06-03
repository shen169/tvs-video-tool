export default function StylePicker({ options, onSelect }: { options: Record<string, any>[]; onSelect: (s: any) => void }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-200 mb-1">选择视频风格</h3>
      <p className="text-xs text-zinc-500 mb-6">5 个维度决定了视频的视觉基调</p>
      <div className="grid grid-cols-3 gap-4">
        {options?.map((opt) => (
          <button key={opt.id} onClick={() => onSelect(opt)}
            className="p-5 rounded-xl bg-[#131316] border border-[#1f1f24] hover:border-emerald-600/30 text-left transition-all duration-200 group">
            <h4 className="font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors mb-2">{opt.label}</h4>
            <p className="text-xs text-zinc-500 mb-4">{opt.description}</p>
            <div className="space-y-1 text-[11px] text-zinc-600">
              {["visual_style", "camera", "lighting", "angle", "human"].map((dim) => (
                <div key={dim} className="flex justify-between">
                  <span className="capitalize">{dim.replace("_", " ")}</span>
                  <span className="text-zinc-500">{opt[dim]}</span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

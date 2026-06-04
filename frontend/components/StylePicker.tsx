const DIMENSION_LABELS: Record<string, string> = {
  visual_style: "Visual Style", camera: "Camera", lighting: "Lighting", angle: "Angle", human: "Human",
};
const DIMENSION_EMOJI: Record<string, string> = {
  visual_style: "🎨", camera: "🎥", lighting: "💡", angle: "📐", human: "🧑",
};

const PALETTE = [
  { border: "border-amber-500/20", hoverBorder: "hover:border-amber-500/40", dot: "bg-amber-500", glow: "shadow-amber-500/10" },
  { border: "border-cyan-500/20", hoverBorder: "hover:border-cyan-500/40", dot: "bg-cyan-500", glow: "shadow-cyan-500/10" },
  { border: "border-violet-500/20", hoverBorder: "hover:border-violet-500/40", dot: "bg-violet-500", glow: "shadow-violet-500/10" },
];

export default function StylePicker({ options, onSelect }: {
  options: Record<string, any>[]; onSelect: (s: any) => void;
}) {
  return (
    <div className="animate-in animate-in-1">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-100">Choose Visual Style</h2>
        <p className="text-sm text-zinc-500 mt-1">5 dimensions define the entire visual identity of your video</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {options?.map((opt, i) => {
          const p = PALETTE[i % 3];
          return (
            <button key={opt.id} onClick={() => onSelect(opt)}
              className={`group p-5 rounded-2xl border text-left transition-all duration-300 card-lift ${p.border} ${p.hoverBorder} bg-[#121214]`}
            >
              <h4 className={`font-bold text-sm mb-1 transition-colors`}
                style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#22d3ee' : '#a78bfa' }}>
                {opt.label}
              </h4>
              <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">{opt.description}</p>

              <div className="space-y-2">
                {["visual_style", "camera", "lighting", "angle", "human"].map((dim) => (
                  <div key={dim} className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-600 flex items-center gap-1">
                      <span>{DIMENSION_EMOJI[dim]}</span>
                      <span>{DIMENSION_LABELS[dim]}</span>
                    </span>
                    <span className="text-zinc-400 font-medium capitalize">{String(opt[dim]).replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>

              {/* Selected indicator */}
              <div className={`mt-4 pt-3 border-t border-zinc-700/20 flex items-center gap-1.5 ${p.dot}`}>
                <div className={`w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}
                  style={{ backgroundColor: i === 0 ? '#fbbf24' : i === 1 ? '#22d3ee' : '#a78bfa' }} />
                <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors">Click to select</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

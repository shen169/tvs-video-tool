const THEMES = [
  { border: "border-amber-500/20", bg: "bg-amber-500/[0.03]", hoverBorder: "hover:border-amber-500/40", accent: "amber", gradient: "from-amber-500/10 to-transparent" },
  { border: "border-cyan-500/20", bg: "bg-cyan-500/[0.03]", hoverBorder: "hover:border-cyan-500/40", accent: "cyan", gradient: "from-cyan-500/10 to-transparent" },
  { border: "border-violet-500/20", bg: "bg-violet-500/[0.03]", hoverBorder: "hover:border-violet-500/40", accent: "violet", gradient: "from-violet-500/10 to-transparent" },
];

const ACCENT_COLORS: Record<string, string> = {
  amber: "text-amber-400 group-hover:text-amber-300",
  cyan: "text-cyan-400 group-hover:text-cyan-300",
  violet: "text-violet-400 group-hover:text-violet-300",
};

const feasibilityColors: Record<string, string> = { high: "text-emerald-400", medium: "text-amber-400", low: "text-red-400" };

export default function CreativePicker({ directions, onSelect }: {
  directions: Record<string, any>[]; onSelect: (d: any) => void;
}) {
  return (
    <div className="animate-in animate-in-1">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-100">Choose Creative Direction</h2>
        <p className="text-sm text-zinc-500 mt-1">AI analyzed your product and proposed 3 creative angles</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {directions?.map((d, i) => {
          const theme = THEMES[i % 3];
          const col = ACCENT_COLORS[theme.accent] || "text-zinc-400";
          return (
            <button key={d.id} onClick={() => onSelect(d)}
              className={`group p-5 rounded-2xl border text-left transition-all duration-300 card-lift ${theme.border} ${theme.bg} ${theme.hoverBorder}`}
            >
              {/* Top gradient */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${theme.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} style={{ position: 'relative' } as any}>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b" style={{ backgroundImage: `linear-gradient(to bottom, ${theme.accent === 'amber' ? 'rgba(245,158,11,0.08)' : theme.accent === 'cyan' ? 'rgba(6,182,212,0.08)' : 'rgba(139,92,246,0.08)'}, transparent)` }} />
              </div>

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1 block">
                      Direction {d.id.toUpperCase()}
                    </span>
                    <h3 className={`font-bold text-base transition-colors ${col}`}>{d.title}</h3>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-800/80 text-zinc-400 font-medium whitespace-nowrap">
                    {d.narrative_model?.replace(/_/g, " ")}
                  </span>
                </div>

                <p className="text-sm text-zinc-400 mb-4 leading-relaxed">{d.concept}</p>

                <div className="space-y-2 text-xs">
                  <InsightRow icon="💡" label="Big Idea" value={d.big_idea} />
                  <InsightRow icon="👀" label="Why Watch" value={d.reason_to_watch} />
                  <InsightRow icon="🪝" label="Hook (first 3s)" value={d.hook_moment} highlight />
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-zinc-700/30">
                  <Tag>{d.world_type?.replace(/_/g, " ")}</Tag>
                  <Tag>{d.product_integration_mode?.replace(/_/g, " ")}</Tag>
                  <Tag>{d.brand_tone}</Tag>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${feasibilityColors[d.ai_feasibility?.split(" ")[0]] || "text-zinc-500"}`}>
                    🤖 {d.ai_feasibility}
                  </span>
                </div>

                <p className="text-[10px] text-zinc-600 mt-3 italic">⚠ {d.risk}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InsightRow({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="flex-shrink-0 text-zinc-600">{icon}</span>
      <span className="text-zinc-600 flex-shrink-0">{label}:</span>
      <span className={`${highlight ? "text-amber-400/80 font-medium" : "text-zinc-400"}`}>{value}</span>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/50 text-zinc-500">{children}</span>;
}

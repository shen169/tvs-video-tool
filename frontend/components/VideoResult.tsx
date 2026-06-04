const PLATFORM_META: Record<string, { icon: string; label: string; ratio: string }> = {
  tiktok: { icon: "♪", label: "TikTok", ratio: "9:16" },
  amazon: { icon: "◻", label: "Amazon", ratio: "16:9" },
  youtube: { icon: "▶", label: "YouTube", ratio: "9:16" },
  instagram: { icon: "◇", label: "Instagram", ratio: "9:16" },
};

export default function VideoResult({ videos }: { videos: Record<string, string> }) {
  return (
    <div className="animate-in animate-in-1">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Videos Ready</h2>
          <p className="text-sm text-zinc-500">Your product videos have been generated</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {Object.entries(videos).map(([platform, url], i) => {
          const meta = PLATFORM_META[platform] || { icon: "●", label: platform, ratio: "16:9" };
          const isReal = url.startsWith("http");
          return (
            <a key={platform} href={isReal ? url : "#"} target={isReal ? "_blank" : undefined} rel="noreferrer"
              className="group p-5 rounded-2xl bg-[#121214] border border-[#27272c] hover:border-emerald-500/20 text-center transition-all duration-300 card-lift animate-in"
              style={{ animationDelay: `${i * 0.1}s`, opacity: 0 } as any}
            >
              {/* Platform icon */}
              <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 ${
                isReal
                  ? "bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/15 group-hover:border-emerald-500/30"
                  : "bg-zinc-800/50 border border-zinc-700/30"
              }`}>
                <span className={isReal ? "" : "opacity-40"}>{meta.icon}</span>
              </div>
              <div className="font-semibold text-zinc-200 capitalize text-sm mb-0.5">{meta.label}</div>
              <div className="text-[10px] text-zinc-600 mb-3">{meta.ratio}</div>
              <div className={`text-[10px] font-medium transition-colors ${
                isReal ? "text-emerald-400 group-hover:text-emerald-300" : "text-zinc-600"
              }`}>
                {isReal ? "↓ Download Video" : "Preview"}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

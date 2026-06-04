const STAGES = [
  { key: "fetching", label: "Product Analysis", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" },
  { key: "ref_image", label: "Reference Image", icon: "M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" },
  { key: "creative_wait", label: "Creative Direction", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" },
  { key: "style_wait", label: "Visual Style", icon: "M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072" },
  { key: "script_gen", label: "Script & Storyboard", icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" },
  { key: "preview_wait", label: "Preview", icon: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" },
  { key: "video_gen", label: "Video Generation", icon: "M3.375 6.75h4.5m-3 4.5h3m-1.5 4.5h1.5m3-9h12a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-12a2.25 2.25 0 0 1-2.25-2.25v-9a2.25 2.25 0 0 1 2.25-2.25Z" },
  { key: "done", label: "Complete", icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
];

export default function PipelineProgress({ stage }: { stage: string }) {
  const currentIdx = STAGES.findIndex((s) => s.key === stage);
  const isFailed = stage === "failed";

  return (
    <div className="w-full">
      {/* Desktop: horizontal pipeline */}
      <div className="hidden sm:flex items-center gap-0">
        {STAGES.map((s, i) => {
          const done = i < currentIdx;
          const current = i === currentIdx && !isFailed;
          const pending = i > currentIdx || isFailed;

          return (
            <div key={s.key} className="flex items-center flex-1 last:flex-[0.5] min-w-0">
              {/* Connector line */}
              {i > 0 && (
                <div className="flex-1 h-[2px] -ml-0.5 -mr-0.5">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ background: done ? "linear-gradient(90deg, #f59e0b, #d97706)" : "rgba(39,39,44,0.5)" }}
                  />
                </div>
              )}

              {/* Node */}
              <div className={`flex flex-col items-center gap-1.5 flex-shrink-0 ${pending && !current ? "opacity-35" : ""}`}>
                <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 ${
                  done ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" :
                  current ? "bg-amber-500 text-black border border-amber-500 shadow-lg shadow-amber-500/25 animate-pulse" :
                  "bg-[#18181b] text-zinc-600 border border-zinc-700/30"
                }`}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {done ? <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /> : <path d={s.icon} />}
                  </svg>
                  {current && (
                    <div className="absolute -inset-1 rounded-xl bg-amber-500/20 blur-md -z-10" />
                  )}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap transition-colors ${
                  done ? "text-zinc-300" : current ? "text-amber-400" : "text-zinc-600"
                }`}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: inline status pill */}
      <div className="sm:hidden flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${isFailed ? "bg-red-500" : stage === "done" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
        <span className="text-sm font-medium text-zinc-300">
          {STAGES.find(s => s.key === stage)?.label || stage}
        </span>
        <span className="text-xs text-zinc-600 ml-auto">Step {currentIdx + 1}/{STAGES.length}</span>
      </div>
    </div>
  );
}

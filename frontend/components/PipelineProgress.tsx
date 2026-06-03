const STAGES = [
  { key: "fetching", label: "分析产品" },
  { key: "ref_image", label: "参考图" },
  { key: "creative_wait", label: "创意方向" },
  { key: "style_wait", label: "视频风格" },
  { key: "script_gen", label: "脚本分镜" },
  { key: "preview_wait", label: "分镜预览" },
  { key: "video_gen", label: "生成视频" },
  { key: "done", label: "完成" },
];

export default function PipelineProgress({ stage }: { stage: string }) {
  const currentIdx = STAGES.findIndex((s) => s.key === stage);
  const isFailed = stage === "failed";
  const isDone = stage === "done";

  return (
    <div className="flex items-center gap-1.5">
      {STAGES.map((s, i) => {
        let state: "done" | "current" | "pending" = "pending";
        if (i < currentIdx) state = "done";
        else if (i === currentIdx && !isFailed) state = "current";

        return (
          <div key={s.key} className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className={`w-3 h-3 rounded-full flex-shrink-0 transition-all ${
                  state === "done"
                    ? "bg-emerald-500"
                    : state === "current"
                    ? isDone ? "bg-emerald-500" : "bg-emerald-500 animate-pulse"
                    : isFailed ? "bg-red-500/20" : "bg-zinc-800"
                }`}
              />
              <span
                className={`text-[11px] whitespace-nowrap transition-colors ${
                  state === "done" || state === "current"
                    ? "text-zinc-300"
                    : "text-zinc-600"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-px min-w-[12px] ${
                i < currentIdx ? "bg-emerald-600/50" : "bg-zinc-800"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const STAGES = [
  { key: "fetching", label: "产品分析", icon: "🔍" },
  { key: "ref_image", label: "参考图", icon: "📸" },
  { key: "style_wait", label: "选择风格", icon: "🎨" },
  { key: "script_gen", label: "脚本分镜", icon: "📝" },
  { key: "preview_wait", label: "分镜预览", icon: "🖼️" },
  { key: "video_gen", label: "视频生成", icon: "🎬" },
  { key: "done", label: "完成", icon: "✅" },
];

export default function PipelineProgress({ stage }: { stage: string }) {
  const currentIdx = STAGES.findIndex((s) => s.key === stage);
  return (
    <div className="flex items-center gap-2 py-4 overflow-x-auto">
      {STAGES.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
              i <= currentIdx ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {s.icon}
          </div>
          {i < STAGES.length - 1 && (
            <div
              className={`w-6 h-0.5 transition ${
                i < currentIdx ? "bg-blue-600" : "bg-zinc-800"
              }`}
            />
          )}
        </div>
      ))}
      <span className="ml-3 text-sm text-zinc-400">
        {STAGES[currentIdx]?.label || "等待中"}
      </span>
    </div>
  );
}

export default function VideoResult({ videos }: { videos: Record<string, string> }) {
  const icons: Record<string, string> = { tiktok: "♪", amazon: "◻", youtube: "▶", instagram: "◇" };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs">✓</div>
        <h3 className="text-sm font-semibold text-zinc-200">视频生成完成</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(videos).map(([platform, url]) => (
          <a key={platform} href={url.startsWith("http") ? url : "#"} target="_blank" rel="noreferrer" download
            className="p-6 rounded-xl bg-[#131316] border border-[#1f1f24] hover:border-emerald-600/30 text-center transition-all group">
            <div className="text-4xl mb-3 opacity-50">{icons[platform] || "●"}</div>
            <div className="font-semibold text-zinc-300 capitalize text-sm">{platform}</div>
            <div className="text-[10px] text-zinc-600 mt-1 group-hover:text-emerald-600 transition-colors">
              {url.startsWith("http") ? "点击下载视频" : "预览"}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

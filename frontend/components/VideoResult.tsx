export default function VideoResult({ videos }: { videos: Record<string, string> }) {
  const icons: Record<string, string> = {
    tiktok: "🎵",
    amazon: "📦",
    youtube: "▶️",
    instagram: "📱",
  };
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-green-400">✅ 视频生成完成</h3>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(videos).map(([platform, url]) => (
          <div
            key={platform}
            className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-center"
          >
            <div className="text-2xl mb-2">{icons[platform] || "🎬"}</div>
            <div className="font-bold capitalize">{platform}</div>
            <div className="text-xs text-zinc-500 mt-1 truncate">
              {url.startsWith("http") ? "点击下载" : url.substring(0, 50)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

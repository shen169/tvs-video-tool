export default function StoryboardGallery({
  scripts,
  platform,
  onConfirm,
}: {
  scripts: Record<string, any[]>;
  platform: string;
  onConfirm: () => void;
}) {
  const shots = scripts?.[platform] || [];
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">分镜预览 — {platform}</h3>
      <div className="grid grid-cols-2 gap-4">
        {shots.map((shot, i) => (
          <div key={i} className="p-4 rounded-xl bg-zinc-900 border border-zinc-700">
            <div className="aspect-[9/16] bg-zinc-800 rounded-lg mb-3 flex items-center justify-center text-zinc-500 text-sm">
              分镜 {i + 1}
            </div>
            <p className="text-xs text-zinc-400 mt-1">{shot.subtitle}</p>
            <p className="text-xs text-zinc-500">
              {shot.duration}s · {shot.shot_type}
            </p>
          </div>
        ))}
      </div>
      <button
        onClick={onConfirm}
        className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold transition"
      >
        确认分镜，开始生成视频
      </button>
    </div>
  );
}

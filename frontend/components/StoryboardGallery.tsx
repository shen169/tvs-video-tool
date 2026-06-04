"use client";

export default function StoryboardGallery({
  scripts,
  previewImages,
  platform,
  onConfirm,
}: {
  scripts: Record<string, any[]>;
  previewImages?: Record<string, string[]>;
  platform: string;
  onConfirm: () => void;
}) {
  const shots = scripts?.[platform] || [];
  const previews = previewImages?.[platform] || [];

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-200 mb-1">分镜预览 — {platform}</h3>
      <p className="text-xs text-zinc-500 mb-6">
        {shots.length} 个镜头 · 确认后开始视频生成
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {shots.map((shot: any, i: number) => {
          const previewUrl = previews[i];
          const hasImage = previewUrl && (previewUrl.startsWith("http") || previewUrl.startsWith("data:"));

          return (
            <div
              key={i}
              className="rounded-xl bg-[#131316] border border-[#1f1f24] overflow-hidden group hover:border-emerald-600/20 transition-all"
            >
              {/* Preview Image or Placeholder */}
              <div className="aspect-[9/16] bg-[#0a0a0c] flex items-center justify-center relative overflow-hidden">
                {hasImage ? (
                  <img
                    src={previewUrl}
                    alt={`Shot ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <>
                    <span className="text-4xl font-bold text-zinc-800 group-hover:text-emerald-900 transition-colors">
                      {i + 1}
                    </span>
                    {previewUrl && (
                      <span className="absolute bottom-2 left-2 right-2 text-[9px] text-zinc-600 truncate">
                        {previewUrl.slice(0, 60)}...
                      </span>
                    )}
                  </>
                )}
                <span className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-zinc-400">
                  {shot.purpose}
                </span>
                <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-zinc-500">
                  {shot.duration}s
                </span>
              </div>

              {/* Shot Details */}
              <div className="p-3">
                <p className="text-xs text-zinc-400 leading-relaxed mb-1.5 line-clamp-2">{shot.scene}</p>
                <div className="flex items-center justify-between text-[10px] text-zinc-600">
                  <span>
                    {shot.shot_type} · {shot.lighting}
                  </span>
                  <span>{shot.transition}</span>
                </div>
                {shot.voiceover && (
                  <p className="text-[10px] text-zinc-500 mt-1.5 italic line-clamp-1">🎤 {shot.voiceover}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onConfirm}
        className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm tracking-wide transition-all duration-200 active:scale-[0.99]"
      >
        确认分镜，开始生成视频
      </button>
    </div>
  );
}

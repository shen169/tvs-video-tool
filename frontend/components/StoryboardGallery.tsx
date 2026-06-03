export default function StoryboardGallery({ scripts, platform, onConfirm }: { scripts: Record<string, any[]>; platform: string; onConfirm: () => void }) {
  const shots = scripts?.[platform] || [];

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-200 mb-1">分镜预览 — {platform}</h3>
      <p className="text-xs text-zinc-500 mb-6">{shots.length} 个镜头 · 确认后开始视频生成</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {shots.map((shot: any, i: number) => (
          <div key={i} className="rounded-xl bg-[#131316] border border-[#1f1f24] overflow-hidden group hover:border-emerald-600/20 transition-all">
            <div className="aspect-[9/16] bg-[#0a0a0c] flex items-center justify-center relative">
              <span className="text-4xl font-bold text-zinc-800 group-hover:text-emerald-900 transition-colors">{i + 1}</span>
              <span className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-zinc-500">{shot.purpose}</span>
            </div>
            <div className="p-3">
              <p className="text-xs text-zinc-400 leading-relaxed mb-1.5">{shot.scene}</p>
              <div className="flex items-center justify-between text-[10px] text-zinc-600">
                <span>{shot.shot_type} · {shot.lighting}</span>
                <span>{shot.duration}s · {shot.transition}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onConfirm}
        className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm tracking-wide transition-all duration-200 active:scale-[0.99]">
        确认分镜，开始生成视频
      </button>
    </div>
  );
}

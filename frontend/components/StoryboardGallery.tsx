"use client";
import { Icon, SvgIcon } from "./Icons";

export default function StoryboardGallery({
  scripts, previewImages, platform, onConfirm, isGenerating, hideConfirm,
}: {
  scripts: Record<string, any[]>;
  previewImages?: Record<string, string[]>;
  platform: string;
  onConfirm: () => void;
  isGenerating?: boolean;
  hideConfirm?: boolean;
}) {
  const shots = scripts?.[platform] || [];
  const previews = previewImages?.[platform] || [];

  return (
    <div className="animate-in animate-in-1">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-100 capitalize">Storyboard — {platform}</h2>
        <p className="text-sm text-zinc-500 mt-1">{shots.length} shots · Review and confirm before video generation</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {shots.map((shot: any, i: number) => {
          const previewUrl = previews[i];
          const hasImage = previewUrl && (previewUrl.startsWith("http") || previewUrl.startsWith("data:"));

          return (
            <div key={i}
              className="rounded-2xl bg-[#121214] border border-[#27272c] overflow-hidden group card-lift animate-in"
              style={{ animationDelay: `${i * 0.06}s`, opacity: 0 } as any}
            >
              {/* Image Area */}
              <div className="aspect-[9/16] bg-[#0a0a0d] flex items-center justify-center relative overflow-hidden">
                {hasImage ? (
                  <>
                    <img src={previewUrl} alt={`Shot ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </>
                ) : isGenerating ? (
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                    <span className="text-[10px] text-zinc-500 font-medium">Generating preview...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-5xl font-bold text-zinc-800 group-hover:text-amber-900/60 transition-colors">
                      {i + 1}
                    </span>
                    {previewUrl && (
                      <span className="text-[9px] text-zinc-600 px-2 text-center leading-relaxed max-w-[90%] truncate">
                        {previewUrl.slice(0, 60)}...
                      </span>
                    )}
                  </div>
                )}

                {/* Top badges */}
                <span className="absolute top-2.5 left-2.5 text-[9px] px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-zinc-300 font-medium">
                  {shot.purpose}
                </span>
                <span className="absolute top-2.5 right-2.5 text-[9px] px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-zinc-500 font-mono">
                  {shot.duration}s
                </span>
              </div>

              {/* Details */}
              <div className="p-3.5">
                <p className="text-[11px] text-zinc-400 leading-relaxed mb-2 line-clamp-2">{shot.scene}</p>
                <div className="flex items-center gap-2 text-[10px] text-zinc-600 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800/50">{shot.shot_type}</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800/50">{shot.lighting}</span>
                  <span className="text-zinc-700">{shot.transition}</span>
                </div>
                {shot.voiceover && (
                  <p className="text-[10px] text-zinc-500 mt-2 italic line-clamp-1 flex items-center gap-1">
                    <SvgIcon d={Icon.play} size={3} className="text-amber-500/60" />
                    {shot.voiceover}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!hideConfirm && (
        <button onClick={onConfirm}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-black font-bold text-sm tracking-wide transition-all duration-300 active:scale-[0.98] shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30">
          ✦ Confirm & Generate Video
        </button>
      )}
    </div>
  );
}

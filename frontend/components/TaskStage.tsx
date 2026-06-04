"use client";
import { useState } from "react";
import ProductAnalysis from "./ProductAnalysis";
import CreativePicker from "./CreativePicker";
import StylePicker from "./StylePicker";
import StoryboardGallery from "./StoryboardGallery";
import VideoResult from "./VideoResult";
import { Icon, SvgIcon } from "./Icons";

export default function TaskStage({
  task, onSelectCreative, onSelectStyle, onConfirmStoryboard,
}: {
  task: any;
  onSelectCreative: (d: any) => void;
  onSelectStyle: (s: any) => void;
  onConfirmStoryboard: () => void;
}) {
  const { stage, product_info, ref_image_url, uploaded_ref_image,
    creative_directions, style_options, scripts, preview_images, video_urls, error } = task;
  const [storyboardTab, setStoryboardTab] = useState(0);
  const showProduct = product_info && stage !== "pending" && stage !== "fetching";

  const content = () => {
    switch (stage) {
      case "pending": case "fetching":
        return <Skeleton />;

      case "ref_image":
        return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} />}
            <StageShell icon={Icon.image} title="Reference Image" subtitle="AI-generated product hero shot">
              {uploaded_ref_image ? (
                <img src={uploaded_ref_image} alt="Uploaded reference" className="w-full max-w-sm rounded-2xl" />
              ) : ref_image_url && !ref_image_url.startsWith("__") ? (
                <img src={ref_image_url} alt="AI generated reference" className="w-full max-w-sm rounded-2xl shadow-xl shadow-amber-500/5" />
              ) : (
                <div className="flex items-center gap-3 text-zinc-500">
                  <Spinner /> <span className="text-sm">Generating product photo with Seedream...</span>
                </div>
              )}
            </StageShell>
          </div>
        );

      case "creative_wait":
        return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} />}
            {creative_directions
              ? <CreativePicker directions={creative_directions} onSelect={onSelectCreative} />
              : <Skeleton />}
          </div>
        );

      case "style_wait":
        return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} />}
            {style_options
              ? <StylePicker options={style_options} onSelect={onSelectStyle} />
              : <Skeleton />}
          </div>
        );

      case "script_gen":
        return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} />}
            <StageShell icon={Icon.doc} title="Writing Script & Storyboard" subtitle="AI is crafting 6-shot sequences for each platform">
              <div className="flex items-center gap-4 mt-2">
                <Spinner />
                <div>
                  <p className="text-sm text-zinc-300">Generating product-specific scripts...</p>
                  <p className="text-xs text-zinc-600 mt-1">Using AI product insights + style preferences</p>
                </div>
              </div>
            </StageShell>
          </div>
        );

      case "preview_wait": {
        if (!scripts) return <Skeleton />;
        const platformKeys = Object.keys(scripts);
        const activePlatform = platformKeys[storyboardTab] || platformKeys[0];
        return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} collapsed />}
            {platformKeys.length > 1 && (
              <div className="flex gap-1.5">
                {platformKeys.map((plat, i) => (
                  <button key={plat} onClick={() => setStoryboardTab(i)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                      i === storyboardTab
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    }`}>
                    {plat}
                  </button>
                ))}
              </div>
            )}
            <StoryboardGallery scripts={scripts} previewImages={preview_images}
              platform={activePlatform} onConfirm={onConfirmStoryboard} />
          </div>
        );
      }

      case "video_gen":
        return (
          <div className="space-y-6 animate-in animate-in-1">
            <StageShell icon={Icon.film} title="Generating Video" subtitle="Seedance 2.0 is rendering your product video">
              <div className="flex items-center gap-4 mt-2">
                <Spinner />
                <div>
                  <p className="text-sm text-zinc-300">Estimated 2–5 minutes...</p>
                  <p className="text-xs text-zinc-600 mt-1">This page will update automatically</p>
                </div>
              </div>
            </StageShell>
          </div>
        );

      case "done":
        return video_urls
          ? <VideoResult videos={video_urls} />
          : <StageShell icon={Icon.check} title="Complete" subtitle=""><p className="text-sm text-zinc-500">Done</p></StageShell>;

      case "failed":
        return (
          <StageShell icon={Icon.xmark} title="Task Failed">
            <p className="text-sm text-red-400 mt-2">{error || "Unknown error"}</p>
            <button onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors cursor-pointer">
              Retry
            </button>
          </StageShell>
        );

      default:
        return <Skeleton />;
    }
  };

  return <div className="space-y-6">{content()}</div>;
}

/* ── Shared Shell ── */
function StageShell({ icon, title, subtitle, children }: {
  icon: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[#121214] border border-[#27272c] p-6 grain card-lift">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-400">
          <SvgIcon d={icon} size={5} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin flex-shrink-0" />;
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-in animate-in-1">
      {/* Product card skeleton */}
      <div className="rounded-2xl bg-[#121214] border border-[#27272c] p-6">
        <div className="flex gap-4 mb-4">
          <div className="shimmer w-16 h-16 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="shimmer h-5 w-2/3 rounded-lg" />
            <div className="shimmer h-4 w-1/3 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="shimmer h-24 rounded-xl" />
          <div className="shimmer h-24 rounded-xl" />
        </div>
      </div>
      {/* Second card skeleton */}
      <div className="rounded-2xl bg-[#121214] border border-[#27272c] p-6">
        <div className="shimmer h-4 w-1/3 rounded-lg mb-4" />
        <div className="shimmer h-32 rounded-xl" />
      </div>
    </div>
  );
}

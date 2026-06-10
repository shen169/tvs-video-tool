"use client";
import { useState, useRef } from "react";
import ProductAnalysis from "./ProductAnalysis";
import CreativePicker from "./CreativePicker";
import StylePicker from "./StylePicker";
import RecommendationCard from "./RecommendationCard";
import StoryboardGallery from "./StoryboardGallery";
import VideoResult from "./VideoResult";
import { Icon, SvgIcon } from "./Icons";
import { regenerateRefImage, uploadRefImage } from "@/lib/api";
import ScriptEditor from "./ScriptEditor";

export default function TaskStage({
  task, taskId, onSelectCreative, onSelectStyle, onConfirmStoryboard, onConfirmRecommend, onRefresh,
  onUpdateScripts, onConfirmScripts,
}: {
  task: any;
  taskId: string;
  onSelectCreative: (d: any) => void;
  onSelectStyle: (s: any) => void;
  onConfirmStoryboard: () => void;
  onConfirmRecommend: (creative: any, style: any) => void;
  onRefresh: () => void;
  onUpdateScripts?: (scripts: Record<string, any[]>) => void;
  onConfirmScripts?: () => void;
}) {
  const { stage, product_info, ref_image_url, uploaded_ref_image,
    creative_directions, style_options, recommendation, scripts, preview_images, video_urls, error } = task;
  const [storyboardTab, setStoryboardTab] = useState(0);
  const [editingScripts, setEditingScripts] = useState<Record<string, any[]>>({});
  const [savingScripts, setSavingScripts] = useState(false);
  const [editTab, setEditTab] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showProduct = product_info && stage !== "pending" && stage !== "fetching";
  const hasRefImage = ref_image_url && !ref_image_url.startsWith("__");
  const isPlaceholder = ref_image_url && ref_image_url.startsWith("__AI_GEN__:");
  const isProductImage = hasRefImage && product_info?.images?.includes(ref_image_url);
  const refSubtitle = uploaded_ref_image
    ? "Custom uploaded image"
    : isProductImage
      ? "Product page image (free — no API cost)"
      : isPlaceholder
        ? "Prompt ready — set SEEDANCE_API_KEY to generate"
        : "AI-generated product hero shot";
  // Edit controls only shown before video generation starts
  const canEditRefImage = stage !== "video_gen" && stage !== "done" && stage !== "failed";

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await regenerateRefImage(taskId);
      setTimeout(() => { onRefresh(); setRegenerating(false); }, 2000);
    } catch { setRegenerating(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadRefImage(taskId, file);
      setTimeout(() => { onRefresh(); setUploading(false); }, 1000);
    } catch { setUploading(false); }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── RefImage Controls (shared) ──
  const RefImageControls = canEditRefImage ? (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#27272c]">
      <button onClick={handleRegenerate} disabled={regenerating}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
        {regenerating ? <SpinnerMini /> : <SvgIcon d={Icon.sparkle} size={3} />}
        {regenerating ? "Regenerating..." : "Regenerate"}
      </button>
      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-700/30 hover:bg-zinc-700/30 hover:text-zinc-300 transition-colors cursor-pointer">
        {uploading ? <SpinnerMini /> : <SvgIcon d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" size={3} />}
        {uploading ? "Uploading..." : "Upload"}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </label>
    </div>
  ) : null;

  // Persistent reference image card (shown in all stages after generation)
  const RefImageCard = hasRefImage ? (
    <StageShell icon={Icon.image} title="Reference Image" subtitle={refSubtitle}>
      <img src={ref_image_url} alt="Product reference" className="w-full max-w-sm rounded-2xl shadow-xl shadow-amber-500/5" />
      {RefImageControls}
    </StageShell>
  ) : isPlaceholder ? (
    <StageShell icon={Icon.image} title="Reference Image" subtitle={refSubtitle}>
      <p className="text-[11px] text-zinc-500 leading-relaxed bg-[#0a0a0d] rounded-xl p-3 border border-zinc-700/30 max-h-24 overflow-y-auto">
        {ref_image_url!.replace("__AI_GEN__:", "")}
      </p>
      {RefImageControls}
    </StageShell>
  ) : null;

  const content = () => {
    switch (stage) {
      case "pending": case "fetching":
        return <Skeleton />;

      case "ref_image":
        return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} />}
            <StageShell icon={Icon.image} title="Reference Image" subtitle={refSubtitle}>
              {uploaded_ref_image ? (
                <>
                  <img src={uploaded_ref_image} alt="Uploaded reference" className="w-full max-w-sm rounded-2xl" />
                  {RefImageControls}
                </>
              ) : ref_image_url && !ref_image_url.startsWith("__") ? (
                <>
                  <img src={ref_image_url} alt="AI generated reference" className="w-full max-w-sm rounded-2xl shadow-xl shadow-amber-500/5" />
                  {RefImageControls}
                </>
              ) : ref_image_url && ref_image_url.startsWith("__AI_GEN__:") ? (
                <>
                  <div className="text-sm text-zinc-400 space-y-2">
                    <p className="text-amber-400/80 font-medium">Reference image prompt generated</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed bg-[#0a0a0d] rounded-xl p-3 border border-zinc-700/30 max-h-24 overflow-y-auto">
                      {ref_image_url.replace("__AI_GEN__:", "")}
                    </p>
                    <p className="text-[10px] text-zinc-600">Set SEEDANCE_API_KEY to enable automatic image generation</p>
                  </div>
                  {RefImageControls}
                </>
              ) : (
                <div className="flex items-center gap-3 text-zinc-500">
                  <Spinner /> <span className="text-sm">Generating product photo with Seedream...</span>
                </div>
              )}
            </StageShell>
          </div>
        );

      case "creative_wait":
        // Backward compat: old tasks still at creative_wait
        return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} />}
            {RefImageCard}
            {creative_directions
              ? <CreativePicker directions={creative_directions} onSelect={onSelectCreative} />
              : <Skeleton />}
          </div>
        );

      case "style_wait":
        // Backward compat: old tasks still at style_wait
        return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} />}
            {RefImageCard}
            {style_options
              ? <StylePicker options={style_options} onSelect={onSelectStyle} />
              : <Skeleton />}
          </div>
        );

      case "recommend_wait":
        return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} collapsed />}
            {RefImageCard}
            {recommendation
              ? <RecommendationCard recommendation={recommendation} onConfirm={onConfirmRecommend} />
              : <Skeleton />}
          </div>
        );

      case "script_gen":
        return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} />}
            {RefImageCard}
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

      case "script_review": {
        const platformKeys = Object.keys(scripts || {});
        const activePlatform = platformKeys[editTab] || platformKeys[0];
        const readScripts = scripts?.[activePlatform] || [];
        const edited = editingScripts[activePlatform];
        const displayScripts = edited || readScripts;

        const handleShotChange = (i: number, updated: any) => {
          const current = edited ? [...edited] : [...readScripts];
          current[i] = updated;
          setEditingScripts(prev => ({ ...prev, [activePlatform]: current }));
        };

        const handleSave = async () => {
          if (!onUpdateScripts) return;
          setSavingScripts(true);
          const merged: Record<string, any[]> = {};
          for (const plat of platformKeys) {
            merged[plat] = editingScripts[plat] || scripts[plat];
          }
          await onUpdateScripts(merged);
          setSavingScripts(false);
          setEditingScripts({});
        };

        return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} collapsed />}
            <StageShell icon={Icon.doc} title="Review & Edit Script" subtitle={`${displayScripts.length} shots — edit scene, voiceover, subtitle, then confirm`}>
              {/* Platform tabs */}
              {platformKeys.length > 1 && (
                <div className="flex gap-1.5 mb-4">
                  {platformKeys.map((plat, i) => (
                    <button key={plat} onClick={() => setEditTab(i)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        i === editTab
                          ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                          : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                      }`}>
                      {plat}
                    </button>
                  ))}
                </div>
              )}

              {/* Editable shots */}
              <div className="space-y-3 mb-5">
                {displayScripts.map((shot: any, i: number) => (
                  <ScriptEditor key={i} shot={shot} index={i}
                    onChange={(updated: any) => handleShotChange(i, updated)} />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={savingScripts || !editingScripts[activePlatform]}
                  className="flex-1 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/40 text-zinc-300 font-medium text-sm hover:bg-zinc-700/50 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer">
                  {savingScripts ? "Saving..." : Object.keys(editingScripts).length > 0 ? "💾 Save Changes" : "Saved ✓"}
                </button>
                <button onClick={() => { onConfirmScripts?.(); }}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white font-bold text-sm tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-violet-500/20 cursor-pointer">
                  ✦ Confirm & Generate Video
                </button>
              </div>
            </StageShell>
          </div>
        );
      }

      case "preview_wait": {
        if (!scripts) return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} collapsed />}
            {RefImageCard}
            <StageShell icon={Icon.doc} title="Script & Storyboard" subtitle="AI is preparing your storyboard">
              <div className="flex items-center gap-4 mt-2">
                <Spinner />
                <div>
                  <p className="text-sm text-zinc-300">Loading storyboard data...</p>
                  <p className="text-xs text-zinc-500 mt-1">Scripts are being generated or restored</p>
                </div>
              </div>
            </StageShell>
          </div>
        );
        const platformKeys = Object.keys(scripts);
        const activePlatform = platformKeys[storyboardTab] || platformKeys[0];
        const generating = !preview_images || !preview_images[activePlatform] || preview_images[activePlatform].length === 0;
        return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} collapsed />}
            {RefImageCard}
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
              platform={activePlatform} onConfirm={onConfirmStoryboard} isGenerating={generating} />
          </div>
        );
      }

      case "video_gen": {
        const platformKeys = scripts ? Object.keys(scripts) : [];
        const activePlatform = platformKeys[0] || "tiktok";
        return (
          <div className="space-y-6 animate-in animate-in-1">
            {showProduct && <ProductAnalysis info={product_info} collapsed />}
            {/* Show storyboard with preview images */}
            {scripts && (
              <div>
                {platformKeys.length > 1 && (
                  <div className="flex gap-1.5 mb-4">
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
                  platform={activePlatform} isGenerating={false} hideConfirm={true} onConfirm={() => {}} />
              </div>
            )}
            {/* Video generation progress */}
            <StageShell icon={Icon.film} title="Video Rendering" subtitle="Seedance 2.0 is producing the final video">
              <div className="flex items-center gap-4 mt-2">
                <Spinner />
                <div>
                  <p className="text-sm text-zinc-300">Estimated 2–5 minutes...</p>
                  <p className="text-xs text-zinc-500 mt-1">Combining previews into cinematic video</p>
                </div>
              </div>
            </StageShell>
          </div>
        );
      }

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

function SpinnerMini() {
  return <div className="w-3 h-3 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin flex-shrink-0" />;
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

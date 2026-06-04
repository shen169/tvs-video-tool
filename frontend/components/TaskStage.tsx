"use client";
import { useState } from "react";
import ProductAnalysis from "./ProductAnalysis";
import CreativePicker from "./CreativePicker";
import StylePicker from "./StylePicker";
import StoryboardGallery from "./StoryboardGallery";
import VideoResult from "./VideoResult";

export default function TaskStage({
  task,
  onSelectCreative,
  onSelectStyle,
  onConfirmStoryboard,
}: {
  task: any;
  onSelectCreative: (d: any) => void;
  onSelectStyle: (s: any) => void;
  onConfirmStoryboard: () => void;
}) {
  const {
    stage,
    product_info,
    ref_image_url,
    uploaded_ref_image,
    creative_directions,
    style_options,
    scripts,
    preview_images,
    video_urls,
    error,
  } = task;

  const [storyboardTab, setStoryboardTab] = useState(0);

  // ── Always show product analysis once available ──
  const showProduct = product_info && stage !== "pending" && stage !== "fetching";

  // ── Stage-specific content ──
  const renderStageContent = () => {
    switch (stage) {
      case "pending":
      case "fetching":
        return <StageCard><div className="shimmer h-48 rounded-lg" /></StageCard>;

      case "ref_image":
        return (
          <>
            {showProduct && (
              <StageCard label="📦 产品分析">
                <ProductAnalysis info={product_info} />
              </StageCard>
            )}
            <StageCard label="🖼️ 产品参考图">
              {uploaded_ref_image ? (
                <img src={uploaded_ref_image} alt="参考图" className="w-full max-w-md rounded-lg border border-[#1f1f24]" />
              ) : ref_image_url && !ref_image_url.startsWith("__") ? (
                <img src={ref_image_url} alt="AI 生成参考图" className="w-full max-w-md rounded-lg border border-[#1f1f24]" />
              ) : (
                <p className="text-sm text-zinc-500">⏳ AI 正在生成白底商品图...</p>
              )}
            </StageCard>
          </>
        );

      case "creative_wait":
        return (
          <>
            {showProduct && (
              <StageCard label="📦 产品分析">
                <ProductAnalysis info={product_info} />
              </StageCard>
            )}
            {creative_directions ? (
              <CreativePicker directions={creative_directions} onSelect={onSelectCreative} />
            ) : (
              <StageCard><div className="shimmer h-32 rounded-lg" /></StageCard>
            )}
          </>
        );

      case "style_wait":
        return (
          <>
            {showProduct && (
              <StageCard label="📦 产品分析">
                <ProductAnalysis info={product_info} />
              </StageCard>
            )}
            {style_options ? (
              <StylePicker options={style_options} onSelect={onSelectStyle} />
            ) : (
              <StageCard><div className="shimmer h-32 rounded-lg" /></StageCard>
            )}
          </>
        );

      case "script_gen":
        return (
          <>
            {showProduct && (
              <StageCard label="📦 产品分析">
                <ProductAnalysis info={product_info} />
              </StageCard>
            )}
            <StageCard>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-600/10 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">AI 正在生成脚本和分镜...</p>
                  <p className="text-xs text-zinc-500 mt-0.5">根据产品卖点和目标人群定制中</p>
                </div>
              </div>
            </StageCard>
          </>
        );

      case "preview_wait": {
        if (!scripts) return <StageCard><p className="text-sm text-zinc-500">加载分镜预览...</p></StageCard>;
        const platformKeys = Object.keys(scripts);
        const activePlatform = platformKeys[storyboardTab] || platformKeys[0];

        return (
          <div className="space-y-6">
            {showProduct && (
              <StageCard label="📦 产品分析" collapsed>
                <ProductAnalysis info={product_info} />
              </StageCard>
            )}
            {/* Platform tabs */}
            {platformKeys.length > 1 && (
              <div className="flex gap-1">
                {platformKeys.map((plat, i) => (
                  <button
                    key={plat}
                    onClick={() => setStoryboardTab(i)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                      i === storyboardTab
                        ? "bg-emerald-600/10 text-emerald-400 border border-emerald-600/20"
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>
            )}
            <StoryboardGallery
              scripts={scripts}
              previewImages={preview_images}
              platform={activePlatform}
              onConfirm={onConfirmStoryboard}
            />
          </div>
        );
      }

      case "video_gen":
        return (
          <StageCard>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-600/10 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Seedance 正在生成视频</p>
                <p className="text-xs text-zinc-500 mt-0.5">预计 2-5 分钟，请稍候...</p>
              </div>
            </div>
          </StageCard>
        );

      case "done":
        return video_urls ? (
          <VideoResult videos={video_urls} />
        ) : (
          <StageCard><p className="text-sm text-zinc-500">完成</p></StageCard>
        );

      case "failed":
        return (
          <StageCard>
            <p className="text-sm text-red-400">✕ 任务失败</p>
            <p className="text-xs text-red-500/60 mt-1 whitespace-pre-wrap">{error}</p>
          </StageCard>
        );

      default:
        return <StageCard><p className="text-sm text-zinc-500">初始化中...</p></StageCard>;
    }
  };

  return <div className="space-y-6">{renderStageContent()}</div>;
}

function StageCard({
  children,
  label,
  collapsed,
}: {
  children: React.ReactNode;
  label?: string;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);

  return (
    <div className="rounded-xl bg-[#131316] border border-[#1f1f24] p-5">
      {label && (
        <div
          className={`text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3 flex items-center justify-between ${
            collapsed ? "cursor-pointer" : ""
          }`}
          onClick={collapsed ? () => setOpen(!open) : undefined}
        >
          <span>{label}</span>
          {collapsed && <span className="text-zinc-600">{open ? "▲" : "▼"}</span>}
        </div>
      )}
      {(!collapsed || open) && children}
    </div>
  );
}

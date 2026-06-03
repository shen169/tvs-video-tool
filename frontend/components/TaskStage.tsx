import ProductAnalysis from "./ProductAnalysis";
import CreativePicker from "./CreativePicker";
import StylePicker from "./StylePicker";
import StoryboardGallery from "./StoryboardGallery";
import VideoResult from "./VideoResult";

export default function TaskStage({ task, onSelectCreative, onSelectStyle, onConfirmStoryboard }: {
  task: any;
  onSelectCreative: (d: any) => void;
  onSelectStyle: (s: any) => void;
  onConfirmStoryboard: () => void;
}) {
  const { stage, product_info, ref_image_url, uploaded_ref_image, creative_directions, style_options, scripts, preview_images, video_urls, error } = task;

  switch (stage) {
    case "pending": case "fetching":
      return <StageCard><div className="shimmer h-48 rounded-lg" /></StageCard>;

    case "ref_image":
      return (
        <div className="space-y-6">
          <StageCard><ProductAnalysis info={product_info} /></StageCard>
          <StageCard label="产品参考图">
            {uploaded_ref_image
              ? <p className="text-sm text-emerald-400">✓ 使用上传的产品图</p>
              : <p className="text-sm text-zinc-500">正在 AI 生成白底商品图...</p>}
          </StageCard>
        </div>
      );

    case "creative_wait":
      return creative_directions
        ? <CreativePicker directions={creative_directions} onSelect={onSelectCreative} />
        : <StageCard><div className="shimmer h-32 rounded-lg" /></StageCard>;

    case "style_wait":
      return style_options
        ? <StylePicker options={style_options} onSelect={onSelectStyle} />
        : <StageCard><div className="shimmer h-32 rounded-lg" /></StageCard>;

    case "script_gen":
      return <StageCard><p className="text-sm text-zinc-500">正在生成脚本和分镜...</p><div className="shimmer h-4 w-2/3 mt-3 rounded" /></StageCard>;

    case "preview_wait":
      return scripts
        ? <StoryboardGallery scripts={scripts} platform="tiktok" onConfirm={onConfirmStoryboard} />
        : <StageCard><p className="text-sm text-zinc-500">加载分镜预览...</p></StageCard>;

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
      return video_urls ? <VideoResult videos={video_urls} /> : <StageCard><p className="text-sm text-zinc-500">完成</p></StageCard>;

    case "failed":
      return <StageCard><p className="text-sm text-red-400">✕ 任务失败</p><p className="text-xs text-red-500/60 mt-1">{error}</p></StageCard>;

    default:
      return <StageCard><p className="text-sm text-zinc-500">初始化中...</p></StageCard>;
  }
}

function StageCard({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="rounded-xl bg-[#131316] border border-[#1f1f24] p-5">
      {label && <h4 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">{label}</h4>}
      {children}
    </div>
  );
}

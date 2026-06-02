import ProductAnalysis from "./ProductAnalysis";
import CreativePicker from "./CreativePicker";
import StylePicker from "./StylePicker";
import StoryboardGallery from "./StoryboardGallery";
import VideoResult from "./VideoResult";

export default function TaskStage({ task, onSelectStyle, onSelectCreative, onConfirmStoryboard }: { task: any; onSelectStyle: (s: any) => void; onSelectCreative: (d: any) => void; onConfirmStoryboard: () => void }) {
  const {
    stage,
    product_info,
    style_options,
    scripts,
    preview_images,
    video_urls,
    ref_image_url,
    uploaded_ref_image,
    error,
  } = task;

  switch (stage) {
    case "pending":
    case "fetching":
      return <ProductAnalysis info={null} />;
    case "ref_image":
      return (
        <div className="space-y-4">
          <ProductAnalysis info={product_info} />
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700">
            <h4 className="text-sm font-bold mb-2">产品参考图</h4>
            {uploaded_ref_image ? (
              <div className="text-green-400 text-sm">✅ 使用你上传的产品图</div>
            ) : ref_image_url?.startsWith?.("__AI_GEN__:") ? (
              <div className="text-blue-400 text-sm">🤖 AI 正在生成白底商品图...</div>
            ) : (
              <div className="text-zinc-500 animate-pulse">等待参考图...</div>
            )}
          </div>
        </div>
      );
    case "creative_wait":
      return task.creative_directions ? (
        <CreativePicker directions={task.creative_directions} onSelect={onSelectCreative} />
      ) : <div className="text-zinc-400 animate-pulse">正在生成创意方向...</div>;
    case "style_wait":
      return style_options ? (
        <StylePicker options={style_options} onSelect={onSelectStyle} />
      ) : (
        <div className="text-zinc-400 animate-pulse">正在生成风格选项...</div>
      );
    case "script_gen":
      return <div className="text-zinc-400 animate-pulse">正在生成脚本和分镜...</div>;
    case "preview_wait":
      return scripts ? (
        <StoryboardGallery scripts={scripts} platform="tiktok" onConfirm={onConfirmStoryboard} />
      ) : (
        <div className="text-zinc-400 animate-pulse">正在生成分镜预览...</div>
      );
    case "video_gen":
      return (
        <div className="text-zinc-400 animate-pulse">
          🎬 Seedance 正在生成视频，预计 2-5 分钟...
        </div>
      );
    case "done":
      return video_urls ? (
        <VideoResult videos={video_urls} />
      ) : (
        <div className="text-zinc-400">完成</div>
      );
    case "failed":
      return <div className="text-red-400">❌ 任务失败：{error}</div>;
    default:
      return <div className="text-zinc-400 animate-pulse">正在初始化...</div>;
  }
}

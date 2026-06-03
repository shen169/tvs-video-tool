"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/lib/api";

const PLATFORMS = [
  { key: "tiktok", label: "TikTok", desc: "9:16 竖屏 · 快节奏" },
  { key: "amazon", label: "Amazon", desc: "16:9 横屏 · 产品展示" },
  { key: "youtube", label: "YouTube", desc: "9:16 竖屏 · 信息流" },
  { key: "instagram", label: "Instagram", desc: "9:16 竖屏 · 视觉驱动" },
];

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [platforms, setPlatforms] = useState(["tiktok", "amazon", "youtube", "instagram"]);
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const togglePlatform = (key: string) => {
    setPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    try {
      const { task_id } = await createTask(url, platforms, image || undefined);
      router.push(`/task/${task_id}`);
    } catch (e: any) {
      setError(e.message || "创建任务失败");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-10 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">新建带货视频</h1>
        <p className="text-sm text-zinc-500 mt-1.5">粘贴产品链接，AI 自动生成多平台视频</p>
      </div>

      <div className="space-y-8">
        {/* Product URL */}
        <section>
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 block">产品链接</label>
          <div className="relative">
            <input
              className="w-full h-14 px-5 rounded-xl bg-[#131316] border border-[#1f1f24] text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-emerald-600/50 focus:ring-1 focus:ring-emerald-600/20 transition-all"
              placeholder="粘贴 Amazon / Shopify / 电商链接..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className={`w-2 h-2 rounded-full ${url ? "bg-emerald-500 pulse-ring" : "bg-zinc-700"}`} />
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section>
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 block">目标平台</label>
          <div className="grid grid-cols-4 gap-3">
            {PLATFORMS.map((p) => {
              const active = platforms.includes(p.key);
              return (
                <button
                  key={p.key}
                  onClick={() => togglePlatform(p.key)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    active
                      ? "border-emerald-600/40 bg-emerald-600/5 text-zinc-100"
                      : "border-[#1f1f24] bg-[#131316] text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
                  }`}
                >
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-[10px] mt-1 opacity-60">{p.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Reference Image */}
        <section>
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 block">产品参考图 · 可选</label>
          <label className={`relative flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
            image
              ? "border-emerald-600/50 bg-emerald-600/5"
              : "border-[#1f1f24] bg-[#131316] hover:border-zinc-600"
          }`}>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
            {image ? (
              <div className="text-center">
                <div className="text-emerald-400 font-medium text-sm">{image.name}</div>
                <div className="text-zinc-600 text-xs mt-1">点击更换</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-2xl mb-1 opacity-30">⌘</div>
                <div className="text-zinc-500 text-sm">拖拽图片到此处 或 点击上传</div>
                <div className="text-zinc-600 text-xs mt-1">不传则 AI 自动生成白底商品图</div>
              </div>
            )}
          </label>
        </section>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !url}
          className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#1f1f24] disabled:text-zinc-600 text-white font-semibold text-sm tracking-wide transition-all duration-200 active:scale-[0.99]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              创建任务中...
            </span>
          ) : (
            "开始生成视频  ⌘↵"
          )}
        </button>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/lib/api";

const PLATFORMS = [
  { key: "tiktok", label: "TikTok" },
  { key: "amazon", label: "Amazon" },
  { key: "youtube", label: "YouTube Shorts" },
  { key: "instagram", label: "Instagram Reels" },
];

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [platforms, setPlatforms] = useState(["tiktok", "amazon", "youtube", "instagram"]);
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const togglePlatform = (key: string) => {
    setPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const [error, setError] = useState("");

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
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-6">
        <h1 className="text-3xl font-bold text-center">TVS Video Tool</h1>
        <p className="text-zinc-400 text-center">粘贴产品链接，生成多平台带货视频</p>

        <input
          className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500"
          placeholder="产品链接 (Amazon / Shopify / ...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => togglePlatform(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                platforms.includes(p.key)
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <label className={`block p-6 rounded-xl border-2 border-dashed cursor-pointer transition text-center ${
          image ? "border-green-500 bg-green-500/10" : "border-zinc-600 hover:border-zinc-400 bg-zinc-900"
        }`}>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
          {image ? (
            <div className="space-y-1">
              <div className="text-2xl">📸</div>
              <div className="text-green-400 font-medium">{image.name}</div>
              <div className="text-xs text-zinc-500">点击更换图片</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-3xl">🖼️</div>
              <div className="text-zinc-300 font-medium">上传产品参考图</div>
              <div className="text-xs text-zinc-500">可选 · 不传则 AI 自动生成白底商品图</div>
              <div className="text-xs text-zinc-600">点击选择图片 或 拖拽到此处</div>
            </div>
          )}
        </label>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-sm">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !url}
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold text-lg transition"
        >
          {loading ? "创建中..." : "开始生成视频"}
        </button>
      </div>
    </main>
  );
}

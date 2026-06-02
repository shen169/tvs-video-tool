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

  const handleSubmit = async () => {
    if (!url) return;
    setLoading(true);
    const { task_id } = await createTask(url, platforms, image || undefined);
    router.push(`/task/${task_id}`);
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

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700">
          <label className="text-sm text-zinc-400">产品参考图（可选，不传则 AI 自动生成）</label>
          <input
            type="file"
            accept="image/*"
            className="mt-2 text-sm text-zinc-300"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </div>

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

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/lib/api";

const PLATFORMS = [
  { key: "tiktok", label: "TikTok", desc: "9:16 · Fast-paced", color: "from-pink-500/10 to-rose-500/5 border-pink-500/15 hover:border-pink-500/30" },
  { key: "amazon", label: "Amazon", desc: "16:9 · Product showcase", color: "from-amber-500/10 to-orange-500/5 border-amber-500/15 hover:border-amber-500/30" },
  { key: "youtube", label: "YouTube", desc: "9:16 · Informational", color: "from-red-500/10 to-rose-500/5 border-red-500/15 hover:border-red-500/30" },
  { key: "instagram", label: "Instagram", desc: "9:16 · Visual-driven", color: "from-violet-500/10 to-purple-500/5 border-violet-500/15 hover:border-violet-500/30" },
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
    if (platforms.length === 0) { setError("Select at least one platform"); return; }
    setLoading(true); setError("");
    try {
      const { task_id } = await createTask(url, platforms, image || undefined);
      router.push(`/task/${task_id}`);
    } catch (e: any) { setError(e.message || "Failed to create task"); setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-8 py-14">
      {/* Hero */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/15">
            AI-Powered
          </span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-100 tracking-tight leading-tight">
          Create Product Videos<br />
          <span className="text-amber-400">in Seconds</span>
        </h1>
        <p className="text-sm text-zinc-500 mt-3 max-w-md leading-relaxed">
          Paste a product link. AI analyzes, writes scripts, generates previews, and produces videos for every platform.
        </p>
      </div>

      <div className="space-y-8 animate-in animate-in-1">
        {/* URL Input */}
        <section>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
            Product Link
          </label>
          <div className="relative">
            <input
              className="w-full h-14 px-5 rounded-2xl bg-[#121214] border border-[#27272c] text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/10 transition-all duration-300"
              placeholder="Paste Amazon / Shopify / e-commerce link..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${url ? "bg-amber-500 pulse-ring" : "bg-zinc-700"}`} />
            </div>
          </div>
        </section>

        {/* Platform Selector */}
        <section>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
            Target Platforms
          </label>
          <div className="grid grid-cols-4 gap-3">
            {PLATFORMS.map((p) => {
              const active = platforms.includes(p.key);
              return (
                <button key={p.key} onClick={() => togglePlatform(p.key)}
                  className={`p-4 rounded-2xl border text-left transition-all duration-300 card-lift ${
                    active
                      ? `bg-gradient-to-br ${p.color} text-zinc-100`
                      : "border-[#27272c] bg-[#121214] text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  <div className="text-sm font-semibold">{p.label}</div>
                  <div className="text-[10px] mt-1 opacity-60">{p.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Image Upload */}
        <section>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
            Reference Image · <span className="text-zinc-600 font-normal">optional</span>
          </label>
          <label className={`relative flex flex-col items-center justify-center h-28 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
            image ? "border-amber-500/30 bg-amber-500/[0.02]" : "border-[#27272c] bg-[#121214] hover:border-zinc-600"
          }`}>
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => setImage(e.target.files?.[0] || null)} />
            {image ? (
              <div className="text-center">
                <div className="text-amber-400 font-medium text-sm">{image.name}</div>
                <div className="text-zinc-600 text-xs mt-1">Click to change</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-xl mb-1 opacity-20">⌘</div>
                <div className="text-zinc-500 text-sm">Drop image or click to upload</div>
                <div className="text-zinc-600 text-xs mt-1">AI auto-generates if left empty</div>
              </div>
            )}
          </label>
        </section>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/15 text-red-400 text-sm">{error}</div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading || !url || platforms.length === 0}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-[#1c1c20] disabled:to-[#1c1c20] disabled:text-zinc-600 text-black font-bold text-sm tracking-wide transition-all duration-300 active:scale-[0.98] shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Creating task...
            </span>
          ) : (
            "Generate Video ✦"
          )}
        </button>
      </div>
    </div>
  );
}

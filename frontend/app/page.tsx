"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTask, getStoredToken } from "@/lib/api";

const PLATFORMS = [
  { key: "tiktok", label: "TikTok Shop", desc: "9:16 · Fast-paced hooks", color: "from-pink-500/10 to-rose-500/5 border-pink-500/15 hover:border-pink-500/30" },
  { key: "amazon", label: "Amazon", desc: "16:9 · Product showcase", color: "from-amber-500/10 to-orange-500/5 border-amber-500/15 hover:border-amber-500/30" },
  { key: "youtube", label: "YouTube Shorts", desc: "9:16 · Informational", color: "from-red-500/10 to-rose-500/5 border-red-500/15 hover:border-red-500/30" },
  { key: "instagram", label: "Instagram Reels", desc: "9:16 · Visual-driven", color: "from-violet-500/10 to-purple-500/5 border-violet-500/15 hover:border-violet-500/30" },
];

const PIPELINE_STEPS = [
  { step: "01", title: "贴入产品链接", desc: "支持 Amazon、Shopify 及任意电商链接。AI 自动抓取产品标题、价格、图片、卖点、用户评价。" },
  { step: "02", title: "AI 分析产品卖点", desc: "DeepSeek 大模型分析目标人群、痛点场景、使用场景、Hook 角度，产出创意洞察。" },
  { step: "03", title: "智能推荐视频风格", desc: "AI 基于品类 + 平台特性，推荐 8 维度风格组合：视频类型、视觉风格、运镜、灯光、场景、色调、音乐、人物方案。" },
  { step: "04", title: "生成分镜脚本", desc: "6 种视频叙事结构（痛点解决/真实分享/TVC 大片/场景生活/对比测评/开箱体验）× 6 镜详细分镜。每镜含景别、运镜、旁白、字幕。" },
  { step: "05", title: "预览图确认构图", desc: "DeepSeek 为每镜撰写 Seedream 生图 prompt，生成 6 张 9:16 预览图。确认构图和画面后再生成视频。" },
  { step: "06", title: "Seedance 2.0 一键出片", desc: "火山引擎 Seedance 2.0 1080P 视频生成。支持背景音乐、AI 旁白配音。15 秒成片，多平台同步输出。" },
];

const PAIN_POINTS = [
  { icon: "💰", title: "视频制作成本高", desc: "外包一条带货视频 ¥500-2000，团队剪辑耗时半天。现在 ¥23/条，5 分钟出片。" },
  { icon: "⏰", title: "多平台适配繁琐", desc: "TikTok 9:16、Amazon 16:9、YouTube Shorts、Instagram Reels — 每个平台尺寸、节奏、文案不同。一次输入，同步生成四平台版本。" },
  { icon: "🎬", title: "缺乏创意方向", desc: "不知道拍什么？AI 分析产品后自动推荐 6 种视频类型 × 5 维视觉风格，给出具体的 Hook 文案和叙事结构。" },
  { icon: "🌍", title: "语言和文化壁垒", desc: "做跨境电商面向海外市场，英语脚本不会写？AI 自动生成地道英文旁白和字幕，Native-level 表达。" },
];

const TARGET_USERS = [
  { title: "Amazon 卖家", desc: "主图视频是转化率的关键。AI 自动分析 Listing，生成符合 Amazon 规范的 16:9 产品展示视频。" },
  { title: "TikTok Shop 商家", desc: "快节奏 Hook + 痛点展示 + 产品解决 + CTA，完整带货脚本，3 秒抓住用户注意力。" },
  { title: "独立站 / Shopify 运营", desc: "产品详情页视频、社交媒体素材、广告素材 — 一个链接全部搞定，降低内容生产成本 90%。" },
  { title: "跨境电商代运营", desc: "批量生产多店铺、多产品视频。团队套餐 30 条视频 ¥499，单条 ¥16.6，规模化内容生产。" },
];

const FAQS = [
  { q: "支持哪些产品品类？", a: "全品类支持。家居、电子、美妆、运动、宠物、厨房、工具、服饰……AI 自动识别品类并匹配最适合的视频风格和叙事结构。" },
  { q: "生成的视频可以商用吗？", a: "完全可以。Seedance 2.0 生成的视频无版权限制，你用在自己的 Amazon Listing、TikTok 账号、广告投放中均不受限。" },
  { q: "需要自己准备文案和素材吗？", a: "不需要。只需要一个产品链接。AI 自动抓取产品信息、撰写脚本、生成预览图、渲染视频。你也可以上传参考图让 AI 基于你的产品图生成。" },
  { q: "15 秒视频够用吗？", a: "TikTok 和 Shorts 的最佳时长就是 9-15 秒。Amazon 主图视频通常 15-30 秒。目前 15 秒覆盖主流场景，后续会开放更长时长。" },
  { q: "不满意可以重做吗？", a: "可以。在预览图阶段你可以回退到任意步骤调整——换风格、改脚本、重新生成预览图。确认满意后再扣点生成视频。" },
  { q: "和雇人拍视频比有什么优势？", a: "速度：5 分钟 vs 3-7 天。成本：¥23/条 vs ¥500-2000/条。规模：一个人日均可产出 50+ 条视频 vs 1-2 条。一致性：AI 风格统一，品牌视觉连贯。" },
];

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [platforms, setPlatforms] = useState(["tiktok"]);
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    if (!token && !document.cookie.includes("tvs_auth=")) {
      console.log("Tip: register an account to save your credits and video history.");
    }
  }, []);

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
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Hero — Product Value Proposition                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-5">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/15">
            AI-Powered · Seedance 2.0
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight leading-tight">
          跨境电商<span className="text-amber-400"> AI 带货视频</span>生成器
        </h1>
        <p className="text-sm md:text-base text-zinc-400 mt-4 max-w-2xl mx-auto leading-relaxed">
          粘贴 Amazon / Shopify 产品链接，AI 自动抓取产品信息、分析卖点与目标人群、
          匹配视频风格、生成分镜脚本与预览图，调用火山引擎 Seedance 2.0 一键输出
          1080P 带货视频。覆盖 TikTok Shop · Amazon · YouTube Shorts · Instagram Reels 四大平台。
        </p>
        <div className="flex items-center justify-center gap-6 mt-5 text-xs text-zinc-500">
          <span>⚡ 5 分钟出片</span>
          <span>🎬 6 种视频类型</span>
          <span>🌍 英文原生旁白</span>
          <span>💰 ¥23/条起</span>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Interactive Form                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section aria-label="Create video" className="space-y-6 animate-in animate-in-1">
        {/* URL Input */}
        <div>
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
        </div>

        {/* Platform Selector */}
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
            Target Platforms
          </label>
          <div className="grid grid-cols-4 gap-3">
            {PLATFORMS.map((p) => {
              const active = platforms.includes(p.key);
              return (
                <button key={p.key} onClick={() => togglePlatform(p.key)}
                  className={`p-4 rounded-2xl border text-left transition-all duration-300 card-lift cursor-pointer ${
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
        </div>

        {/* Image Upload */}
        <div>
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
        </div>

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
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Divider                                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="my-16 h-px bg-gradient-to-r from-transparent via-zinc-700/40 to-transparent" />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section: Pain Points — Who needs this and why             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section aria-labelledby="pain-points-heading" className="mb-16">
        <h2 id="pain-points-heading" className="text-xl font-bold text-zinc-100 text-center mb-2">
          跨境电商卖家做视频的四大痛点
        </h2>
        <p className="text-sm text-zinc-500 text-center mb-8">
          每条都踩过的坑，现在 AI 帮你填
        </p>
        <div className="grid grid-cols-2 gap-4">
          {PAIN_POINTS.map((item) => (
            <article key={item.title} className="p-5 rounded-2xl bg-[#121214] border border-[#27272c] hover:border-zinc-600 transition-all">
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">{item.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section: How It Works — 6-step pipeline                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section aria-labelledby="how-it-works-heading" className="mb-16">
        <h2 id="how-it-works-heading" className="text-xl font-bold text-zinc-100 text-center mb-2">
          从产品链接到视频成片，6 步全自动
        </h2>
        <p className="text-sm text-zinc-500 text-center mb-8">
          AI 驱动的内容管线，每一步都基于真实产品数据
        </p>
        <div className="space-y-3">
          {PIPELINE_STEPS.map((item) => (
            <div key={item.step} className="flex items-start gap-4 p-4 rounded-2xl bg-[#121214] border border-[#27272c] hover:border-zinc-600 transition-all">
              <span className="text-amber-400 font-mono text-sm font-bold w-8 flex-shrink-0 pt-0.5">{item.step}</span>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">{item.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section: Who Is It For                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section aria-labelledby="target-users-heading" className="mb-16">
        <h2 id="target-users-heading" className="text-xl font-bold text-zinc-100 text-center mb-2">
          谁在用 TVS Video Tool
        </h2>
        <p className="text-sm text-zinc-500 text-center mb-8">
          从个人卖家到代运营团队，不同角色不同用法
        </p>
        <div className="grid grid-cols-2 gap-4">
          {TARGET_USERS.map((item) => (
            <article key={item.title} className="p-5 rounded-2xl bg-[#121214] border border-[#27272c] hover:border-zinc-600 transition-all">
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">{item.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Section: FAQ                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section aria-labelledby="faq-heading" className="mb-16">
        <h2 id="faq-heading" className="text-xl font-bold text-zinc-100 text-center mb-2">
          常见问题
        </h2>
        <p className="text-sm text-zinc-500 text-center mb-8">
          关于 AI 视频生成的常见疑问
        </p>
        <div className="space-y-3">
          {FAQS.map((item) => (
            <details key={item.q} className="group p-5 rounded-2xl bg-[#121214] border border-[#27272c] cursor-pointer hover:border-zinc-600 transition-all">
              <summary className="text-sm font-medium text-zinc-300 group-open:text-amber-400 transition-colors list-none marker:content-none flex items-center justify-between">
                {item.q}
                <span className="text-zinc-600 group-open:rotate-45 transition-transform text-lg">+</span>
              </summary>
              <p className="text-xs text-zinc-500 leading-relaxed mt-3 pl-0">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Footer                                                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <footer className="text-center pt-8 border-t border-[#1c1c20]">
        <p className="text-xs text-zinc-600">
          Powered by Seedance 2.0 · Seedream 5.0 · DeepSeek · Volcano Engine Ark
        </p>
        <p className="text-[10px] text-zinc-700 mt-1">
          AI-generated videos for e-commerce · TikTok Shop · Amazon · YouTube Shorts · Instagram Reels
        </p>
      </footer>
    </div>
  );
}

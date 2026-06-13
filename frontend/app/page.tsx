import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-14">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Hero */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header className="text-center mb-16">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/15">
            AI-Powered · Seedance 2.0
          </span>
        </div>

        <h1 className="text-3xl md:text-5xl font-bold text-zinc-100 tracking-tight leading-tight max-w-3xl mx-auto">
          跨境电商<span className="text-amber-400"> AI 带货视频</span>生成器
        </h1>

        <p className="text-base md:text-lg text-zinc-400 mt-5 max-w-2xl mx-auto leading-relaxed">
          粘贴 Amazon / Shopify 产品链接，AI 自动分析卖点与目标人群、匹配 8 维视频风格、
          生成分镜脚本与预览图、调用火山引擎 Seedance 2.0 一键出片。覆盖 TikTok Shop · Amazon ·
          YouTube Shorts · Instagram Reels 四大平台，英文原生旁白，¥23/条起。
        </p>

        <div className="flex items-center justify-center gap-6 mt-6 text-sm text-zinc-500">
          <span>⚡ 5 分钟从链接到成片</span>
          <span>🎬 6 种视频叙事类型</span>
          <span>🌍 Native English 旁白</span>
          <span>💳 ¥23/条 · 按量计费</span>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20"
          >
            立即开始 ✦
          </Link>
          <Link
            href="/features"
            className="px-6 py-3 rounded-2xl border border-[#27272c] bg-[#121214] text-zinc-400 hover:text-zinc-200 text-sm transition-all"
          >
            了解更多 ↓
          </Link>
        </div>
      </header>

      <div className="my-8 h-px bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent" />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CTA */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="text-center py-12 rounded-3xl bg-gradient-to-br from-amber-500/5 to-amber-600/5 border border-amber-500/10">
        <h2 className="text-2xl font-bold text-zinc-100 mb-3">准备好生成你的第一条 AI 带货视频了吗？</h2>
        <p className="text-sm text-zinc-400 mb-8 max-w-lg mx-auto">
          新用户注册即享免费体验额度。无需信用卡，无需签约，粘贴链接即可开始。
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20"
          >
            免费开始 ✦
          </Link>
          <Link
            href="/login"
            className="px-6 py-3.5 rounded-2xl border border-[#27272c] bg-[#121214] text-zinc-400 hover:text-zinc-200 text-sm transition-all"
          >
            查看定价 →
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Footer */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <footer className="text-center pt-12 mt-16 border-t border-[#1c1c20]">
        <div className="flex items-center justify-center gap-6 mb-4">
          <Link href="/features" className="text-xs text-zinc-500 hover:text-amber-400 transition-colors">
            How It Works
          </Link>
          <Link href="/login" className="text-xs text-zinc-500 hover:text-amber-400 transition-colors">
            Get Started
          </Link>
        </div>
        <p className="text-xs text-zinc-600">
          Powered by Seedance 2.0 · Seedream 5.0 · DeepSeek · Volcano Engine Ark
        </p>
        <p className="text-xs text-zinc-700 mt-2">
          AI-generated videos for cross-border e-commerce · TikTok Shop · Amazon · YouTube Shorts · Instagram Reels
        </p>
      </footer>
    </div>
  );
}

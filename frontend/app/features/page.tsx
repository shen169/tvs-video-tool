import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TVS Video Tool — 跨境电商 AI 带货视频生成器 · 功能详解",
  description:
    "从产品链接到多平台视频成片，6 步全自动 AI 管线。6 种视频叙事结构、8 维视觉风格、4 平台同步生成。深度了解 TVS 如何帮跨境电商卖家降低 90% 视频制作成本。",
  openGraph: {
    title: "TVS Video Tool — AI 带货视频功能详解",
    description:
      "6 步全自动：产品抓取 → AI 分析 → 风格推荐 → 分镜脚本 → 预览图 → Seedance 2.0 出片。覆盖 TikTok Shop · Amazon · YouTube Shorts · Instagram Reels。",
  },
};

const PAIN_POINTS = [
  { icon: "💰", title: "视频制作成本高", desc: "外包一条带货视频 ¥500–2,000，团队剪辑耗时半天。TVS AI 将成本压到 ¥23/条，5 分钟出片，效率提升 100 倍。" },
  { icon: "⏰", title: "多平台适配繁琐", desc: "TikTok 9:16、Amazon 16:9、YouTube Shorts、Instagram Reels — 每个平台尺寸、节奏、文案不同。一次输入产品链接，AI 同步生成四平台适配版本。" },
  { icon: "🎬", title: "缺乏创意方向", desc: "不知道拍什么风格？AI 基于产品品类自动推荐 6 种视频类型 × 8 维视觉风格（运镜、灯光、场景、色调、音乐、人物……），并给出可直接拍摄的分镜脚本。" },
  { icon: "🌍", title: "非英语市场的语言壁垒", desc: "做跨境电商面向欧美消费者，英语脚本不会写？DeepSeek 大模型自动生成地道 Native-level 英文旁白和字幕，转化率不打折。" },
];

const PIPELINE_STEPS = [
  { step: "01", title: "贴入产品链接", desc: "支持 Amazon、Shopify 及任意电商 URL。AI 自动抓取产品标题、价格、图片、Bullet Points、用户评价，结构化提取关键信息。" },
  { step: "02", title: "AI 分析产品卖点与人群", desc: "DeepSeek 大模型深度分析：目标人群画像、情感痛点、使用场景、独特卖点、视频 Hook 角度。产出可直接用于脚本创作的创意洞察报告。" },
  { step: "03", title: "智能推荐视频风格", desc: "AI 基于产品品类 + 目标平台特性，一次性推荐 8 个维度的最佳组合：视频类型、视觉风格、运镜方式、灯光方案、拍摄角度、人物方案、场景、色调、背景音乐。" },
  { step: "04", title: "生成 6 镜分镜脚本", desc: "6 种视频叙事结构（痛点解决 · 真实分享 · TVC 质感大片 · 场景生活 · 对比测评 · 开箱体验），每种 6 镜详细分镜。每镜包含：景别、运镜、灯光、场景描述、旁白文案、字幕文案。" },
  { step: "05", title: "AI 预览图确认构图", desc: "DeepSeek 将每镜分镜转为 Seedream 5.0 生图 prompt，调用火山引擎生成 6 张 9:16 写实预览图。在生成视频前确认画面构图、光影、产品呈现效果。" },
  { step: "06", title: "Seedance 2.0 一键出片", desc: "确认后调用火山引擎 Seedance 2.0 生成 1080P 视频。15 秒成片，支持背景音乐生成、AI 语音旁白。多平台同步输出，扣点后自动渲染。" },
];

const VIDEO_TYPES = [
  { name: "痛点解决型", desc: "展示用户痛点 → 产品介入 → 问题解决。适用于功能性产品（健康、工具、家居）", icon: "💡" },
  { name: "真实分享型", desc: "用户第一人称视角，生活化口吻分享使用体验。适用于社交属性强的品类", icon: "📱" },
  { name: "TVC 质感大片", desc: "电影级光影、慢镜头、高饱和度。适用于高端品牌、科技产品", icon: "🎥" },
  { name: "场景生活型", desc: "产品融入理想生活场景。适用于家居、厨具、生活方式品类", icon: "🏠" },
  { name: "对比测评型", desc: "使用前后对比、A vs B 对比。适用于美妆护肤、清洁产品", icon: "⚖️" },
  { name: "开箱体验型", desc: "开箱过程 + 第一印象 + 细节特写。适用于电子产品、配件", icon: "📦" },
];

const PLATFORM_SPECS = [
  { name: "TikTok Shop", ratio: "9:16", duration: "9–12 秒", tone: "快节奏 · 3 秒 Hook · 强 CTA", desc: "针对 TikTok 算法优化的带货视频，强调前 3 秒抓注意力，快速展示痛点+产品解决，引导点击购物车。" },
  { name: "Amazon", ratio: "16:9", duration: "15 秒", tone: "专业展示 · 信任建立 · 功能说明", desc: "符合 Amazon 主图视频规范，侧重产品细节展示、功能演示和信任感建立，提升 Listing 转化率。" },
  { name: "YouTube Shorts", ratio: "9:16", duration: "12–15 秒", tone: "信息丰富 · 教育属性 · 自然过渡", desc: "YouTube Shorts 算法偏好信息量大的内容，脚本侧重产品知识+使用技巧，兼具娱乐性和教育性。" },
  { name: "Instagram Reels", ratio: "9:16", duration: "9–12 秒", tone: "视觉驱动 · 美学优先 · 品牌调性", desc: "Instagram 用户对画质和审美要求更高，视觉风格偏向 lifestyle 美学，强调品牌调性一致性。" },
];

const TARGET_USERS = [
  { title: "Amazon 卖家", desc: "主图视频是 Listing 转化率的关键变量。TVS 自动分析产品数据，生成符合 Amazon 规范的 16:9 产品展示视频 — 产品特写、功能演示、场景使用、CTA 结尾。" },
  { title: "TikTok Shop 商家", desc: "TikTok 的「内容即货架」模式下，视频就是你的店铺入口。TVS 生成的 9:16 快节奏带货视频自带 Hook、痛点展示、产品解决、购物引导四段式结构。" },
  { title: "独立站 / Shopify 运营", desc: "产品详情页视频、社交媒体素材、广告投放素材 — 一个产品链接全部搞定。将内容生产成本降低 90%，让独立站运营把时间花在选品和投放上。" },
  { title: "跨境电商代运营", desc: "管理 10+ 店铺、50+ 产品线？专业套餐 30 条视频 ¥499（¥16.6/条），批量出片、风格统一、支持 rollback 反复修改。一个人替代一个视频团队。" },
];

const FAQS = [
  { q: "支持哪些产品品类？", a: "全品类。家居、电子、美妆、运动、宠物、厨房、工具、服饰、健康、母婴……AI 自动识别品类并匹配最适合的视频叙事结构。非标品同样适用，AI 会根据产品描述调整脚本逻辑。" },
  { q: "生成的视频可以商用吗？", a: "完全商用。Seedance 2.0 生成的视频无版权限制。你可以在 Amazon Listing、TikTok 账号、广告投放（Facebook/Google/TikTok Ads）、独立站详情页中使用，无任何额外费用。" },
  { q: "需要自己准备素材和文案吗？", a: "不需要。唯一需要的是一个产品链接。AI 自动：抓取产品信息 → 分析卖点 → 撰写英文脚本 → 生成预览图 → 渲染视频。你也可以上传产品图（白底图最佳）替换 AI 自动抓取的图片。" },
  { q: "不满意能改吗？", a: "能。全流程可干预：风格推荐阶段可手动调整任意维度、分镜脚本可逐镜编辑旁白和字幕、预览图不满意可重新生成。确认满意后才扣点生成视频。扣点后 rollback 重来不重复扣费。" },
  { q: "一个视频多长时间？", a: "当前支持 4–15 秒。TikTok 和 Shorts 最佳时长 9–15 秒，Amazon 主图视频建议 15 秒。后续版本将支持更长时长（最长 30 秒）。" },
  { q: "和雇人拍视频比有什么优势？", a: "速度：5 分钟 vs 3–7 天。成本：¥23/条 vs ¥500–2,000/条。规模：单人日产 50+ 条 vs 1–2 条。一致性：AI 风格统一，品牌视觉连贯。灵活性：随时改脚本、换风格，不涉及沟通成本和排期。" },
  { q: "Seedance 2.0 是什么？", a: "字节跳动火山引擎推出的 AI 视频生成模型。支持文生视频（Text-to-Video）和图生视频（Image-to-Video），1080P 输出，24fps。TVS 是首批集成 Seedance 2.0 API 的视频工具之一。" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TVS Video Tool",
  applicationCategory: "Multimedia",
  operatingSystem: "Web",
  description:
    "AI-powered video creation tool for cross-border e-commerce. Paste a product link, AI analyzes, recommends styles, generates storyboards, and outputs shoppable videos for TikTok Shop, Amazon, YouTube Shorts, and Instagram Reels.",
  offers: {
    "@type": "Offer",
    price: "23",
    priceCurrency: "CNY",
    unitText: "/video",
  },
};

export default function FeaturesPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Page Header */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header className="text-center mb-16">
        <h1 className="text-3xl md:text-5xl font-bold text-zinc-100 tracking-tight leading-tight">
          TVS Video Tool{" "}
          <span className="text-amber-400">功能详解</span>
        </h1>
        <p className="text-base text-zinc-400 mt-4 max-w-2xl mx-auto leading-relaxed">
          深入了解 AI 如何从产品链接自动生成多平台带货视频 —
          每一步都基于真实电商数据和 AI 推理，不是模板填空。
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20"
          >
            立即开始 ✦
          </Link>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Pain Points */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section aria-labelledby="pain-heading" className="mb-20">
        <h2 id="pain-heading" className="text-2xl font-bold text-zinc-100 text-center mb-3">
          跨境电商卖家做视频的四大困境
        </h2>
        <p className="text-sm text-zinc-500 text-center mb-10">
          每条都踩过。TVS 用 AI 把这些问题一次性解决。
        </p>
        <div className="grid grid-cols-2 gap-5">
          {PAIN_POINTS.map((item) => (
            <article key={item.title} className="p-6 rounded-2xl bg-[#121214] border border-[#27272c] hover:border-zinc-600 transition-colors">
              <div className="text-3xl mb-4">{item.icon}</div>
              <h3 className="text-base font-semibold text-zinc-200 mb-3">{item.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* How It Works */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section aria-labelledby="how-heading" className="mb-20">
        <h2 id="how-heading" className="text-2xl font-bold text-zinc-100 text-center mb-3">
          从产品链接到视频成片，6 步全自动
        </h2>
        <p className="text-sm text-zinc-500 text-center mb-10">
          AI 驱动的内容生产管线 — 每个环节都基于真实的电商产品数据和 AI 推理
        </p>
        <div className="space-y-4">
          {PIPELINE_STEPS.map((item) => (
            <div key={item.step} className="flex items-start gap-5 p-5 rounded-2xl bg-[#121214] border border-[#27272c] hover:border-zinc-600 transition-colors">
              <span className="text-amber-400 font-mono text-lg font-bold w-10 flex-shrink-0 pt-0.5">{item.step}</span>
              <div>
                <h3 className="text-base font-semibold text-zinc-200 mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Video Types */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section aria-labelledby="types-heading" className="mb-20">
        <h2 id="types-heading" className="text-2xl font-bold text-zinc-100 text-center mb-3">
          6 种带货视频叙事结构
        </h2>
        <p className="text-sm text-zinc-500 text-center mb-10">
          AI 根据产品品类自动选择最合适的视频类型，你也可以手动切换
        </p>
        <div className="grid grid-cols-3 gap-4">
          {VIDEO_TYPES.map((t) => (
            <article key={t.name} className="p-5 rounded-2xl bg-[#121214] border border-[#27272c] hover:border-zinc-600 transition-colors">
              <div className="text-2xl mb-3">{t.icon}</div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">{t.name}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{t.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Platform Specs */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section aria-labelledby="platforms-heading" className="mb-20">
        <h2 id="platforms-heading" className="text-2xl font-bold text-zinc-100 text-center mb-3">
          四平台同步生成，每个平台独立适配
        </h2>
        <p className="text-sm text-zinc-500 text-center mb-10">
          不同平台不同策略 — 不是简单的比例裁剪，而是内容策略的重新设计
        </p>
        <div className="grid grid-cols-2 gap-5">
          {PLATFORM_SPECS.map((p) => (
            <article key={p.name} className="p-5 rounded-2xl bg-[#121214] border border-[#27272c] hover:border-zinc-600 transition-colors">
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">{p.name}</h3>
              <div className="flex gap-4 mb-3 text-xs text-zinc-500">
                <span>📐 {p.ratio}</span>
                <span>⏱ {p.duration}</span>
                <span>🎯 {p.tone}</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{p.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Target Users */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section aria-labelledby="users-heading" className="mb-20">
        <h2 id="users-heading" className="text-2xl font-bold text-zinc-100 text-center mb-3">
          谁在用 TVS Video Tool
        </h2>
        <p className="text-sm text-zinc-500 text-center mb-10">
          从个人卖家到代运营团队 — 不同角色，不同价值
        </p>
        <div className="grid grid-cols-2 gap-5">
          {TARGET_USERS.map((item) => (
            <article key={item.title} className="p-6 rounded-2xl bg-[#121214] border border-[#27272c] hover:border-zinc-600 transition-colors">
              <h3 className="text-base font-semibold text-zinc-200 mb-3">{item.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FAQ */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section aria-labelledby="faq-heading" className="mb-20">
        <h2 id="faq-heading" className="text-2xl font-bold text-zinc-100 text-center mb-3">
          常见问题
        </h2>
        <p className="text-sm text-zinc-500 text-center mb-10">
          关于 AI 视频生成的常见疑问
        </p>
        <div className="space-y-3">
          {FAQS.map((item) => (
            <details key={item.q} className="group p-5 rounded-2xl bg-[#121214] border border-[#27272c] cursor-pointer hover:border-zinc-600 transition-colors">
              <summary className="text-sm font-medium text-zinc-300 group-open:text-amber-400 transition-colors select-none flex items-center justify-between gap-4">
                {item.q}
                <span className="text-zinc-600 group-open:rotate-45 transition-transform flex-shrink-0 text-lg leading-none">+</span>
              </summary>
              <p className="text-sm text-zinc-500 leading-relaxed mt-4">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CTA */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="text-center py-12 rounded-3xl bg-gradient-to-br from-amber-500/5 to-amber-600/5 border border-amber-500/10">
        <h2 className="text-2xl font-bold text-zinc-100 mb-3">准备好生成你的第一条 AI 带货视频了吗？</h2>
        <p className="text-sm text-zinc-400 mb-8 max-w-lg mx-auto">
          新用户注册即享免费体验额度。无需信用卡，无需签约，粘贴链接即可开始。
        </p>
        <Link
          href="/login"
          className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-500/20"
        >
          免费开始 ✦
        </Link>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Footer */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <footer className="text-center pt-12 mt-16 border-t border-[#1c1c20]">
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

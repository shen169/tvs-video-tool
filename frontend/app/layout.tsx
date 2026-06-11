import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import CreditBadge from "@/components/CreditBadge";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400","500","600","700"] });

export const metadata: Metadata = {
  title: "TVS Video Tool — AI 跨境电商带货视频生成器 | TikTok · Amazon · YouTube · Instagram",
  description:
    "跨境电商卖家必备 AI 视频工具。粘贴 Amazon/Shopify 产品链接，AI 自动分析产品卖点、生成分镜脚本、生成预览图、调用 Seedance 2.0 一键出片。支持 TikTok Shop、Amazon 主图视频、YouTube Shorts、Instagram Reels 四大平台。15 秒带货视频，从链接到成片只需 5 分钟。",
  keywords: [
    "AI视频生成",
    "带货视频",
    "跨境电商",
    "TikTok视频",
    "Amazon视频",
    "产品视频",
    "AI视频制作",
    "Seedance",
    "电商视频工具",
    "短视频生成器",
  ],
  openGraph: {
    title: "TVS Video Tool — AI 跨境电商带货视频生成器",
    description:
      "粘贴产品链接 → AI 分析卖点 → 生成分镜脚本 → Seedance 2.0 出片。TikTok/Amazon/YouTube/Instagram 四平台同步生成。",
    type: "website",
    locale: "zh_CN",
    siteName: "TVS Video Tool",
  },
  twitter: {
    card: "summary_large_image",
    title: "TVS Video Tool — AI 带货视频生成",
    description: "跨境电商 AI 视频工具，粘贴产品链接自动生成多平台带货视频。",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="h-full flex bg-[#08080a]">
        {/* JSON-LD Structured Data for AI crawlers */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "TVS Video Tool",
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Web",
              description:
                "AI-powered e-commerce video generation tool. Paste a product link, AI analyzes product selling points, generates storyboard scripts, creates preview images, and produces shoppable videos for TikTok Shop, Amazon, YouTube Shorts, and Instagram Reels using Seedance 2.0.",
              url: "https://tvs-video-tool.vercel.app",
              offers: {
                "@type": "Offer",
                price: "69.00",
                priceCurrency: "CNY",
                description: "9 credits (3 videos) starter pack",
              },
              author: {
                "@type": "Organization",
                name: "TVS Video",
              },
              featureList: [
                "AI product analysis and selling point extraction",
                "Multi-platform storyboard script generation (TikTok, Amazon, YouTube, Instagram)",
                "AI preview image generation with Seedream 5.0",
                "Seedance 2.0 video generation (1080P/720P, up to 15 seconds)",
                "6 video types: pain-point relief, real user share, cinematic TVC, lifestyle, comparison, unboxing",
                "5-dimension visual style customization (lighting, camera, angle, human presence, color tone)",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What platforms does TVS Video Tool support?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "TVS Video Tool supports TikTok Shop (9:16), Amazon main image video (16:9), YouTube Shorts (9:16), and Instagram Reels (9:16). You can generate videos for multiple platforms simultaneously from one product link.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How long does it take to generate a product video?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "From pasting a product link to receiving the final video takes approximately 5 minutes. The AI pipeline includes: product analysis (30s), style recommendation, script generation, preview image generation (6 storyboard frames), and Seedance 2.0 video rendering (15 seconds per platform).",
                  },
                },
                {
                  "@type": "Question",
                  name: "What types of e-commerce videos can it create?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "TVS Video Tool supports 6 video types: pain-point relief (problem→solution), real user share (testimonial style), cinematic TVC (high-end brand), scene lifestyle (product in ideal setting), comparison test (before/after), and unboxing experience.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How much does it cost?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Pricing starts at ¥69 for 9 credits (3 videos). Standard pack: ¥199 for 30 credits (10 videos). Professional pack: ¥499 for 90 credits (30 videos). Each platform video costs 3 credits. Seedance 2.0 1080P video generation is included.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Do I need video editing skills?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "No. TVS Video Tool is fully automated. Just paste your product link, select target platforms, review the AI-generated storyboard, and click generate. The AI handles product analysis, script writing, camera framing, lighting design, and video rendering — no editing skills required.",
                  },
                },
              ],
            }),
          }}
        />
        <Sidebar />
        <main className="flex-1 overflow-auto relative">
          <div className="absolute top-4 right-6 z-10">
            <CreditBadge />
          </div>
          {children}
        </main>
      </body>
    </html>
  );
}

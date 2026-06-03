import type { NextConfig } from "next";

const RAW_BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "https://tvs-video-backend.onrender.com" : "http://localhost:8000");

// 兜底去掉可能误拼的 /api/ 或 /api 后缀，避免 rewrite 出现双 /api
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CORRECT = "tvs2024";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = () => {
    if (password === CORRECT) {
      // 直接设 cookie 后跳转，不调 API，秒响应
      document.cookie = `tvs_auth=${CORRECT};path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`;
      router.push("/");
      router.refresh();
    } else {
      setError("密码错误");
      setPassword("");
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-3xl font-bold">🎬 TVS Video Tool</h1>
        <p className="text-zinc-400">AI 带货视频生成</p>
        <input
          type="password"
          className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 text-center"
          placeholder="请输入访问密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={!password}
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold transition"
        >
          进入
        </button>
      </div>
    </main>
  );
}

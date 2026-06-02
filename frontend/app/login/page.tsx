"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("密码错误");
      }
    } catch {
      setError("登录失败，请重试");
    }
    setLoading(false);
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
          disabled={loading || !password}
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white font-bold transition"
        >
          {loading ? "验证中..." : "进入"}
        </button>
      </div>
    </main>
  );
}

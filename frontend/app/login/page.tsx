"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/api";

type Mode = "password" | "email_login" | "email_register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("password");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 简单密码登录（保留）
  const handlePassword = async () => {
    if (!password) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth", { method: "POST", body: new URLSearchParams({ password }) });
      if (res.redirected) { router.push("/"); return; }
      if (!res.ok) throw new Error("Wrong password");
      router.push("/");
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  // 邮箱登录
  const handleEmailLogin = async () => {
    if (!email || !pwd) return;
    setLoading(true); setError("");
    try {
      await login(email, pwd);
      router.push("/");
    } catch (e: any) { setError(e.message); setLoading(false); }
  };

  // 邮箱注册
  const handleEmailRegister = async () => {
    if (!email || !pwd) return;
    if (pwd.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    try {
      await register(email, pwd);
      router.push("/");
    } catch (e: any) { setError(e.message); setLoading(false); }
  };

  return (
    <div className="flex items-center justify-center h-full bg-[#09090b]">
      <div className="w-full max-w-sm space-y-6 text-center animate-in animate-in-1">
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mx-auto">
          <svg className="w-7 h-7 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">TVS Video Tool</h1>
          <p className="text-sm text-zinc-500 mt-1">AI Commerce Video Generator</p>
        </div>

        {/* Mode Tabs */}
        <div className="flex rounded-xl bg-[#121214] border border-[#27272c] p-1">
          {(["password", "email_login", "email_register"] as Mode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                mode === m ? "bg-amber-500/10 text-amber-400 border border-amber-500/15" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {m === "password" ? "Quick" : m === "email_login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Password mode */}
        {mode === "password" && (
          <div className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-[#121214] border border-[#27272c] text-white placeholder-zinc-600 text-center text-sm focus:outline-none focus:border-amber-500/40 transition-all"
              placeholder="Enter password" autoFocus
              onKeyDown={(e) => e.key === "Enter" && handlePassword()} />
            <button onClick={handlePassword} disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20">
              {loading ? "..." : "Enter"}
            </button>
          </div>
        )}

        {/* Email Login / Register mode */}
        {(mode === "email_login" || mode === "email_register") && (
          <div className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-[#121214] border border-[#27272c] text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500/40 transition-all"
              placeholder="Email" autoFocus />
            <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-[#121214] border border-[#27272c] text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500/40 transition-all"
              placeholder="Password (min 6 chars)"
              onKeyDown={(e) => e.key === "Enter" && (mode === "email_login" ? handleEmailLogin() : handleEmailRegister())} />
            <button onClick={mode === "email_login" ? handleEmailLogin : handleEmailRegister} disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20">
              {loading ? "..." : mode === "email_login" ? "Sign In" : "Create Account"}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15 text-red-400 text-xs">{error}</div>
        )}
      </div>
    </div>
  );
}

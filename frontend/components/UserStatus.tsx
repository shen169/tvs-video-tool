"use client";
import { useEffect, useState } from "react";
import { getMe, logout, getStoredToken } from "@/lib/api";

export default function UserStatus() {
  const [email, setEmail] = useState("");
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!getStoredToken()) return;
    getMe().then(u => { setEmail(u.email); setCredits(u.credits); }).catch(() => {});
  }, []);

  if (!email) return null;

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-zinc-500 truncate">{email}</div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-amber-400">💰 {credits ?? "—"}</span>
      </div>
      <button onClick={logout} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
        Sign out
      </button>
    </div>
  );
}

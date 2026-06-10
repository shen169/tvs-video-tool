"use client";
import { useEffect, useState } from "react";
import { getMe, getStoredToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function CreditBadge() {
  const [credits, setCredits] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    getMe()
      .then((u) => { setCredits(u.credits); setEmail(u.email); })
      .catch(() => {});
  }, []);

  if (credits === null) return null;

  return (
    <button
      onClick={() => router.push("/credits")}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/20 hover:bg-amber-500/10 transition-all duration-200 cursor-pointer"
    >
      <span className="text-[10px] text-zinc-500 truncate max-w-[100px]">{email}</span>
      <span className="w-px h-4 bg-zinc-700/50" />
      <span className="text-xs font-semibold text-amber-400">💰 {credits}</span>
    </button>
  );
}

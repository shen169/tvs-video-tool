"use client";
import { useEffect, useState } from "react";
import { getPricePlans, createCheckout, getCreditHistory, getMe, getStoredToken } from "@/lib/api";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  credits: number;
  videos: number;
  price_cents: number;
  quality: string;
}

interface Tx {
  id: string;
  amount: number;
  type: string;
  created_at: string;
  task_id?: string;
}

export default function CreditsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [history, setHistory] = useState<Tx[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { router.push("/login"); return; }
    Promise.all([
      getPricePlans().catch(() => null),
      getCreditHistory().catch(() => []),
      getMe().catch(() => null),
    ]).then(([pData, hData, me]) => {
      if (pData) setPlans(pData.plans || []);
      if (me) setBalance(me.credits);
      setHistory(hData || []);
    }).catch(() => setError("Failed to load"));
  }, []);

  const handleBuy = async (planId: string) => {
    setLoading(planId);
    try {
      const { url } = await createCheckout(planId);
      window.location.href = url;
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  };

  if (balance === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-14">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-zinc-100">充值</h1>
        <p className="text-sm text-zinc-500 mt-1">
          当前余额：<span className="text-amber-400 font-bold text-lg">{balance} 点</span>
        </p>
      </div>

      {/* Plans */}
      <section className="mb-10">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-4 block">
          选择套餐
        </label>
        <div className="grid grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id}
              className={`p-5 rounded-2xl border transition-all duration-300 ${
                plan.id === "plan_30"
                  ? "border-amber-500/30 bg-amber-500/[0.03] shadow-lg shadow-amber-500/5"
                  : "border-[#27272c] bg-[#121214] hover:border-zinc-600"
              }`}
            >
              <div className="text-sm font-semibold text-zinc-100 mb-1">{plan.name}</div>
              <div className="text-[10px] text-zinc-500 mb-3">
                {plan.videos} 个视频 · {plan.quality}
              </div>
              <div className="text-2xl font-bold text-zinc-100 mb-4">
                ¥{(plan.price_cents / 100).toFixed(0)}
              </div>
              <button
                onClick={() => handleBuy(plan.id)}
                disabled={loading === plan.id}
                className={`w-full h-10 rounded-xl text-xs font-bold transition-all ${
                  plan.id === "plan_30"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500"
                    : "bg-[#1c1c20] border border-[#27272c] text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {loading === plan.id ? "..." : "购买"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/15 text-red-400 text-sm mb-6">{error}</div>
      )}

      {/* History */}
      <section>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-4 block">
          点数流水
        </label>
        <div className="rounded-2xl border border-[#27272c] bg-[#121214] divide-y divide-[#1c1c20] overflow-hidden">
          {history.length === 0 ? (
            <div className="p-6 text-center text-zinc-600 text-sm">暂无记录</div>
          ) : (
            history.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {tx.type === "topup" ? "充值" : tx.type === "consume" ? "生成视频" : "退款"}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-600">
                  {new Date(tx.created_at).toLocaleDateString("zh-CN")}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

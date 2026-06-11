"use client";
import { useEffect, useState } from "react";
import { getStoredToken, getMe } from "@/lib/api";
import { useRouter } from "next/navigation";

const BASE = "/api/backend";

async function adminFetch(path: string, options?: RequestInit) {
  const token = getStoredToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

interface UserRow {
  id: string;
  email: string;
  role: string;
  credits: number;
  created_at: string;
}

interface TxRow {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  created_at: string;
  stripe_session_id?: string;
  task_id?: string;
}

interface Stats {
  total_users: number;
  total_credits_sold: number;
  total_credits_consumed: number;
  today_transactions: number;
  today_revenue: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [tab, setTab] = useState<"users" | "transactions">("users");
  const [addAmount, setAddAmount] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { router.push("/login"); return; }
    getMe().then((me) => {
      if (me.role !== "admin") { router.push("/"); return; }
    }).catch(() => router.push("/login"));

    // 加载数据
    adminFetch("/admin/stats").then(setStats).catch(() => {});
    adminFetch("/admin/users").then(setUsers).catch(() => {});
    adminFetch("/admin/transactions?limit=200").then(setTxs).catch(() => {});
  }, []);

  const handleAddCredits = async (userId: string) => {
    const amount = addAmount[userId] || 0;
    if (amount <= 0) return;
    try {
      await adminFetch(`/admin/users/${userId}/add-credits`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
      // 刷新
      const newUsers = await adminFetch("/admin/users");
      setUsers(newUsers);
      const newStats = await adminFetch("/admin/stats");
      setStats(newStats);
      setAddAmount({ ...addAmount, [userId]: 0 });
    } catch (e: any) { setError(e.message); }
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-bold text-zinc-100 mb-8">管理后台</h1>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-10">
        {[
          ["总用户", stats.total_users],
          ["售出点数", `+${stats.total_credits_sold}`],
          ["消耗点数", `-${stats.total_credits_consumed}`],
          ["今日交易", stats.today_transactions],
          ["今日收入", `¥${stats.today_revenue}`],
        ].map(([label, value]) => (
          <div key={label} className="p-4 rounded-2xl bg-[#121214] border border-[#27272c] text-center">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</div>
            <div className="text-lg font-bold text-zinc-100">{String(value)}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {(["users", "transactions"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm font-medium pb-2 border-b-2 transition-all ${
              tab === t ? "border-amber-400 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "users" ? "用户列表" : "点数流水"}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15 text-red-400 text-xs mb-4">{error}</div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div className="rounded-2xl border border-[#27272c] bg-[#121214] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1c1c20] text-zinc-500">
                <th className="text-left px-5 py-3">邮箱</th>
                <th className="text-left px-5 py-3">角色</th>
                <th className="text-right px-5 py-3">余额</th>
                <th className="text-left px-5 py-3">注册时间</th>
                <th className="text-right px-5 py-3">手动充值</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1c20]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-zinc-300 max-w-[200px] truncate">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      u.role === "admin" ? "bg-amber-500/10 text-amber-400" : "bg-zinc-700/30 text-zinc-500"
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-amber-400">💰 {u.credits}</td>
                  <td className="px-5 py-3 text-zinc-600 font-mono text-[10px]">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("zh-CN") : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="number" min="1" placeholder="点数"
                        value={addAmount[u.id] || ""}
                        onChange={(e) => setAddAmount({ ...addAmount, [u.id]: parseInt(e.target.value) || 0 })}
                        className="w-16 h-7 px-2 rounded-lg bg-[#08080a] border border-[#27272c] text-zinc-300 text-[10px] focus:outline-none focus:border-amber-500/40"
                      />
                      <button onClick={() => handleAddCredits(u.id)}
                        className="h-7 px-3 rounded-lg bg-amber-500/10 border border-amber-500/15 text-amber-400 text-[10px] font-medium hover:bg-amber-500/20 transition-all">
                        充值
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transactions Tab */}
      {tab === "transactions" && (
        <div className="rounded-2xl border border-[#27272c] bg-[#121214] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1c1c20] text-zinc-500">
                <th className="text-left px-5 py-3">时间</th>
                <th className="text-left px-5 py-3">用户</th>
                <th className="text-right px-5 py-3">数量</th>
                <th className="text-left px-5 py-3">类型</th>
                <th className="text-left px-5 py-3">关联</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1c20]">
              {txs.map((tx) => {
                const userEmail = users.find(u => u.id === tx.user_id)?.email || tx.user_id.slice(0,8);
                return (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-zinc-600 font-mono text-[10px]">
                      {new Date(tx.created_at).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-5 py-3 text-zinc-300 max-w-[160px] truncate">{userEmail}</td>
                    <td className={`px-5 py-3 text-right font-mono ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        tx.type === "topup" ? "bg-green-500/10 text-green-400" :
                        tx.type === "consume" ? "bg-red-500/10 text-red-400" :
                        "bg-zinc-700/30 text-zinc-500"
                      }`}>
                        {tx.type === "topup" ? "充值" : tx.type === "consume" ? "消费" : "退款"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-600 text-[10px]">
                      {tx.stripe_session_id ? `Stripe: ${tx.stripe_session_id.slice(0,12)}..` :
                       tx.task_id ? `Task: ${tx.task_id}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

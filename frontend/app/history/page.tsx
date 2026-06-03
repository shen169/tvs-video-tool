"use client";
import { useEffect, useState } from "react";
import { listTasks } from "@/lib/api";

const STAGE_LABELS: Record<string, string> = {
  done: "已完成", failed: "失败", video_gen: "生成中", preview_wait: "等待确认",
  script_gen: "生成脚本", style_wait: "选择风格", creative_wait: "创意方向",
  ref_image: "参考图", fetching: "抓取中", pending: "等待中",
};

export default function HistoryPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTasks().then((data: any) => { setTasks(data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-10 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">历史记录</h1>
        <p className="text-sm text-zinc-500 mt-1.5">之前生成的所有视频任务</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="shimmer h-16 rounded-xl" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-600 text-sm">还没有任务</p>
          <a href="/" className="text-sm text-emerald-500 hover:text-emerald-400 mt-2 inline-block">创建第一个 →</a>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t: any) => (
            <a key={t.task_id} href={`/task/${t.task_id}`}
              className="flex items-center justify-between p-4 rounded-xl bg-[#131316] border border-[#1f1f24] hover:border-emerald-600/20 transition-all group">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-300 truncate group-hover:text-zinc-200">{t.product_info?.title || "未命名"}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">#{t.task_id}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-[11px] px-2.5 py-1 rounded-full ${
                  t.stage === "done" ? "bg-emerald-600/10 text-emerald-400" :
                  t.stage === "failed" ? "bg-red-500/10 text-red-400" :
                  "bg-[#1f1f24] text-zinc-500"
                }`}>
                  {STAGE_LABELS[t.stage] || t.stage}
                </span>
                <span className="text-zinc-700 group-hover:text-zinc-500 transition-colors">→</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

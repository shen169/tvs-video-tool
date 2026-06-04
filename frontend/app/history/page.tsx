"use client";
import { useEffect, useState } from "react";
import { listTasks } from "@/lib/api";

const STAGE_LABELS: Record<string, string> = {
  done: "Completed", failed: "Failed", video_gen: "Generating", preview_wait: "Pending Review",
  script_gen: "Writing Script", style_wait: "Choose Style", creative_wait: "Creative Direction",
  ref_image: "Reference", fetching: "Fetching", pending: "Pending",
};

const STAGE_STYLES: Record<string, string> = {
  done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15",
  failed: "bg-red-500/10 text-red-400 border-red-500/15",
  video_gen: "bg-amber-500/10 text-amber-400 border-amber-500/15",
  default: "bg-zinc-500/10 text-zinc-400 border-zinc-500/10",
};

export default function HistoryPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTasks().then((data: any) => { setTasks(data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-8 py-14">
      <div className="mb-10 animate-in animate-in-1">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">History</h1>
        <p className="text-sm text-zinc-500 mt-1.5">All your generated video tasks</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="shimmer h-16 rounded-2xl" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-24 animate-in animate-in-1">
          <div className="text-5xl mb-4 opacity-15">🎬</div>
          <p className="text-zinc-500 text-sm">No tasks yet</p>
          <a href="/" className="text-sm text-amber-400 hover:text-amber-300 mt-2 inline-block font-medium transition-colors">
            Create your first video →
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t: any, i: number) => (
            <a key={t.task_id} href={`/task/${t.task_id}`}
              className="flex items-center justify-between p-4 rounded-2xl bg-[#121214] border border-[#27272c] hover:border-amber-500/15 card-lift transition-all animate-in"
              style={{ animationDelay: `${i * 0.04}s`, opacity: 0 } as any}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-300 truncate font-medium">{t.product_info?.title || "Untitled"}</p>
                <p className="text-[10px] text-zinc-600 mt-1 font-mono">#{t.task_id}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${
                  (STAGE_STYLES[t.stage] || STAGE_STYLES.default)
                }`}>
                  {STAGE_LABELS[t.stage] || t.stage}
                </span>
                <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

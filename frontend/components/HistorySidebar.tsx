"use client";
import { useEffect, useState } from "react";
import { listTasks } from "@/lib/api";

const STAGE_LABELS: Record<string, string> = {
  done: "Completed", failed: "Failed", video_gen: "Generating", preview_wait: "Review",
  script_gen: "Scripting", style_wait: "Style", creative_wait: "Creative",
  ref_image: "Reference", fetching: "Fetching", pending: "Pending",
};

const STAGE_COLORS: Record<string, string> = {
  done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15",
  failed: "bg-red-500/10 text-red-400 border-red-500/15",
  video_gen: "bg-amber-500/10 text-amber-400 border-amber-500/15",
  preview_wait: "bg-violet-500/10 text-violet-400 border-violet-500/15",
  default: "bg-zinc-500/10 text-zinc-400 border-zinc-500/10",
};

export default function HistorySidebar({ currentTaskId }: { currentTaskId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTasks()
      .then((data: any) => { setTasks(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <aside className="w-64 flex-shrink-0 border-l border-[#1c1c20] bg-[#0a0a0d]/80 backdrop-blur-sm overflow-y-auto">
      <div className="px-4 py-5">
        <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Recent Tasks</h3>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="shimmer h-14 rounded-xl" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-6 h-6 mx-auto mb-2 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3.375 6.75h4.5m-3 4.5h3m-1.5 4.5h1.5m3-9h12a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-12a2.25 2.25 0 01-2.25-2.25v-9a2.25 2.25 0 012.25-2.25Z" />
            </svg>
            <p className="text-[11px] text-zinc-600">No tasks yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tasks.map((t: any) => {
              const isActive = t.task_id === currentTaskId;
              const stageStyle = STAGE_COLORS[t.stage] || STAGE_COLORS.default;
              return (
                <a key={t.task_id} href={`/task/${t.task_id}`}
                  className={`block p-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-amber-500/8 border border-amber-500/15 ring-1 ring-amber-500/10"
                      : "hover:bg-white/[0.03] border border-transparent"
                  }`}
                >
                  <p className="text-[12px] text-zinc-300 truncate font-medium group-hover:text-zinc-200 transition-colors">
                    {t.product_info?.title || "Untitled"}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${stageStyle}`}>
                      {STAGE_LABELS[t.stage] || t.stage}
                    </span>
                    <span className="text-[9px] text-zinc-600 font-mono">#{t.task_id}</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Footer link to full history */}
        <a href="/history"
          className="flex items-center gap-1.5 mt-4 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors group">
          <span>View all history</span>
          <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </a>
      </div>
    </aside>
  );
}

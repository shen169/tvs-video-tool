"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getTask, submitStyle, submitCreative, confirmStoryboard } from "@/lib/api";
import PipelineProgress from "@/components/PipelineProgress";
import TaskStage from "@/components/TaskStage";

export default function TaskPage() {
  const params = useParams();
  const taskId = params.id as string;
  const [task, setTask] = useState<any>(null);
  const [error, setError] = useState("");

  const poll = useCallback(async () => {
    try {
      const data = await getTask(taskId);
      setTask(data);
      if (data.stage === "done" || data.stage === "failed") return;
      if (!["style_wait", "creative_wait", "preview_wait"].includes(data.stage)) {
        const interval = data.stage === "video_gen" ? 5000 : 2000;
        setTimeout(() => poll(), interval);
      }
    } catch (e: any) { setError(e.message); }
  }, [taskId]);

  useEffect(() => { poll(); }, [poll]);

  const handleSelectCreative = async (c: any) => {
    try { await submitCreative(taskId, c); setTask((p: any) => ({ ...p, stage: "style_wait" })); setTimeout(() => poll(), 1000); }
    catch (e: any) { setError(e.message); }
  };
  const handleSelectStyle = async (s: any) => {
    try { await submitStyle(taskId, s); setTask((p: any) => ({ ...p, stage: "script_gen" })); setTimeout(() => poll(), 1000); }
    catch (e: any) { setError(e.message); }
  };
  const handleConfirmStoryboard = async () => {
    try { await confirmStoryboard(taskId); setTask((p: any) => ({ ...p, stage: "video_gen" })); setTimeout(() => poll(), 1000); }
    catch (e: any) { setError(e.message); }
  };

  if (!task) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-sm text-zinc-600">Loading task...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8 animate-in animate-in-1">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-zinc-100 truncate">
            {task.product_info?.title || "Video Generation"}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] text-zinc-600 font-mono">#{task.task_id}</span>
            {task.stage && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/50 text-zinc-500 font-medium uppercase">
                {task.stage}
              </span>
            )}
          </div>
        </div>
        <a href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5m0 0 7 7m-7-7 7-7"/></svg>
          Back
        </a>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/5 border border-red-500/15 text-red-400 text-sm animate-in animate-in-1">
          {error}
        </div>
      )}

      {/* Pipeline */}
      <div className="mb-8 p-5 rounded-2xl bg-[#121214] border border-[#27272c] animate-in animate-in-2">
        <PipelineProgress stage={task.stage} />
      </div>

      {/* Stage Content */}
      <TaskStage task={task} onSelectCreative={handleSelectCreative}
        onSelectStyle={handleSelectStyle} onConfirmStoryboard={handleConfirmStoryboard} />
    </div>
  );
}

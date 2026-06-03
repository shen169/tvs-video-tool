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
        setTimeout(() => poll(), 2000);
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
      <div className="w-8 h-8 border-2 border-emerald-600/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-10 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{task.product_info?.title || "视频生成"}</h1>
          <p className="text-xs text-zinc-600 mt-1 font-mono">#{task.task_id}</p>
        </div>
        <a href="/" className="text-xs text-zinc-500 hover:text-zinc-300">← 返回</a>
      </div>
      {error && <div className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      <div className="mb-8 p-5 rounded-xl bg-[#131316] border border-[#1f1f24]"><PipelineProgress stage={task.stage} /></div>
      <TaskStage task={task} onSelectCreative={handleSelectCreative} onSelectStyle={handleSelectStyle} onConfirmStoryboard={handleConfirmStoryboard} />
    </div>
  );
}

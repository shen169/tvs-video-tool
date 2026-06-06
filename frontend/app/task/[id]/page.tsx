"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { getTask, submitStyle, submitCreative, confirmStoryboard, rollbackTask, confirmRecommend, regeneratePreviews } from "@/lib/api";
import PipelineProgress from "@/components/PipelineProgress";
import TaskStage from "@/components/TaskStage";

export default function TaskPage() {
  const params = useParams();
  const taskId = params.id as string;
  const [task, setTask] = useState<any>(null);
  const [error, setError] = useState("");
  const [rollbackPending, setRollbackPending] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const poll = useCallback(async () => {
    try {
      const data = await getTask(taskId);
      if (!mounted.current) return;
      setTask(data);
      if (data.stage === "done" || data.stage === "failed") return;
      if (!["style_wait", "creative_wait", "preview_wait", "recommend_wait"].includes(data.stage)) {
        const interval = data.stage === "video_gen" ? 5000 : 2000;
        pollTimer.current = setTimeout(() => poll(), interval);
      }
    } catch (e: any) {
      if (mounted.current) setError(e?.message || String(e));
    }
  }, [taskId]);

  useEffect(() => {
    mounted.current = true;
    poll();
    return () => {
      mounted.current = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [poll]);

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
    try {
      await confirmStoryboard(taskId);
      if (mounted.current) {
        setTask((p: any) => ({ ...p, stage: "video_gen" }));
        setTimeout(() => { if (mounted.current) poll(); }, 1000);
      }
    } catch (e: any) { if (mounted.current) setError(e?.message || String(e)); }
  };
  const handleConfirmRecommend = async (creative: any, style: any) => {
    try {
      await confirmRecommend(taskId, creative, style);
      if (mounted.current) {
        setTask((p: any) => ({ ...p, stage: "script_gen" }));
        setTimeout(() => { if (mounted.current) poll(); }, 500);
      }
    } catch (e: any) { if (mounted.current) setError(e?.message || String(e)); }
  };
  const handleRollback = async (stageKey: string) => {
    try {
      setRollbackPending(true);
      setError("");
      await rollbackTask(taskId, stageKey);
      // 根据回退目标智能清除下游数据，不盲目全部清空
      const clearMap: Record<string, string[]> = {
        fetching:    ["product_info", "ref_image_url", "recommendation", "creative_direction", "selected_style", "scripts", "preview_images", "video_urls"],
        ref_image:   ["recommendation", "creative_direction", "selected_style", "scripts", "preview_images", "video_urls"],
        creative_wait: ["recommendation", "creative_direction", "selected_style", "scripts", "preview_images", "video_urls"],
        style_wait:  ["recommendation", "selected_style", "scripts", "preview_images", "video_urls"],
        recommend_wait: ["scripts", "preview_images", "video_urls"],
        script_gen:  ["preview_images", "video_urls"],
        preview_wait: ["video_urls"],  // 保留 preview_images！
        video_gen:   [],
      };
      const fieldsToClear = clearMap[stageKey] || [];
      const update: any = { stage: stageKey };
      fieldsToClear.forEach((f: string) => { update[f] = null; });
      setTask((p: any) => ({ ...p, ...update }));
      setTimeout(() => { poll(); setRollbackPending(false); }, 500);
    } catch (e: any) { setError(e.message); setRollbackPending(false); }
  };
  const handleRegeneratePreviews = async () => {
    try {
      setError("");
      await regeneratePreviews(taskId);
      // 等待预览图生成（轮询）
      let attempts = 0;
      const checkPreviews = async () => {
        if (!mounted.current || attempts > 30) return;
        attempts++;
        const data = await getTask(taskId);
        if (data.preview_images && Object.keys(data.preview_images).length > 0) {
          setTask(data);
        } else {
          setTimeout(checkPreviews, 2000);
        }
      };
      setTimeout(checkPreviews, 2000);
    } catch (e: any) { setError(e?.message || String(e)); }
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
        <div className="flex items-center gap-3">
          {rollbackPending && (
            <span className="text-[10px] text-amber-400/70 flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              Rolling back...
            </span>
          )}
          <a href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5m0 0 7 7m-7-7 7-7"/></svg>
            Back
          </a>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/5 border border-red-500/15 text-red-400 text-sm animate-in animate-in-1">
          {error}
        </div>
      )}

      {/* Pipeline */}
      <div className="mb-8 p-5 rounded-2xl bg-[#121214] border border-[#27272c] animate-in animate-in-2">
        <PipelineProgress stage={task.stage} onRollback={handleRollback} />
      </div>

      {/* Stage Content */}
      <TaskStage task={task} taskId={taskId} onRefresh={poll}
        onSelectCreative={handleSelectCreative}
        onSelectStyle={handleSelectStyle}
        onConfirmStoryboard={handleConfirmStoryboard}
        onConfirmRecommend={handleConfirmRecommend}
        onRegeneratePreviews={handleRegeneratePreviews} />
    </div>
  );
}

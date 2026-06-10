"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { getTask, submitStyle, submitCreative, confirmStoryboard, rollbackTask, confirmRecommend, updateScripts, confirmScripts, PaymentRequiredError } from "@/lib/api";
import PipelineProgress from "@/components/PipelineProgress";
import TaskStage from "@/components/TaskStage";
import InsufficientModal from "@/components/InsufficientModal";

export default function TaskPage() {
  const params = useParams();
  const taskId = params.id as string;
  const [task, setTask] = useState<any>(null);
  const [error, setError] = useState("");
  const [rollbackPending, setRollbackPending] = useState(false);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [insufficient, setInsufficient] = useState<{ required: number; current: number } | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const lastJson = useRef("");
  const poll = useCallback(async () => {
    try {
      const data = await getTask(taskId);
      if (!mounted.current) return;
      const json = JSON.stringify(data);
      if (json !== lastJson.current) { lastJson.current = json; setTask(data); }
      if (data.stage === "done" || data.stage === "failed") return;
      if (!["style_wait", "creative_wait", "preview_wait", "recommend_wait", "script_review"].includes(data.stage)) {
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
  const handleUpdateScripts = async (scripts: Record<string, any[]>) => {
    try {
      await updateScripts(taskId, scripts);
      setTask((p: any) => ({ ...p, scripts }));
    } catch (e: any) { setError(e?.message || String(e)); }
  };
  const handleConfirmScripts = async () => {
    setShowCreditConfirm(true);
  };

  const doConfirmScripts = async () => {
    setShowCreditConfirm(false);
    try {
      const result = await confirmScripts(taskId);
      setTask((p: any) => ({ ...p, stage: "video_gen", ...result }));
      setTimeout(() => poll(), 1000);
    } catch (e: any) {
      if (e instanceof PaymentRequiredError) {
        setInsufficient({ required: e.required, current: e.current });
      } else {
        setError(e.message);
      }
    }
  };
  const handleRollback = async (stageKey: string) => {
    try {
      setRollbackPending(true);
      setError("");
      await rollbackTask(taskId, stageKey);
      setTask((p: any) => ({ ...p, stage: stageKey, scripts: null, preview_images: null, video_urls: null }));
      setTimeout(() => { poll(); setRollbackPending(false); }, 500);
    } catch (e: any) { setError(e.message); setRollbackPending(false); }
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
        onUpdateScripts={handleUpdateScripts}
        onConfirmScripts={handleConfirmScripts} />

      {/* 扣点确认弹窗 */}
      {showCreditConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 p-6 rounded-2xl bg-[#121214] border border-[#27272c] shadow-2xl space-y-5">
            <div className="text-center">
              <div className="text-3xl mb-3">🎬</div>
              <h3 className="text-lg font-bold text-zinc-100">确认生成视频？</h3>
              <p className="text-sm text-zinc-400 mt-1">
                本次生成 <span className="text-amber-400 font-semibold">{task.platforms?.length || 1} 个平台</span>，
                消耗 <span className="text-amber-400 font-semibold">{(task.platforms?.length || 1) * 3} 点</span>
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                当前余额：{task.credits_remaining ?? "—"} 点
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreditConfirm(false)}
                className="flex-1 h-11 rounded-xl bg-[#1c1c20] border border-[#27272c] text-zinc-400 text-sm font-medium">
                取消
              </button>
              <button onClick={doConfirmScripts}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm shadow-lg shadow-amber-500/20">
                确认生成 ✦
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 余额不足弹窗 */}
      {insufficient && (
        <InsufficientModal
          required={insufficient.required}
          current={insufficient.current}
          onClose={() => setInsufficient(null)}
        />
      )}
    </div>
  );
}

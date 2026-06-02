"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getTask, submitStyle, confirmStoryboard } from "@/lib/api";
import PipelineProgress from "@/components/PipelineProgress";
import TaskStage from "@/components/TaskStage";

export default function TaskPage() {
  const params = useParams();
  const taskId = params.id as string;
  const [task, setTask] = useState<any>(null);

  const poll = useCallback(async () => {
    const data = await getTask(taskId);
    setTask(data);
    if (data.stage === "done" || data.stage === "failed") return;
    if (!["style_wait", "preview_wait"].includes(data.stage)) {
      setTimeout(() => poll(), 2000);
    }
  }, [taskId]);

  useEffect(() => {
    poll();
  }, [poll]);

  const handleSelectStyle = async (style: Record<string, any>) => {
    await submitStyle(taskId, style);
    setTask((prev: any) => ({ ...prev, stage: "script_gen" }));
    setTimeout(() => poll(), 1000);
  };

  const handleConfirmStoryboard = async () => {
    await confirmStoryboard(taskId);
    setTask((prev: any) => ({ ...prev, stage: "video_gen" }));
    setTimeout(() => poll(), 1000);
  };

  if (!task)
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400 animate-pulse">加载中...</p>
      </main>
    );

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <PipelineProgress stage={task.stage} />
        <TaskStage
          task={task}
          onSelectStyle={handleSelectStyle}
          onConfirmStoryboard={handleConfirmStoryboard}
        />
      </div>
    </main>
  );
}

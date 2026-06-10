"use client";
import { useRouter } from "next/navigation";

interface Props {
  required: number;
  current: number;
  onClose: () => void;
}

export default function InsufficientModal({ required, current, onClose }: Props) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in">
      <div className="w-full max-w-sm mx-4 p-6 rounded-2xl bg-[#121214] border border-[#27272c] shadow-2xl space-y-5">
        <div className="text-center">
          <div className="text-3xl mb-3">💰</div>
          <h3 className="text-lg font-bold text-zinc-100">余额不足</h3>
          <p className="text-sm text-zinc-400 mt-1">
            需要 <span className="text-amber-400 font-semibold">{required} 点</span>，
            当前余额 <span className="text-red-400 font-semibold">{current} 点</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-[#1c1c20] border border-[#27272c] text-zinc-400 text-sm font-medium hover:text-zinc-200 transition-all">
            取消
          </button>
          <button onClick={() => { onClose(); router.push("/credits"); }}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20">
            去充值
          </button>
        </div>
      </div>
    </div>
  );
}

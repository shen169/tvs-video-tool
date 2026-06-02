export default function ProductAnalysis({ info }: { info: Record<string, any> | null }) {
  if (!info) return <div className="text-zinc-500 animate-pulse">正在分析产品...</div>;
  return (
    <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-700 space-y-3">
      <h3 className="text-lg font-bold">{info.title || "产品分析结果"}</h3>
      {info.price && <p className="text-2xl font-bold text-green-400">{info.price}</p>}
      {info.description && <p className="text-zinc-400 text-sm">{info.description}</p>}
      {info.category_hints?.length > 0 && (
        <div className="flex gap-2 mt-2">
          {info.category_hints.map((c: string) => (
            <span key={c} className="px-2 py-1 rounded bg-zinc-800 text-xs text-zinc-300">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

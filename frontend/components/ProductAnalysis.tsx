export default function ProductAnalysis({ info }: { info: Record<string, any> | null }) {
  if (!info) return <div className="shimmer h-20 rounded-lg" />;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-zinc-200">{info.title || "产品分析"}</h3>
          {info.price && <p className="text-xl font-bold text-emerald-400 mt-1">{info.price}</p>}
        </div>
        {info.images?.[0] && <img src={info.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover border border-[#1f1f24]" />}
      </div>
      {info.description && <p className="text-sm text-zinc-400 leading-relaxed">{info.description}</p>}
      {info.category_hints?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {info.category_hints.map((c: string) => (
            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1f1f24] text-zinc-500">{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}

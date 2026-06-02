export default function StylePicker({
  options,
  onSelect,
}: {
  options: Record<string, any>[];
  onSelect: (s: any) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">选择视频风格</h3>
      <div className="grid grid-cols-3 gap-4">
        {options?.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt)}
            className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-blue-500 text-left transition"
          >
            <h4 className="font-bold text-blue-400">{opt.label}</h4>
            <p className="text-sm text-zinc-400 mt-2">{opt.description}</p>
            <div className="mt-3 space-y-1 text-xs text-zinc-500">
              <div>视觉：{opt.visual_style}</div>
              <div>运镜：{opt.camera}</div>
              <div>灯光：{opt.lighting}</div>
              <div>角度：{opt.angle}</div>
              <div>人物：{opt.human}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useState, useMemo } from "react";
import { Icon, SvgIcon } from "./Icons";

/* ── 维度定义 ── */
const DIM_DEFS: Record<string, any> = {
  video_type: {
    label: "视频类型", options: [
      { id: "pain_point_relief", label: "痛点解决" },
      { id: "real_user_share", label: "真实分享" },
      { id: "tvc_cinematic", label: "TVC大片" },
      { id: "scene_lifestyle", label: "场景生活" },
      { id: "comparison_test", label: "对比测评" },
      { id: "unboxing_experience", label: "开箱体验" },
    ],
    icon: "M3.375 6.75h4.5m-3 4.5h3m-1.5 4.5h1.5m3-9h12a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-12a2.25 2.25 0 0 1-2.25-2.25v-9a2.25 2.25 0 0 1 2.25-2.25Z",
  },
  visual_style: {
    label: "视觉风格", options: [
      { id: "clean_minimal", label: "简约干净" },
      { id: "lifestyle_warm", label: "生活温馨" },
      { id: "tech_futuristic", label: "科技未来" },
    ],
    icon: Icon.paint,
  },
  camera: {
    label: "运镜", options: [
      { id: "smooth_cinematic", label: "电影感平滑" },
      { id: "dynamic_handheld", label: "动感手持" },
      { id: "macro_detail", label: "微距细节" },
    ],
    icon: Icon.camera,
  },
  human: {
    label: "人物", options: [
      { id: "no_human", label: "无人物" },
      { id: "hands_only", label: "手部出镜" },
      { id: "full_person", label: "人物出镜" },
    ],
    icon: Icon.user,
  },
  scene: {
    label: "场景", options: [
      { id: "studio_clean", label: "纯色棚拍" },
      { id: "home_indoor", label: "家居室内" },
      { id: "outdoor_nature", label: "户外自然" },
      { id: "office_business", label: "办公商务" },
      { id: "minimal_white", label: "极简白底" },
    ],
    icon: Icon.image,
  },
  color_tone: {
    label: "色调", options: [
      { id: "warm_golden", label: "暖色调" },
      { id: "cool_blue", label: "冷色调" },
      { id: "neutral_natural", label: "自然中性" },
      { id: "vibrant_saturated", label: "高饱和活力" },
      { id: "desaturated_premium", label: "低饱和高级" },
    ],
    icon: Icon.paint,
  },
  music: {
    label: "音乐", options: [
      { id: "fast_electronic", label: "快节奏电子" },
      { id: "soft_piano", label: "舒缓钢琴" },
      { id: "light_acoustic", label: "轻快原声" },
      { id: "dynamic_drums", label: "动感鼓点" },
      { id: "no_music_asmr", label: "无音乐/ASMR" },
    ],
    icon: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  },
  lighting: {
    label: "灯光", options: [
      { id: "soft_studio", label: "柔光棚拍" },
      { id: "natural_window", label: "自然窗光" },
      { id: "dramatic_rim", label: "戏剧轮廓光" },
    ],
    icon: Icon.bulb,
  },
  angle: {
    label: "角度", options: [
      { id: "eye_level", label: "平视" },
      { id: "top_down", label: "俯拍" },
      { id: "low_hero", label: "仰拍英雄" },
    ],
    icon: Icon.eye,
  },
  aspect_ratio: {
    label: "尺寸", options: [
      { id: "9:16", label: "9:16 竖屏" },
      { id: "16:9", label: "16:9 横屏" },
      { id: "1:1", label: "1:1 方形" },
    ],
    icon: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5",
  },
};
const DIM_ORDER = ["video_type", "visual_style", "camera", "human", "scene", "color_tone", "music", "lighting", "angle", "aspect_ratio"];
// 非 video_type 的维度（在 grid 中展示）
const STYLE_DIMS = DIM_ORDER.filter(d => d !== "video_type");

/* ── 视频类型中文标签 ── */
const VIDEO_TYPE_LABELS: Record<string, string> = {
  pain_point_relief: "痛点解决",
  real_user_share: "真实分享",
  tvc_cinematic: "TVC大片",
  scene_lifestyle: "场景生活",
  comparison_test: "对比测评",
  unboxing_experience: "开箱体验",
};

/* ── 视频类型 → 一句话描述（用于动态推荐理由） ── */
const VIDEO_TYPE_DESC: Record<string, string> = {
  pain_point_relief: "先展示用户痛点再呈现产品解决方案，情绪共鸣驱动购买",
  real_user_share: "真实用户视角的使用分享，拉近距离建立信任",
  tvc_cinematic: "电影级质感大片，用视觉冲击力塑造高端品牌形象",
  scene_lifestyle: "产品融入理想生活场景，激发用户对美好生活的向往",
  comparison_test: "使用前后/AB对比，用事实说服犹豫用户",
  unboxing_experience: "开箱第一视角体验，满足好奇心和新鲜感",
};

/* ── 色调中文描述 ── */
const COLOR_TONE_DESC: Record<string, string> = {
  warm_golden: "暖色调营造亲切温馨氛围",
  cool_blue: "冷色调突出科技专业感",
  neutral_natural: "自然中性色调呈现真实质感",
  vibrant_saturated: "高饱和色彩吸引眼球激发购买欲",
  desaturated_premium: "低饱和莫兰迪色调体现高级感",
};

/* ── 根据当前选择动态生成推荐理由 ── */
function computeReasonPoints(videoType: string, style: any, platformProfile?: { tone: string; ratio: string }): string[] {
  const vtLabel = VIDEO_TYPE_LABELS[videoType] || videoType;
  const vtDesc = VIDEO_TYPE_DESC[videoType] || "";
  const visualLabel = style.visual_style_label || "";
  const colorLabel = style.color_tone_label || "";
  const cameraLabel = style.camera_label || "";
  const musicLabel = style.music_label || "";
  const humanLabel = style.human_label || "";
  const sceneLabel = style.scene_label || "";

  const points: string[] = [];

  // Point 1: 视频类型的核心策略
  if (vtDesc) {
    points.push(`【${vtLabel}】${vtDesc}`);
  }

  // Point 2: 视听风格组合
  if (visualLabel && colorLabel) {
    const colorDesc = Object.entries(COLOR_TONE_DESC).find(([k]) => style.color_tone === k)?.[1] || "";
    points.push(`${visualLabel} × ${colorLabel}${colorDesc ? ` — ${colorDesc}` : ""}`);
  }

  // Point 3: 运镜 + 人物 + 场景
  if (cameraLabel && humanLabel) {
    points.push(`${cameraLabel}运镜 + ${humanLabel} + ${sceneLabel || '精选场景'}，强化${vtLabel}表现力`);
  }

  // Point 4: 音乐氛围
  if (musicLabel) {
    points.push(`${musicLabel}伴奏，匹配${vtLabel}视频节奏`);
  }

  // Point 5: 平台适配
  if (platformProfile) {
    points.push(`适配${platformProfile.ratio}比例，${platformProfile.tone}平台调性`);
  }

  return points.length > 0 ? points : [vtDesc || "综合方案"];
}

export default function RecommendationCard({
  recommendation, onConfirm, confirming = false,
}: {
  recommendation: any;
  onConfirm: (creative: any, style: any) => void;
  confirming?: boolean;
}) {
  const [editedStyle, setEditedStyle] = useState<any>(null);
  const [editedCreative, setEditedCreative] = useState<any>(null);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [hasInteractedVideo, setHasInteractedVideo] = useState(false);
  const [showConfirmTip, setShowConfirmTip] = useState(false);

  if (!recommendation) return null;

  const style = editedStyle || recommendation.style || {};
  const creative = editedCreative || recommendation.creative || {};
  const currentVideoType = style.video_type || recommendation.style?.video_type || "";
  const originalVideoType = recommendation.style?.video_type || "";

  const getVal = (dim: string) => style[dim] || recommendation.style?.[dim] || "";
  const getLabel = (dim: string) => {
    const val = getVal(dim);
    if (dim === "aspect_ratio") return val;
    const labelKey = `${dim}_label`;
    return style[labelKey] || recommendation.style?.[labelKey] || String(val).replace(/_/g, " ");
  };

  // 动态生成推荐理由（随用户选择实时更新）
  const platformProfile = useMemo(() => {
    const ratio = style.aspect_ratio || recommendation.style?.aspect_ratio || "9:16";
    return { tone: "短视频平台", ratio };
  }, [style.aspect_ratio, recommendation.style?.aspect_ratio]);

  const reasonPoints = useMemo(() => {
    return computeReasonPoints(currentVideoType, style, platformProfile);
  }, [currentVideoType, style, platformProfile]);

  const isEdited = Object.keys(editedStyle || {}).length > 0;

  const updateDim = (dim: string, val: string) => {
    if (dim === "video_type") {
      setHasInteractedVideo(true);
      // 切换视频类型 → 自动匹配所有维度默认值
      const defaults = VIDEO_TYPE_DEFAULTS[val] || VIDEO_TYPE_DEFAULTS.pain_point_relief;
      const newStyle: any = { ...style, video_type: val, video_type_label: DIM_DEFS.video_type.options.find((o: any) => o.id === val)?.label || val };
      for (const [k, v] of Object.entries(defaults)) {
        const labelKey = `${k}_label`;
        const def = DIM_DEFS[k];
        const opt = def?.options?.find((o: any) => o.id === v);
        newStyle[k] = v;
        newStyle[labelKey] = opt?.label || String(v);
      }
      setEditedStyle(newStyle);
    } else {
      const labelKey = `${dim}_label`;
      const def = DIM_DEFS[dim];
      const opt = def?.options?.find((o: any) => o.id === val);
      setEditedStyle({ ...style, [dim]: val, [labelKey]: opt?.label || val });
    }
    setActivePopover(null);
  };

  const handleConfirm = () => {
    if (!hasInteractedVideo && !originalVideoType) {
      setShowConfirmTip(true);
      return;
    }
    onConfirm(creative, style);
  };

  return (
    <div className="space-y-6 animate-in animate-in-1">
      <div className="rounded-2xl bg-[#121214] border border-[#27272c] p-6 grain card-lift">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center text-violet-400">
              <SvgIcon d={Icon.sparkle} size={5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">AI 智能推荐</h3>
              {isEdited ? (
                <span className="text-[10px] text-amber-400/80">已手动调整 · {Object.keys(editedStyle).filter(k => !k.endsWith('_label')).length} 项</span>
              ) : (
                <p className="text-xs text-zinc-500 mt-0.5">选择视频类型，风格自动匹配</p>
              )}
            </div>
          </div>
          {isEdited && (
            <button onClick={() => { setEditedStyle(null); setEditedCreative(null); setHasInteractedVideo(false); }}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer">
              恢复 AI 推荐
            </button>
          )}
        </div>

        {/* Concept */}
        <div className="mb-5 p-4 rounded-xl bg-violet-500/[0.04] border border-violet-500/10">
          <h4 className="text-base font-bold text-zinc-100">{creative.title || "智能方案"}</h4>
          {creative.concept && (
            <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">{creative.concept}</p>
          )}
        </div>

        {/* ── 视频类型选择器（独立、醒目） ── */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <SvgIcon d="M3.375 6.75h4.5m-3 4.5h3m-1.5 4.5h1.5m3-9h12a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-12a2.25 2.25 0 0 1-2.25-2.25v-9a2.25 2.25 0 0 1 2.25-2.25Z" size={3.5} className="text-violet-400" />
              视频类型
            </span>
            <span className="text-[9px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full">✦ 核心选择</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DIM_DEFS.video_type.options.map((opt: any) => {
              const isSelected = opt.id === currentVideoType;
              const isOriginal = opt.id === originalVideoType && !isEdited;
              return (
                <button key={opt.id}
                  onClick={() => updateDim("video_type", opt.id)}
                  className={`relative px-4 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-violet-500/15 border border-violet-500/40 text-violet-300 shadow-sm shadow-violet-500/10"
                      : "bg-[#0d0d0f] border border-zinc-700/20 text-zinc-400 hover:border-zinc-600/40 hover:text-zinc-300"
                  }`}
                >
                  {opt.label}
                  {isOriginal && !isEdited && (
                    <span className="absolute -top-1.5 -right-1.5 text-[8px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                      AI推荐
                    </span>
                  )}
                  {isSelected && (
                    <span className="absolute -bottom-1 right-1 text-violet-400 text-[8px]">▼</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 风格维度 Grid（去掉 video_type） ── */}
        <div className="mb-5">
          <p className="text-[10px] text-zinc-500 mb-2.5">风格维度（根据视频类型自动匹配，点击修改）</p>
          <div className="grid grid-cols-5 gap-2">
            {STYLE_DIMS.map(dim => {
              const def = DIM_DEFS[dim];
              if (!def) return null;
              const val = getVal(dim);
              const label = getLabel(dim);
              const isDimEdited = editedStyle && dim in editedStyle;
              const isActive = activePopover === dim;

              return (
                <div key={dim} className="relative">
                  <button
                    onClick={() => setActivePopover(isActive ? null : dim)}
                    className={`w-full p-2.5 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "border-violet-500/40 bg-violet-500/[0.06]"
                        : isDimEdited
                          ? "border-amber-500/15 bg-amber-500/[0.03] hover:border-amber-500/30"
                          : "border-zinc-700/20 bg-[#0d0d0f] hover:border-zinc-600/30"
                    }`}
                  >
                    <div className="flex justify-center mb-0.5">
                      <SvgIcon d={def.icon || Icon.check} size={3} className={isActive ? "text-violet-400" : "text-zinc-500"} />
                    </div>
                    <p className="text-[8px] text-zinc-500 uppercase tracking-wider mb-0.5">{def.label}</p>
                    <p className={`text-[10px] font-medium leading-tight ${
                      dim === "aspect_ratio" ? "text-amber-400" : "text-zinc-300"
                    }`}>{label.split(" —")[0]}</p>
                  </button>

                  {/* Popover */}
                  {isActive && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActivePopover(null)} />
                      <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 w-36 rounded-xl bg-[#1c1c20] border border-[#27272c] shadow-2xl shadow-black/50 p-1.5 animate-in animate-in-1">
                        {def.options.map((opt: any) => {
                          const selected = opt.id === val;
                          return (
                            <button key={opt.id}
                              onClick={() => updateDim(dim, opt.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-colors cursor-pointer ${
                                selected
                                  ? "bg-violet-500/10 text-violet-400 font-medium"
                                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 推荐理由（动态更新） ── */}
        <div className="p-4 rounded-xl bg-[#0d0d0f] border border-zinc-700/20 mb-5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <SvgIcon d={Icon.bulb} size={3.5} className={isEdited ? "text-amber-400" : "text-violet-400"} />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              推荐理由{isEdited ? " (已更新)" : ""}
            </p>
          </div>
          <ul className="space-y-1.5">
            {reasonPoints.map((r: string, i: number) => (
              <li key={i} className="text-[12px] text-zinc-400 leading-relaxed flex gap-1.5">
                <span className={`flex-shrink-0 ${isEdited ? "text-amber-500/60" : "text-violet-500/60"}`}>{i + 1}.</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── 警告提示 ── */}
        {showConfirmTip && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-[11px] text-amber-400 flex items-center gap-2 animate-in animate-in-1">
            <SvgIcon d={Icon.bulb} size={3.5} />
            <span>请先在上方选择一个<strong>视频类型</strong>，确认风格后再生成分镜</span>
            <button onClick={() => setShowConfirmTip(false)} className="ml-auto text-amber-500/60 hover:text-amber-400 text-[10px] cursor-pointer">✕</button>
          </div>
        )}

        {/* CTA */}
        <button onClick={handleConfirm} disabled={confirming}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all duration-300 active:scale-[0.98] shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 cursor-pointer">
          {confirming ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Confirming...
            </span>
          ) : (
            currentVideoType
              ? `✦ 确认「${VIDEO_TYPE_LABELS[currentVideoType] || currentVideoType}」方案，生成分镜`
              : "✦ 确认方案，生成分镜"
          )}
        </button>
      </div>
    </div>
  );
}

/* ── 视频类型 → 默认风格映射（切换视频类型时自动匹配） ── */
const VIDEO_TYPE_DEFAULTS: Record<string, Record<string, string>> = {
  pain_point_relief: {
    visual_style: "clean_minimal", camera: "smooth_cinematic", human: "hands_only",
    scene: "studio_clean", color_tone: "neutral_natural", music: "soft_piano",
    lighting: "soft_studio", angle: "eye_level",
  },
  real_user_share: {
    visual_style: "lifestyle_warm", camera: "dynamic_handheld", human: "full_person",
    scene: "home_indoor", color_tone: "warm_golden", music: "light_acoustic",
    lighting: "natural_window", angle: "eye_level",
  },
  tvc_cinematic: {
    visual_style: "tech_futuristic", camera: "smooth_cinematic", human: "no_human",
    scene: "minimal_white", color_tone: "desaturated_premium", music: "fast_electronic",
    lighting: "dramatic_rim", angle: "low_hero",
  },
  scene_lifestyle: {
    visual_style: "lifestyle_warm", camera: "dynamic_handheld", human: "full_person",
    scene: "outdoor_nature", color_tone: "warm_golden", music: "light_acoustic",
    lighting: "natural_window", angle: "eye_level",
  },
  comparison_test: {
    visual_style: "clean_minimal", camera: "macro_detail", human: "hands_only",
    scene: "studio_clean", color_tone: "neutral_natural", music: "dynamic_drums",
    lighting: "soft_studio", angle: "top_down",
  },
  unboxing_experience: {
    visual_style: "clean_minimal", camera: "macro_detail", human: "hands_only",
    scene: "studio_clean", color_tone: "vibrant_saturated", music: "fast_electronic",
    lighting: "soft_studio", angle: "top_down",
  },
};

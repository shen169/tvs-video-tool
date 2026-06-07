"""
Stage 4 — 视频类型驱动的分镜脚本生成。

6 种视频类型各有独立的叙事结构（6镜），优先级:
  1. AI 产品分析数据（pain_points, use_scenarios, key_features 等）
  2. 模板兜底
"""

PLATFORM_CONFIG = {
    "tiktok":    {"ratio": "9:16", "duration": 12, "tone": "年轻快节奏", "hook_seconds": 3},
    "amazon":    {"ratio": "16:9", "duration": 15, "tone": "专业产品展示", "hook_seconds": 5},
    "youtube":   {"ratio": "9:16", "duration": 15, "tone": "信息量丰富",   "hook_seconds": 3},
    "instagram": {"ratio": "9:16", "duration": 12, "tone": "视觉驱动",     "hook_seconds": 2},
}

# ═══════════════════════════════════════════════════════════════════════════
# 每种视频类型的叙事结构定义
# 每个 shot = (purpose, shot_type, angle_hint, transition, camera_hint, scene_fn, vo_fn, sub_fn)
# ═══════════════════════════════════════════════════════════════════════════

NARRATIVE = {
    # ── 痛点解决：问题 → 放大 → 方案 → 原理 → 效果 → 行动 ──
    "pain_point_relief": [
        ("Problem",    "wide",     "eye_level", "cut",     "Hook",
         lambda d: f"痛点场景: {d['pain']}。{d['atm']}。",
         lambda d: d['hook'],
         lambda d: d['hook'][:40]),
        ("Agitation",  "medium",   "45_degree", "dissolve","Build",
         lambda d: f"痛点放大 — {d['pain2']} 如何影响 {d['aud']} 的日常。{d['atm']}。",
         lambda d: f"Every day, {d['aud']} struggle with this.",
         lambda d: f"每日痛点: {d['pain2'][:30]}" if d['pain2'] else "每天都在忍受"),
        ("Solution",   "medium",   "default",    "cut",      "Turn",
         lambda d: f"{d['human_scene']} 亮相。{d['atm']}。",
         lambda d: f"Meet {d['short']} — {d['feat1']}.",
         lambda d: d['feat1'][:35]),
        ("Mechanism",  "close_up", "top_down",  "cut",      "Develop",
         lambda d: f"特写 {d['feat2']} 如何解决痛点。{d['atm']}。{d['human_scene']} 细节展示。",
         lambda d: f"{d['feat2']}. {d['feat3']}." if d.get('feat3') else d['feat2'],
         lambda d: (d.get('feat2') or '')[:35]),
        ("Proof",      "close_up", "low_hero",  "dissolve","Escalate",
         lambda d: f"效果展示 — {d['usp1']}。{d['usp2']}。{d['atm']}，光影流动。",
         lambda d: f"{d['usp1']}. {d['aud']} finally get relief.",
         lambda d: d['usp1'][:35]),
        ("CTA",        "wide",     "default",    "fade",     "Resolve",
         lambda d: f"{d['human_scene']} 产品+{d.get('price','')}+CTA。品牌 Logo。{d['atm']}。",
         lambda d: f"Stop suffering. Get {d['short']}. Link in bio." + (f" Only {d['price']}." if d.get('price') else ""),
         lambda d: f"立即解决 ↓ {d.get('price','')}"[:35]),
    ],

    # ── 真实分享：用户 → 问题 → 发现 → 使用 → 效果 → 推荐 ──
    "real_user_share": [
        ("Intro",      "medium",   "eye_level", "cut",     "Hook",
         lambda d: f"{d['human_scene']} 出镜。{d['atm']}。",
         lambda d: f"Hi! Let me show you something that changed my {d.get('scene1','life')}.",
         lambda d: f"改变了我{d.get('scene1','生活')}的好物"[:35]),
        ("Problem",    "medium",   "45_degree", "dissolve","Build",
         lambda d: f"{d['aud']} 的真实困扰 — {d['pain']}。{d['atm']}。",
         lambda d: f"I used to struggle with {d['pain']} every single day.",
         lambda d: f"我曾经每天被{d['pain'][:20]}困扰"[:35]),
        ("Discovery",  "close_up", "eye_level", "cut",      "Turn",
         lambda d: f"发现 {d['short']} 的时刻。{d['atm']}。{d['human_scene']}。",
         lambda d: f"Then I found {d['short']} — {d['feat1']}.",
         lambda d: d['feat1'][:35]),
        ("Usage",      "medium",   "default",    "cut",      "Develop",
         lambda d: f"在 {d['scene1']} 使用 {d['short']}。{d['atm']}。真实自然的感觉。",
         lambda d: f"I use it {d.get('scene1','every day')} and {d.get('feat2','it just works')}.",
         lambda d: f"在{d.get('scene1','日常')}中使用"[:35]),
        ("Result",     "close_up", "low_hero",  "dissolve","Escalate",
         lambda d: f"使用效果 — {d['usp1']}。{d['atm']}，满足的微笑。",
         lambda d: f"{d['usp1']}. Honestly, {d.get('usp2','game changer')}.",
         lambda d: d['usp1'][:35]),
        ("Recommend",  "wide",     "default",    "fade",     "Resolve",
         lambda d: f"向观众推荐 {d['short']}。{d['atm']}。真诚收尾。",
         lambda d: f"If {d.get('pain','this')} sounds familiar — try {d['short']}. Link in bio!",
         lambda d: f"真心推荐 ↓ {d.get('price','')}"[:35]),
    ],

    # ── TVC大片：氛围 → 亮相 → 细节 → 场景 → 高潮 → Logo ──
    "tvc_cinematic": [
        ("Atmosphere", "wide",     "eye_level", "cut",     "Hook",
         lambda d: f"电影感氛围铺垫。{d['atm']}。光影缓缓展开。",
         lambda d: "",
         lambda d: d['short'][:30]),
        ("Reveal",     "medium",   "low_hero",  "dissolve","Build",
         lambda d: f"{d['short']} 从光影中亮相。{d['atm']}。标志性轮廓。",
         lambda d: f"{d['short']}.",
         lambda d: d['short'][:30]),
        ("Detail",     "close_up", "top_down",  "cut",      "Turn",
         lambda d: f"极近特写 — {d['feat1']}。光线在产品表面流动。{d['atm']}。",
         lambda d: f"{d['feat1']}.",
         lambda d: d['feat1'][:35]),
        ("Lifestyle",  "medium",   "default",    "cut",      "Develop",
         lambda d: f"在 {d.get('scene1','高端场景')} 中使用。{d['atm']}。品牌调性完美融入。",
         lambda d: f"Designed for {d.get('scene1','those who demand the best')}.",
         lambda d: f"为{d.get('scene1','品位生活')}而设计"[:35]),
        ("Climax",     "close_up", "low_hero",  "dissolve","Escalate",
         lambda d: f"情绪高潮 — {d['usp1']}。{d['atm']}。极具张力。",
         lambda d: f"{d['usp1']}.",
         lambda d: d['usp1'][:35]),
        ("Brand",      "wide",     "eye_level", "fade",     "Resolve",
         lambda d: f"品牌 Logo + {d['short']}。{d['atm']}。优雅收尾。",
         lambda d: f"{d['short']}. {d.get('usp1','Experience excellence')}." + (f" {d.get('price','')}" if d.get('price') else ""),
         lambda d: f"{d['short']} {d.get('price','')}"[:35]),
    ],

    # ── 场景生活：场景 → 融入 → 细节 → 另一场景 → 利益 → 号召 ──
    "scene_lifestyle": [
        ("SceneSet",   "wide",     "eye_level", "cut",     "Hook",
         lambda d: f"美丽的 {d.get('scene1','生活场景')} 全景。{d['atm']}。令人向往。",
         lambda d: f"Imagine {d.get('scene1','this')}.",
         lambda d: f"想象{d.get('scene1','这样的生活')}"[:35]),
        ("InScene",    "medium",   "default",    "dissolve","Build",
         lambda d: f"{d['short']} 自然融入 {d.get('scene1','场景')}。{d['atm']}。",
         lambda d: f"In {d.get('scene1','your space')}, {d['short']} fits perfectly.",
         lambda d: f"完美融入{d.get('scene1','你的空间')}"[:35]),
        ("Detail",     "close_up", "45_degree", "cut",      "Turn",
         lambda d: f"细节特写 — {d['feat1']}。{d['atm']}。质感呈现。",
         lambda d: f"{d['feat1']}.",
         lambda d: d['feat1'][:35]),
        ("Scene2",     "medium",   "default",    "cut",      "Develop",
         lambda d: f"在 {d.get('scene2',d.get('scene1','另一场景'))} 中同样出色。{d['atm']}。",
         lambda d: f"Whether {d.get('scene1','here')} or {d.get('scene2','there')} — it belongs.",
         lambda d: f"{d.get('scene1','任何场景')}都合适"[:35]),
        ("Benefit",    "close_up", "low_hero",  "dissolve","Escalate",
         lambda d: f"{d['short']} 带来的生活品质提升 — {d['usp1']}。{d['atm']}。",
         lambda d: f"{d['usp1']}. {d.get('usp2','')}",
         lambda d: d['usp1'][:35]),
        ("CTA",        "wide",     "default",    "fade",     "Resolve",
         lambda d: f"美好生活 + {d['short']} + CTA。{d['atm']}。",
         lambda d: f"Bring {d['short']} into your {d.get('scene1','life')}. Link in bio." + (f" {d.get('price','')}" if d.get('price') else ""),
         lambda d: f"拥有同款 ↓ {d.get('price','')}"[:35]),
    ],

    # ── 对比测评：之前→旧痛点→产品→对比→差异→结论 ──
    "comparison_test": [
        ("Before",     "wide",     "eye_level", "cut",     "Hook",
         lambda d: f"使用前的场景 — {d['pain']}。{d['atm']}。",
         lambda d: d['hook'],
         lambda d: d['hook'][:40]),
        ("OldWay",     "medium",   "default",    "dissolve","Build",
         lambda d: f"旧方案的痛点放大 — {d.get('pain2',d['pain'])}。{d['atm']}。效果不佳。",
         lambda d: f"Traditional solutions? {d.get('pain2','They fail')}.",
         lambda d: f"传统方案: {d.get('pain2','效果不佳')}"[:35]),
        ("Product",    "medium",   "45_degree", "cut",      "Turn",
         lambda d: f"{d['short']} 登场。{d['atm']}。{d['human_scene']}。",
         lambda d: f"Now, {d['short']} — {d['feat1']}.",
         lambda d: d['feat1'][:35]),
        ("Compare",    "close_up", "top_down",  "cut",      "Develop",
         lambda d: f"A/B 对比 — {d['feat2']} vs 传统方案。{d['atm']}。",
         lambda d: f"See the difference? {d['feat2']}.",
         lambda d: f"对比: {d['feat2'][:30]}"[:35]),
        ("Difference", "close_up", "low_hero",  "dissolve","Escalate",
         lambda d: f"关键差异 — {d['usp1']}。{d['usp2']}。{d['atm']}。",
         lambda d: f"{d['usp1']}. The difference is clear.",
         lambda d: d['usp1'][:35]),
        ("Verdict",    "wide",     "default",    "fade",     "Resolve",
         lambda d: f"结论 + {d['short']} + CTA。{d['atm']}。",
         lambda d: f"Stop settling. Choose {d['short']}. Link in bio." + (f" {d.get('price','')}" if d.get('price') else ""),
         lambda d: f"选{d['short']} ↓ {d.get('price','')}"[:35]),
    ],

    # ── 开箱体验：包裹→第一眼→细节→功能→惊喜→CTA ──
    "unboxing_experience": [
        ("BoxReveal",  "wide",     "eye_level", "cut",     "Hook",
         lambda d: f"包裹/包装盒出现在画面中。{d['atm']}。期待感。",
         lambda d: f"Guess what just arrived? {d['short']}!",
         lambda d: f"开箱 {d['short'][:25]}"[:35]),
        ("FirstLook",  "medium",   "45_degree", "dissolve","Build",
         lambda d: f"打开包装，{d['short']} 第一眼。{d['atm']}。{d['human_scene']}。",
         lambda d: f"First impression — {d.get('feat1','stunning')}.",
         lambda d: f"第一印象: {d.get('feat1','惊艳')}"[:35]),
        ("DetailCU",   "close_up", "top_down",  "cut",      "Turn",
         lambda d: f"极近特写 {d['feat1']} 和 {d.get('feat2','细节')}。{d['atm']}。",
         lambda d: f"Look at {d['feat1']}. {d.get('feat2','Incredible detail')}.",
         lambda d: d['feat1'][:35]),
        ("Walkthrough","medium",   "default",    "cut",      "Develop",
         lambda d: f"功能介绍 — {d.get('feat2',d['feat1'])}。{d['atm']}。{d['human_scene']}。",
         lambda d: f"It also has {d.get('feat2','amazing features')}. {d.get('feat3','')}",
         lambda d: (d.get('feat2') or '')[:35]),
        ("WowMoment",  "close_up", "low_hero",  "dissolve","Escalate",
         lambda d: f"惊喜发现 — {d['usp1']}。{d['atm']}。超预期。",
         lambda d: f"The best part? {d['usp1']}. {d.get('usp2','')}",
         lambda d: d['usp1'][:35]),
        ("CTA",        "wide",     "default",    "fade",     "Resolve",
         lambda d: f"{d['short']} + 包装 + CTA。{d['atm']}。",
         lambda d: f"Get your own {d['short']}. Link in bio!" + (f" Only {d['price']}." if d.get('price') else ""),
         lambda d: f"立即入手 ↓ {d.get('price','')}"[:35]),
    ],
}

# 兜底，当 video_type 未知时用痛点解决结构
DEFAULT_VIDEO_TYPE = "pain_point_relief"


def build_continuity_anchors(style: dict, creative: dict = None, product_info: dict = None) -> str:
    """构建全局视觉锚点，确保所有分镜画面一致。"""
    anchors = [
        "同一产品外观在所有镜头中保持一致",
        "统一的电影级调色",
        "统一的光影风格",
    ]
    vs = style.get("visual_style", "")
    if vs == "clean_minimal":
        anchors.append("极简干净的视觉语言，无多余元素")
    elif vs == "lifestyle_warm":
        anchors.append("温暖的室内自然光，生活感场景")
    elif vs == "tech_futuristic":
        anchors.append("深色调科技感，蓝色/紫色氛围光")

    cam = style.get("camera", "")
    light = style.get("lighting", "")
    anchors.append(f"光影弧线: opening_bright_to_{light}_climax")

    if creative:
        if creative.get("visual_metaphor"):
            anchors.append(f"视觉隐喻: {creative['visual_metaphor']}")
        if creative.get("brand_tone"):
            anchors.append(f"品牌调性: {creative['brand_tone']}")

    if product_info:
        title = product_info.get("title", "")
        if title:
            anchors.append(f"产品 {title[:40]} 外观一致")

    return "；".join(anchors)


def _camera_for_style(camera: str, shot_purpose: str) -> str:
    """根据风格维度+镜头目的推导实际运镜方式。"""
    camera_map = {
        "smooth_cinematic": {
            "Problem": "slow_push_in", "Agitation": "dolly_right", "Solution": "tracking_arc",
            "Mechanism": "steadicam_float", "Proof": "slow_push_in", "CTA": "slow_pull_out",
            "Intro": "steadicam_float", "Discovery": "focus_rack", "Usage": "steadicam_float",
            "Result": "slow_push_in", "Recommend": "slow_pull_out",
            "Atmosphere": "slow_push_in", "Reveal": "tracking_arc", "Detail": "macro_pan",
            "Lifestyle": "steadicam_float", "Climax": "slow_push_in", "Brand": "slow_pull_out",
            "SceneSet": "slow_push_in", "InScene": "dolly_right", "Scene2": "steadicam_float",
            "Benefit": "slow_push_in",
            "Before": "slow_push_in", "OldWay": "dolly_right", "Compare": "focus_rack",
            "Difference": "slow_push_in", "Verdict": "slow_pull_out",
            "BoxReveal": "slow_push_in", "FirstLook": "dolly_right", "DetailCU": "macro_pan",
            "Walkthrough": "steadicam_float", "WowMoment": "slow_push_in",
        },
        "dynamic_handheld": {
            "Problem": "whip_pan", "Agitation": "handheld_walk", "Solution": "snap_zoom",
            "Mechanism": "handheld_subtle", "Proof": "crash_zoom", "CTA": "handheld_settle",
            "Intro": "handheld_walk", "Discovery": "snap_zoom", "Usage": "handheld_subtle",
            "Result": "crash_zoom", "Recommend": "handheld_settle",
            "Atmosphere": "whip_pan", "Reveal": "snap_zoom", "Detail": "macro_pan",
            "Lifestyle": "handheld_subtle", "Climax": "crash_zoom", "Brand": "handheld_settle",
            "SceneSet": "handheld_subtle", "InScene": "handheld_walk", "Scene2": "handheld_subtle",
            "Benefit": "crash_zoom",
            "Before": "whip_pan", "OldWay": "handheld_walk", "Compare": "focus_rack",
            "Difference": "crash_zoom", "Verdict": "handheld_settle",
            "BoxReveal": "handheld_walk", "FirstLook": "snap_zoom", "DetailCU": "macro_pan",
            "Walkthrough": "handheld_subtle", "WowMoment": "crash_zoom",
        },
        "macro_detail": {
            "Problem": "extreme_slow_push", "Agitation": "focus_rack", "Solution": "macro_pan",
            "Mechanism": "static", "Proof": "depth_reveal", "CTA": "slow_pull_out",
            "Intro": "macro_pan", "Discovery": "focus_rack", "Usage": "static",
            "Result": "depth_reveal", "Recommend": "slow_pull_out",
            "Atmosphere": "extreme_slow_push", "Reveal": "macro_pan", "Detail": "extreme_slow_push",
            "Lifestyle": "static", "Climax": "depth_reveal", "Brand": "slow_pull_out",
            "SceneSet": "extreme_slow_push", "InScene": "macro_pan", "Scene2": "static",
            "Benefit": "depth_reveal",
            "Before": "extreme_slow_push", "OldWay": "focus_rack", "Compare": "focus_rack",
            "Difference": "depth_reveal", "Verdict": "slow_pull_out",
            "BoxReveal": "macro_pan", "FirstLook": "focus_rack", "DetailCU": "extreme_slow_push",
            "Walkthrough": "static", "WowMoment": "depth_reveal",
        },
    }
    default_moves = {
        "Problem": "slow_push_in", "Agitation": "dolly_right", "Solution": "static",
        "Mechanism": "handheld_subtle", "Proof": "slow_push_in", "CTA": "slow_pull_out",
        "Intro": "static", "Discovery": "static", "Usage": "handheld_subtle",
        "Result": "slow_push_in", "Recommend": "slow_pull_out",
        "Atmosphere": "slow_push_in", "Reveal": "static", "Detail": "static",
        "Lifestyle": "handheld_subtle", "Climax": "slow_push_in", "Brand": "slow_pull_out",
        "SceneSet": "static", "InScene": "dolly_right", "Scene2": "handheld_subtle",
        "Benefit": "slow_push_in",
        "Before": "slow_push_in", "OldWay": "dolly_right", "Compare": "static",
        "Difference": "slow_push_in", "Verdict": "slow_pull_out",
        "BoxReveal": "static", "FirstLook": "dolly_right", "DetailCU": "static",
        "Walkthrough": "handheld_subtle", "WowMoment": "slow_push_in",
    }
    return camera_map.get(camera, default_moves).get(shot_purpose, "static")


def _human_scene(human_cfg: str, title: str, context: str = "") -> str:
    """根据 human 维度生成人物相关描述。"""
    if human_cfg == "no_human":
        return f"{title} — {context}".rstrip(" —")
    elif human_cfg == "hands_only":
        return f"手部出镜操作 {title} — {context}".rstrip(" —")
    else:
        return f"真实用户使用 {title} — {context}".rstrip(" —")


def _atmosphere(vs: str) -> str:
    """视觉风格 → 场景氛围描述。"""
    return {
        "clean_minimal": "极简干净背景，柔和中性色调，无干扰元素",
        "lifestyle_warm": "温暖家居场景，自然材质，生活气息",
        "tech_futuristic": "深色科技感背景，蓝紫氛围光，未来感",
    }.get(vs, "专业产品展示")


def _angle(style: dict, hint: str) -> str:
    """根据风格默认角度 + shot hint 返回实际角度。"""
    default = style.get("angle", "eye_level")
    if hint == "45_degree" and default == "eye_level":
        return "45_degree"
    if hint == "low_hero" and default == "eye_level":
        return "low_hero"
    return default


# ═══════════════════════════════════════════════════════════════════════════
# 主脚本生成
# ═══════════════════════════════════════════════════════════════════════════

def _build_data(product_info: dict, style: dict, platform: str, video_type: str) -> dict:
    """从产品分析数据 + 风格 + 平台构建所有 shot 会用到的数据字典。"""
    cfg = PLATFORM_CONFIG.get(platform, PLATFORM_CONFIG["tiktok"])
    title = product_info.get("title", "this product")
    short_name = " ".join(title.replace("Amazon.com:", "").replace("Amazon.com", "").split()[:4])

    vs = style.get("visual_style", "clean_minimal")
    angle = style.get("angle", "eye_level")
    human = style.get("human", "no_human")

    hooks   = product_info.get("video_hook_angles", [])
    pains   = product_info.get("pain_points", [])
    scenes  = product_info.get("use_scenarios", [])
    feats   = product_info.get("key_features", [])
    usps    = product_info.get("unique_selling_points", [])
    aud     = product_info.get("target_audience", [])
    desc    = product_info.get("product_summary", product_info.get("description", ""))
    price   = product_info.get("price", "")
    shot_dur = round(cfg["duration"] / 6, 1)

    hook_text = hooks[0] if hooks else f"Is {title.lower()} worth it?"
    pain_text = pains[0] if pains else "everyday frustration"
    pain2     = pains[1] if len(pains) > 1 else pain_text
    scene1    = scenes[0] if scenes else "your daily routine"
    scene2    = scenes[1] if len(scenes) > 1 else scene1
    feat1     = feats[0] if feats else (desc or "amazing features")[:50]
    feat2     = feats[1] if len(feats) > 1 else feat1
    feat3     = feats[2] if len(feats) > 2 else feat2
    usp1      = usps[0] if usps else f"why {title} stands out"
    usp2      = usps[1] if len(usps) > 1 else usp1
    aud1      = aud[0] if aud else "you"
    atm       = _atmosphere(vs)
    human_scene = _human_scene(human, title, "")

    return {
        "title": title, "short": short_name, "atm": atm, "human_scene": human_scene,
        "hook": hook_text, "pain": pain_text, "pain2": pain2,
        "scene1": scene1, "scene2": scene2,
        "feat1": feat1, "feat2": feat2, "feat3": feat3,
        "usp1": usp1, "usp2": usp2, "aud": aud1, "price": price,
        "vs": vs, "angle": angle, "human": human, "shot_dur": shot_dur,
    }


def _generate_shots(data: dict, style: dict, video_type: str) -> list[dict]:
    """按视频类型对应的叙事结构生成 6 镜。"""
    structure = NARRATIVE.get(video_type, NARRATIVE[DEFAULT_VIDEO_TYPE])
    cam = style.get("camera", "smooth_cinematic")
    light = style.get("lighting", "soft_studio")

    shots = []
    for i, (purpose, shot_type, angle_hint, transition, cm_purpose, scene_fn, vo_fn, sub_fn) in enumerate(structure):
        ang = _angle(style, angle_hint)
        shots.append({
            "number": i + 1,
            "duration": data["shot_dur"],
            "shot_type": shot_type,
            "angle": ang,
            "lighting": light,
            "camera_move": _camera_for_style(cam, cm_purpose),
            "purpose": purpose,
            "transition": transition,
            "scene": scene_fn(data),
            "voiceover": vo_fn(data),
            "subtitle": sub_fn(data),
        })
    return shots


def _template_data(product_info: dict, style: dict, platform: str) -> dict:
    """模板兜底 — 无 AI 数据时构造基础 data。"""
    title = product_info.get("title", "this product")
    short_name = " ".join(title.replace("Amazon.com:", "").split()[:4])
    desc = product_info.get("description", "amazing features")[:50]
    price = product_info.get("price", "")
    cfg = PLATFORM_CONFIG.get(platform, PLATFORM_CONFIG["tiktok"])
    shot_dur = round(cfg["duration"] / 6, 1)
    vs = style.get("visual_style", "clean_minimal")
    atm = _atmosphere(vs)
    human = style.get("human", "no_human")
    human_scene = _human_scene(human, title, "")

    return {
        "title": title, "short": short_name, "atm": atm, "human_scene": human_scene,
        "hook": f"Tired of {title.lower()} letting you down?",
        "pain": "everyday frustration", "pain2": "wasted time and money",
        "scene1": "your daily routine", "scene2": "every occasion",
        "feat1": desc, "feat2": "precision design", "feat3": "premium quality",
        "usp1": f"Why {title} stands out", "usp2": "quality you can feel",
        "aud": "you", "price": price,
        "vs": vs, "angle": style.get("angle", "eye_level"),
        "human": human, "shot_dur": shot_dur,
    }


def generate_script(product_info: dict, platform: str, style: dict,
                    video_type: str = "", creative: dict = None) -> list[dict]:
    """为指定平台 + 视频类型生成分镜脚本。"""
    has_ai = product_info.get("ai_analyzed") and product_info.get("pain_points")
    vt = video_type or DEFAULT_VIDEO_TYPE

    if has_ai:
        data = _build_data(product_info, style, platform, vt)
    else:
        data = _template_data(product_info, style, platform)

    shots = _generate_shots(data, style, vt)

    # 注入全局视觉锚点
    continuity = build_continuity_anchors(style, creative, product_info)
    for shot in shots:
        shot["continuity_anchor"] = continuity

    return shots


async def generate_all_scripts(product_info: dict, platforms: list[str],
                               style: dict, video_type: str = "",
                               creative: dict = None) -> dict[str, list[dict]]:
    """为所有平台生成分镜脚本。"""
    from ..models import ShotItem
    import logging
    logger = logging.getLogger(__name__)

    scripts = {}
    for plat in platforms:
        raw = generate_script(product_info, plat, style, video_type, creative)
        validated = []
        for shot in raw:
            try:
                validated.append(ShotItem(**shot).model_dump())
            except Exception as e:
                logger.warning(f"[{plat}] Shot {shot.get('number', '?')} validation: {e}, using raw")
                validated.append(shot)
        scripts[plat] = validated
    return scripts

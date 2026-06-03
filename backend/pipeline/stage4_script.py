"""
Stage 4 — AI 驱动的分镜脚本生成。

优先使用 Stage 1 的 AI 产品分析字段 (pain_points, use_scenarios,
video_hook_angles, key_features, unique_selling_points, target_audience)。
无 AI 数据时回退到风格驱动的模板模式。
"""

PLATFORM_CONFIG = {
    "tiktok": {"ratio": "9:16", "duration": 12, "tone": "年轻快节奏", "hook_seconds": 3},
    "amazon": {"ratio": "16:9", "duration": 15, "tone": "专业产品展示", "hook_seconds": 5},
    "youtube": {"ratio": "9:16", "duration": 15, "tone": "信息量丰富", "hook_seconds": 3},
    "instagram": {"ratio": "9:16", "duration": 12, "tone": "视觉驱动", "hook_seconds": 2},
}


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
    light_arc = style.get("light_arc", f"opening_bright_to_{light}_climax")
    anchors.append(f"光影弧线: {light_arc}")

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
        "smooth_cinematic": {"Hook": "slow_push_in", "Build": "dolly_right", "Turn": "tracking_arc",
                             "Develop": "steadicam_float", "Escalate": "slow_push_in", "Resolve": "slow_pull_out"},
        "dynamic_handheld": {"Hook": "whip_pan", "Build": "handheld_walk", "Turn": "snap_zoom",
                             "Develop": "handheld_subtle", "Escalate": "crash_zoom", "Resolve": "handheld_settle"},
        "macro_detail": {"Hook": "extreme_slow_push", "Build": "focus_rack", "Turn": "macro_pan",
                         "Develop": "static", "Escalate": "depth_reveal", "Resolve": "slow_pull_out"},
    }
    default_moves = {"Hook": "slow_push_in", "Build": "dolly_right", "Turn": "static",
                     "Develop": "handheld_subtle", "Escalate": "slow_push_in", "Resolve": "slow_pull_out"}
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


# ── Template script (fallback — 无 AI 数据时使用) ──────────────────────

def _template_script(product_info: dict, platform: str, style: dict,
                     creative: dict) -> list[dict]:
    """风格+平台驱动的模板脚本。"""
    cfg = PLATFORM_CONFIG.get(platform, PLATFORM_CONFIG["tiktok"])
    title = product_info.get("title", "this product")
    feat = product_info.get("description", "amazing features")[:50]
    shots_count = 6
    shot_dur = round(cfg["duration"] / shots_count, 1)

    big_idea = creative.get("big_idea", "") if creative else ""
    hook_moment = creative.get("hook_moment", "") if creative else ""

    vs = style.get("visual_style", "clean_minimal")
    cam = style.get("camera", "smooth_cinematic")
    light = style.get("lighting", "soft_studio")
    angle = style.get("angle", "eye_level")
    human = style.get("human", "no_human")
    atm = _atmosphere(vs)

    return [
        {"number": 1, "duration": shot_dur, "shot_type": "wide",
         "angle": angle, "lighting": light,
         "camera_move": _camera_for_style(cam, "Hook"), "purpose": "Hook", "transition": "cut",
         "scene": f"{_human_scene(human, title, '品牌感开场。')} {atm}。{big_idea} {hook_moment}",
         "voiceover": f"Introducing the all-new {title}.",
         "subtitle": title[:30]},
        {"number": 2, "duration": shot_dur, "shot_type": "medium",
         "angle": "45_degree" if angle == "eye_level" else angle,
         "lighting": light, "camera_move": _camera_for_style(cam, "Build"), "purpose": "Build", "transition": "dissolve",
         "scene": f"{_human_scene(human, title, '展示设计细节和质感。')} {atm}。",
         "voiceover": "Designed with precision and care.",
         "subtitle": "精工设计"},
        {"number": 3, "duration": shot_dur, "shot_type": "close_up",
         "angle": "top_down", "lighting": light,
         "camera_move": _camera_for_style(cam, "Turn"), "purpose": "Turn", "transition": "cut",
         "scene": f"极近微距展示 {feat} 的细节。{atm}。",
         "voiceover": f"Look closer. {feat}.",
         "subtitle": feat[:30]},
        {"number": 4, "duration": shot_dur, "shot_type": "medium",
         "angle": angle, "lighting": light,
         "camera_move": _camera_for_style(cam, "Develop"), "purpose": "Develop", "transition": "cut",
         "scene": f"{_human_scene(human, title, '真实使用场景中。')} {atm}。",
         "voiceover": "Built for your everyday life.",
         "subtitle": "为日常而生"},
        {"number": 5, "duration": shot_dur, "shot_type": "close_up",
         "angle": "low_hero" if angle == "eye_level" else angle,
         "lighting": "dramatic_rim" if light == "soft_studio" else light,
         "camera_move": _camera_for_style(cam, "Escalate"), "purpose": "Escalate", "transition": "dissolve",
         "scene": f"{title} — 英雄镜头。{atm}，光影在产品上流动，品质感拉满。",
         "voiceover": "Experience the difference.",
         "subtitle": "品质之选"},
        {"number": 6, "duration": shot_dur, "shot_type": "wide",
         "angle": angle, "lighting": light,
         "camera_move": _camera_for_style(cam, "Resolve"), "purpose": "Resolve", "transition": "fade",
         "scene": f"{_human_scene(human, title, 'CTA 收尾。')} 品牌 Logo + 行动号召。{atm}。",
         "voiceover": "Get yours today. Link in bio.",
         "subtitle": "立即购买 ↓"},
    ]


# ── AI-powered script (使用 AI 产品分析数据) ────────────────────────────

def _ai_script(product_info: dict, platform: str, style: dict,
               creative: dict) -> list[dict]:
    """基于 AI 产品分析 + 风格选择 + 创意方向生成针对性分镜脚本。"""
    cfg = PLATFORM_CONFIG.get(platform, PLATFORM_CONFIG["tiktok"])
    title = product_info.get("title", "this product")
    shots_count = 6
    shot_dur = round(cfg["duration"] / shots_count, 1)

    # ── AI 数据 ──
    hooks = product_info.get("video_hook_angles", [])
    pains = product_info.get("pain_points", [])
    scenes = product_info.get("use_scenarios", [])
    features = product_info.get("key_features", [])
    usps = product_info.get("unique_selling_points", [])
    audience = product_info.get("target_audience", [])
    desc = product_info.get("product_description", product_info.get("description", ""))

    # ── 风格维度 ──
    vs = style.get("visual_style", "clean_minimal")
    cam = style.get("camera", "smooth_cinematic")
    light = style.get("lighting", "soft_studio")
    angle = style.get("angle", "eye_level")
    human = style.get("human", "no_human")
    atm = _atmosphere(vs)

    # ── 提取具体内容，无则兜底 ──
    hook_text = hooks[0] if hooks else f"Tired of {title.lower()} letting you down?"
    pain_text = pains[0] if pains else "everyday frustration"
    scene1 = scenes[0] if scenes else "your daily routine"
    scene2 = scenes[1] if len(scenes) > 1 else scene1
    feat1 = features[0] if features else desc[:50]
    feat2 = features[1] if len(features) > 1 else feat1
    feat3 = features[2] if len(features) > 2 else feat2
    usp1 = usps[0] if usps else f"why {title} stands out"
    usp2 = usps[1] if len(usps) > 1 else usp1
    aud1 = audience[0] if audience else "you"
    price = product_info.get("price", "")

    # 构造产品简短名（取前 4 个词）
    short_name = " ".join(title.replace("Amazon.com:", "").replace("Amazon.com", "").split()[:4])

    return [
        # Shot 1: Hook — 痛点抓人
        {"number": 1, "duration": shot_dur, "shot_type": "wide",
         "angle": angle, "lighting": light,
         "camera_move": _camera_for_style(cam, "Hook"), "purpose": "Hook", "transition": "cut",
         "scene": f"一针见血的痛点画面 — {pain_text}。{atm}。",
         "voiceover": hook_text,
         "subtitle": hook_text[:40]},

        # Shot 2: Build — 产品亮相 + 核心功能
        {"number": 2, "duration": shot_dur, "shot_type": "medium",
         "angle": "45_degree" if angle == "eye_level" else angle, "lighting": light,
         "camera_move": _camera_for_style(cam, "Build"), "purpose": "Build", "transition": "dissolve",
         "scene": f"{_human_scene(human, title, f'亮相。')} 突出 {feat1}。{atm}。",
         "voiceover": f"Meet {short_name}. {feat1}.",
         "subtitle": feat1[:35]},

        # Shot 3: Turn — 深入功能/场景
        {"number": 3, "duration": shot_dur, "shot_type": "close_up",
         "angle": "top_down", "lighting": light,
         "camera_move": _camera_for_style(cam, "Turn"), "purpose": "Turn", "transition": "cut",
         "scene": f"特写 — {feat2}。{atm}。{_human_scene(human, title, '细节展示。')}",
         "voiceover": f"{feat2}. Plus, {feat3}." if feat3 else feat2,
         "subtitle": feat2[:35]},

        # Shot 4: Develop — 真实使用场景
        {"number": 4, "duration": shot_dur, "shot_type": "medium",
         "angle": angle, "lighting": light,
         "camera_move": _camera_for_style(cam, "Develop"), "purpose": "Develop", "transition": "cut",
         "scene": f"{_human_scene(human, title, f'在 {scene1} 中使用。')} {atm}。",
         "voiceover": f"Perfect for {scene1} — or {scene2}.",
         "subtitle": f"{scene1} · {scene2}"[:35]},

        # Shot 5: Escalate — USP + 情绪高潮
        {"number": 5, "duration": shot_dur, "shot_type": "close_up",
         "angle": "low_hero" if angle == "eye_level" else angle,
         "lighting": "dramatic_rim" if light == "soft_studio" else light,
         "camera_move": _camera_for_style(cam, "Escalate"), "purpose": "Escalate", "transition": "dissolve",
         "scene": f"{title} 英雄镜头。{usp1}。{usp2}。{atm}，光影流动。",
         "voiceover": f"{usp1}. Because {aud1} deserve better.",
         "subtitle": usp1[:35]},

        # Shot 6: Resolve — CTA
        {"number": 6, "duration": shot_dur, "shot_type": "wide",
         "angle": angle, "lighting": light,
         "camera_move": _camera_for_style(cam, "Resolve"), "purpose": "Resolve", "transition": "fade",
         "scene": f"{_human_scene(human, title, '产品+价格+CTA。')} {f'{price} ' if price else ''}· 品牌 Logo。{atm}。",
         "voiceover": f"Get the {short_name}. Link in bio." + (f" Only {price}." if price else ""),
         "subtitle": f"立即购买 ↓ {price}"[:35]},
    ]


# ── 主入口 ──────────────────────────────────────────────────────────────

async def generate_script(product_info: dict, platform: str, style: dict,
                          creative: dict = None) -> list[dict]:
    """为指定平台生成分镜脚本。AI 数据可用时用 AI 模式。"""
    has_ai = product_info.get("ai_analyzed") and product_info.get("pain_points")

    if has_ai:
        shots = _ai_script(product_info, platform, style, creative)
    else:
        shots = _template_script(product_info, platform, style, creative)

    # 注入全局视觉锚点
    continuity = build_continuity_anchors(style, creative, product_info)
    for shot in shots:
        shot["continuity_anchor"] = continuity

    return shots


async def generate_all_scripts(product_info: dict, platforms: list[str],
                               style: dict, creative: dict = None) -> dict[str, list[dict]]:
    """为所有平台生成分镜脚本。"""
    from ..models import ShotItem
    import logging
    logger = logging.getLogger(__name__)

    scripts = {}
    for plat in platforms:
        raw = await generate_script(product_info, plat, style, creative)
        validated = []
        for shot in raw:
            try:
                validated.append(ShotItem(**shot).model_dump())
            except Exception as e:
                logger.warning(f"[{plat}] Shot {shot.get('number', '?')} validation: {e}, using raw")
                validated.append(shot)
        scripts[plat] = validated
    return scripts

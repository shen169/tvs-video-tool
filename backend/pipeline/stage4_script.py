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

    # 从风格提取
    vs = style.get("visual_style", "")
    if vs == "clean_minimal":
        anchors.append("极简干净的视觉语言，无多余元素")
    elif vs == "lifestyle_warm":
        anchors.append("温暖的室内自然光，生活感场景")
    elif vs == "tech_futuristic":
        anchors.append("深色调科技感，蓝色/紫色氛围光")

    # Light arc
    light_arc = style.get("light_arc", "")
    if not light_arc:
        cam = style.get("camera", "")
        light = style.get("lighting", "")
        light_arc = f"opening_bright_to_{light}_climax"

    anchors.append(f"光影弧线: {light_arc}")

    # 从创意提取
    if creative:
        if creative.get("visual_metaphor"):
            anchors.append(f"视觉隐喻: {creative['visual_metaphor']}")
        if creative.get("brand_tone"):
            anchors.append(f"品牌调性: {creative['brand_tone']}")

    # 从产品提取
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


def _human_scene(cfg: str, title: str, context: str = "") -> str:
    """根据 human 维度生成人物相关描述。"""
    if cfg == "no_human":
        return f"{title} 纯产品展示，{context}".rstrip("，")
    elif cfg == "hands_only":
        return f"手部出镜操作 {title}，{context}".rstrip("，")
    else:  # full_person
        return f"模特使用 {title}，{context}".rstrip("，")


async def generate_script(product_info: dict, platform: str, style: dict, creative: dict = None) -> list[dict]:
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

    # 根据 visual_style 派生场景氛围词
    atmosphere = {
        "clean_minimal": "极简干净背景，柔和中性色调，无干扰元素",
        "lifestyle_warm": "温暖家居场景，自然材质，生活气息",
        "tech_futuristic": "深色科技感背景，蓝紫氛围光，未来感",
    }.get(vs, "专业产品展示")

    shots = [
        {
            "number": 1, "duration": shot_dur, "shot_type": "wide",
            "angle": angle, "lighting": light,
            "camera_move": _camera_for_style(cam, "Hook"), "purpose": "Hook",
            "transition": "cut",
            "scene": f"{_human_scene(human, title, '品牌感开场。')} {atmosphere}。{big_idea} {hook_moment}",
            "voiceover": f"Introducing the all-new {title}." if human != "full_person" else f"Meet the {title}. Your daily upgrade.",
            "subtitle": title[:30],
        },
        {
            "number": 2, "duration": shot_dur, "shot_type": "medium",
            "angle": "45_degree" if angle == "eye_level" else angle,
            "lighting": light,
            "camera_move": _camera_for_style(cam, "Build"), "purpose": "Build",
            "transition": "dissolve",
            "scene": f"{_human_scene(human, title, '展示设计细节和质感。')} {atmosphere}。",
            "voiceover": f"Designed with precision and care.",
            "subtitle": "精工设计",
        },
        {
            "number": 3, "duration": shot_dur, "shot_type": "close_up",
            "angle": "top_down", "lighting": light,
            "camera_move": _camera_for_style(cam, "Turn"), "purpose": "Turn",
            "transition": "cut",
            "scene": f"极近微距展示 {feat} 的细节。{atmosphere}。",
            "voiceover": f"Look closer. {feat}.",
            "subtitle": feat[:30],
        },
        {
            "number": 4, "duration": shot_dur, "shot_type": "medium",
            "angle": angle, "lighting": light,
            "camera_move": _camera_for_style(cam, "Develop"), "purpose": "Develop",
            "transition": "cut",
            "scene": f"{_human_scene(human, title, '真实使用场景中。')} {atmosphere}。",
            "voiceover": "Built for your everyday life." if human != "full_person" else "It just fits your life.",
            "subtitle": "为日常而生",
        },
        {
            "number": 5, "duration": shot_dur, "shot_type": "close_up",
            "angle": "low_hero" if angle == "eye_level" else angle,
            "lighting": "dramatic_rim" if light == "soft_studio" else light,
            "camera_move": _camera_for_style(cam, "Escalate"), "purpose": "Escalate",
            "transition": "dissolve",
            "scene": f"{title} 英雄镜头。{atmosphere}，光影在产品上流动，品质感拉满。",
            "voiceover": "Experience the difference.",
            "subtitle": "品质之选",
        },
        {
            "number": 6, "duration": shot_dur, "shot_type": "wide",
            "angle": angle, "lighting": light,
            "camera_move": _camera_for_style(cam, "Resolve"), "purpose": "Resolve",
            "transition": "fade",
            "scene": f"{_human_scene(human, title, 'CTA 收尾。')} 品牌 Logo + 行动号召。{atmosphere}。",
            "voiceover": "Get yours today. Link in bio.",
            "subtitle": "立即购买 ↓",
        },
    ]

    # 注入 continuity_anchor 到每个分镜
    continuity = build_continuity_anchors(style, creative, product_info)
    for shot in shots:
        shot["continuity_anchor"] = continuity

    return shots


async def generate_all_scripts(product_info: dict, platforms: list[str], style: dict, creative: dict = None) -> dict[str, list[dict]]:
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
                logger.warning(f"[{plat}] Shot {shot.get('number', '?')} validation failed: {e}, using raw dict")
                validated.append(shot)
        scripts[plat] = validated
    return scripts

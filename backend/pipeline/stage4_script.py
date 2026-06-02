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


async def generate_script(product_info: dict, platform: str, style: dict, creative: dict = None) -> list[dict]:
    cfg = PLATFORM_CONFIG.get(platform, PLATFORM_CONFIG["tiktok"])
    title = product_info.get("title", "this product")
    feat = product_info.get("description", "amazing features")[:50]
    shots_count = 6
    shot_dur = round(cfg["duration"] / shots_count, 1)

    creative_label = creative.get("title", "") if creative else ""
    big_idea = creative.get("big_idea", "") if creative else ""

    shots = [
        {
            "number": 1, "duration": shot_dur, "shot_type": "wide",
            "angle": style.get("angle", "eye_level"),
            "lighting": style.get("lighting", "soft_studio"),
            "camera_move": "slow_push_in", "purpose": "Hook",
            "transition": "cut",
            "scene": f"{title} 完整展示，品牌感开场。{big_idea}",
            "voiceover": f"Introducing the all-new {title}.",
            "subtitle": title[:30],
        },
        {
            "number": 2, "duration": shot_dur, "shot_type": "medium",
            "angle": "45_degree", "lighting": style.get("lighting", "soft_studio"),
            "camera_move": "dolly_right", "purpose": "Build",
            "transition": "dissolve",
            "scene": f"从不同角度展示 {title} 的设计细节和质感",
            "voiceover": f"Designed with precision and care.",
            "subtitle": "精工设计",
        },
        {
            "number": 3, "duration": shot_dur, "shot_type": "close_up",
            "angle": "top_down", "lighting": "soft_studio",
            "camera_move": "static", "purpose": "Turn",
            "transition": "cut",
            "scene": f"极近微距展示 {feat} 的细节",
            "voiceover": f"Look closer. {feat}.",
            "subtitle": feat[:30],
        },
        {
            "number": 4, "duration": shot_dur, "shot_type": "medium",
            "angle": style.get("angle", "eye_level"),
            "lighting": "natural_window", "camera_move": "handheld_subtle",
            "purpose": "Develop", "transition": "cut",
            "scene": f"{title} 在实际使用场景中，真实感",
            "voiceover": "Built for your everyday life.",
            "subtitle": "为日常而生",
        },
        {
            "number": 5, "duration": shot_dur, "shot_type": "close_up",
            "angle": "low_hero", "lighting": "dramatic_rim",
            "camera_move": "slow_push_in", "purpose": "Escalate",
            "transition": "dissolve",
            "scene": f"{title} 英雄镜头。光影在产品上流动，强调品质感和高级感",
            "voiceover": "Experience the difference.",
            "subtitle": "品质之选",
        },
        {
            "number": 6, "duration": shot_dur, "shot_type": "wide",
            "angle": "eye_level", "lighting": "soft_studio",
            "camera_move": "slow_pull_out", "purpose": "Resolve",
            "transition": "fade",
            "scene": f"{title} CTA 收尾。品牌 Logo + 行动号召",
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
    scripts = {}
    for plat in platforms:
        scripts[plat] = await generate_script(product_info, plat, style, creative)
    return scripts

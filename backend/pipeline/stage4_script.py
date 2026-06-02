PLATFORM_CONFIG = {
    "tiktok": {"ratio": "9:16", "duration": 12, "tone": "年轻快节奏", "hook_seconds": 3},
    "amazon": {"ratio": "16:9", "duration": 15, "tone": "专业产品展示", "hook_seconds": 5},
    "youtube": {"ratio": "9:16", "duration": 15, "tone": "信息量丰富", "hook_seconds": 3},
    "instagram": {"ratio": "9:16", "duration": 12, "tone": "视觉驱动", "hook_seconds": 2},
}


async def generate_script(product_info: dict, platform: str, style: dict, creative: dict = None) -> list[dict]:
    cfg = PLATFORM_CONFIG.get(platform, PLATFORM_CONFIG["tiktok"])
    title = product_info.get("title", "this product")
    feat = product_info.get("description", "amazing features")[:50]
    shots_count = 6
    shot_dur = round(cfg["duration"] / shots_count, 1)

    creative_label = creative.get("title", "") if creative else ""
    big_idea = creative.get("big_idea", "") if creative else ""

    return [
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


async def generate_all_scripts(product_info: dict, platforms: list[str], style: dict, creative: dict = None) -> dict[str, list[dict]]:
    scripts = {}
    for plat in platforms:
        scripts[plat] = await generate_script(product_info, plat, style, creative)
    return scripts

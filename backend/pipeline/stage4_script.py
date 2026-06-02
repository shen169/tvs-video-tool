PLATFORM_CONFIG = {
    "tiktok": {"ratio": "9:16", "duration": 30, "tone": "年轻快节奏", "hook_seconds": 3},
    "amazon": {"ratio": "16:9", "duration": 45, "tone": "专业产品展示", "hook_seconds": 5},
    "youtube": {"ratio": "9:16", "duration": 45, "tone": "信息量丰富", "hook_seconds": 3},
    "instagram": {"ratio": "9:16", "duration": 30, "tone": "视觉驱动", "hook_seconds": 2},
}


async def generate_script(product_info: dict, platform: str, style: dict) -> list[dict]:
    cfg = PLATFORM_CONFIG.get(platform, PLATFORM_CONFIG["tiktok"])
    title = product_info.get("title", "this product")
    feat = product_info.get("description", "amazing features")[:50]
    shots_per = 5
    shot_dur = round(cfg["duration"] / shots_per, 1)
    return [
        {
            "number": 1, "duration": shot_dur, "shot_type": "wide",
            "angle": style.get("angle", "eye_level"),
            "lighting": style.get("lighting", "soft_studio"),
            "camera_move": "static",
            "scene": f"{title} 完整展示，品牌感开场",
            "voiceover": f"Introducing the {title}.",
            "subtitle": title[:30],
        },
        {
            "number": 2, "duration": shot_dur, "shot_type": "medium",
            "angle": "45_degree",
            "lighting": style.get("lighting", "soft_studio"),
            "camera_move": "slow_push_in",
            "scene": f"{title} 核心卖点特写",
            "voiceover": f"With {feat}, experience the difference.",
            "subtitle": feat[:30],
        },
        {
            "number": 3, "duration": shot_dur, "shot_type": "close_up",
            "angle": "top_down",
            "lighting": "soft_studio", "camera_move": "static",
            "scene": "关键细节微距展示",
            "voiceover": "Built with premium materials.",
            "subtitle": "高品质材质",
        },
        {
            "number": 4, "duration": shot_dur, "shot_type": "medium",
            "angle": style.get("angle", "eye_level"),
            "lighting": "natural_window", "camera_move": "dolly",
            "scene": "使用场景展示",
            "voiceover": "Perfect for your everyday life.",
            "subtitle": "融入你的生活",
        },
        {
            "number": 5, "duration": shot_dur, "shot_type": "wide",
            "angle": "low_hero",
            "lighting": "dramatic_rim", "camera_move": "slow_pull_out",
            "scene": f"{title} CTA 收尾",
            "voiceover": "Get yours today. Link in bio.",
            "subtitle": "立即购买 ↓",
        },
    ]


async def generate_all_scripts(product_info: dict, platforms: list[str], style: dict) -> dict[str, list[dict]]:
    scripts = {}
    for plat in platforms:
        scripts[plat] = await generate_script(product_info, plat, style)
    return scripts

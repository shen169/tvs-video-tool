STYLE_LIBRARY = {
    "visual_style": [
        {"id": "clean_minimal", "label": "简约干净", "desc": "白色/浅灰背景，产品为主"},
        {"id": "lifestyle_warm", "label": "生活温馨", "desc": "暖色调家居场景，真实感"},
        {"id": "tech_futuristic", "label": "科技未来", "desc": "深色背景，光影动感"},
    ],
    "camera": [
        {"id": "smooth_cinematic", "label": "电影感平滑", "desc": "稳定运镜，浅景深"},
        {"id": "dynamic_handheld", "label": "动感手持", "desc": "轻微晃动，临场感"},
        {"id": "macro_detail", "label": "微距细节", "desc": "极近距离，材质特写"},
    ],
    "lighting": [
        {"id": "soft_studio", "label": "柔光棚拍", "desc": "均匀柔和，无阴影"},
        {"id": "natural_window", "label": "自然窗光", "desc": "单侧自然光，有立体感"},
        {"id": "dramatic_rim", "label": "戏剧轮廓光", "desc": "暗背景+边缘光，高端感"},
    ],
    "angle": [
        {"id": "eye_level", "label": "平视", "desc": "与人眼齐平，自然视角"},
        {"id": "top_down", "label": "俯拍", "desc": "从上往下，适合桌面产品"},
        {"id": "low_hero", "label": "仰拍英雄", "desc": "低角度，产品显得高大"},
    ],
    "human": [
        {"id": "no_human", "label": "无人物", "desc": "纯产品展示"},
        {"id": "hands_only", "label": "手部出镜", "desc": "只露手操作产品"},
        {"id": "full_person", "label": "人物出镜", "desc": "模特使用产品"},
    ],
}


async def generate_style_options(product_info: dict) -> list[dict]:
    category = str(product_info.get("category_hints", []))
    is_tech = any(kw in category.lower() for kw in ["electronics", "tech"])

    return [
        {
            "id": "a", "label": "简约商务",
            "visual_style": "clean_minimal", "camera": "smooth_cinematic",
            "lighting": "soft_studio", "angle": "eye_level", "human": "hands_only",
            "description": "干净专业，适合 Amazon 主图和 TikTok 开场"
        },
        {
            "id": "b", "label": "生活场景",
            "visual_style": "lifestyle_warm", "camera": "dynamic_handheld",
            "lighting": "natural_window", "angle": "top_down", "human": "full_person",
            "description": "温馨真实，适合 TikTok/Reels 种草"
        },
        {
            "id": "c", "label": "科技感" if is_tech else "高端质感",
            "visual_style": "tech_futuristic" if is_tech else "clean_minimal",
            "camera": "macro_detail" if is_tech else "smooth_cinematic",
            "lighting": "dramatic_rim", "angle": "low_hero", "human": "no_human",
            "description": "强调产品质感和高级感，适合 YouTube Shorts"
        },
    ]

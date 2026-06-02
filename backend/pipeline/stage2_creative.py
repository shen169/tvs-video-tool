import logging
logger = logging.getLogger(__name__)

CREATIVE_NARRATIVE_MODELS = [
    "problem_solution", "emotional_resonance", "scene_contrast",
    "mechanism_reveal", "lifestyle_aspiration", "hero_journey"
]

WORLD_TYPES = ["product_world", "brand_world", "dual_world"]
PRODUCT_INTEGRATION_MODES = ["cinematic_breakdown", "brand_crosscut", "lifestyle_film"]

async def generate_creative_directions(product_info: dict) -> list[dict]:
    """基于产品分析生成 3 个创意方向提案。"""
    title = product_info.get("title", "this product")
    desc = product_info.get("description", "amazing features")[:200]
    category = str(product_info.get("category_hints", []))

    is_tech = any(kw in category.lower() for kw in ["electronics", "tech", "手机"])
    is_beauty = any(kw in category.lower() for kw in ["beauty", "skincare", "美妆"])
    is_home = any(kw in category.lower() for kw in ["home", "kitchen", "garden", "家具", "厨房"])

    directions = [
        {
            "id": "a",
            "title": "功能演示型" if is_tech else "问题解决型",
            "concept": f"{title} 核心功能演示" if is_tech else f"用{title}解决真实痛点",
            "big_idea": "Product as hero — 产品本身就是最好的叙事主体",
            "reason_to_watch": "直观看到产品能做什么，0 秒进入信息密度",
            "hook_moment": f"前 3 秒展示使用 {title} 前后的惊人对比",
            "visual_metaphor": "放大镜/显微镜视角 → 问题被看见 → 产品介入 → 问题消失",
            "world_type": "product_world",
            "product_integration_mode": "cinematic_breakdown",
            "narrative_model": "problem_solution",
            "brand_tone": "专业可信赖",
            "ai_feasibility": "high — 纯产品展示，AI 生图成功率高",
            "risk": "可能过于功能性，缺少情绪记忆点",
            "description": f"直截了当展示{title}的核心功能。问题-解决叙事模型，用视觉隐喻让产品卖点一目了然。适合理性决策型消费者。"
        },
        {
            "id": "b",
            "title": "生活方式型",
            "concept": f"{title} 融入理想生活场景",
            "big_idea": "产品不是主角，它带来的生活状态才是",
            "reason_to_watch": "向往感驱动——观众想看'用了这个产品后我会变成什么样子'",
            "hook_moment": f"一个让人向往的生活场景切入，{title} 自然出现在画面中",
            "visual_metaphor": "从暗淡到明亮的色调转换 → 产品作为转变的催化剂",
            "world_type": "brand_world" if not is_tech else "dual_world",
            "product_integration_mode": "lifestyle_film",
            "narrative_model": "lifestyle_aspiration",
            "brand_tone": "温暖向往",
            "ai_feasibility": "medium — 人物场景需注意一致性",
            "risk": "可能过于氛围化，产品卖点不够突出",
            "description": f"营造{title}带来的理想生活场景。用情感共鸣驱动购买欲，观众买的不是产品是生活方式。适合感性决策型消费者。"
        },
        {
            "id": "c",
            "title": "科技质感型" if is_tech else ("美学质感型" if is_beauty else "产品故事型"),
            "concept": f"用{title}的设计语言和质感说话",
            "big_idea": "每一个产品细节都在讲述品牌的故事",
            "reason_to_watch": "视觉享受 + 产品细节的仪式感让人沉浸",
            "hook_moment": "极近微距镜头展现产品材质纹理，配合光影变化",
            "visual_metaphor": "光线在产品表面流动 → 揭示设计细节 → 品质不言自明",
            "world_type": "product_world",
            "product_integration_mode": "cinematic_breakdown",
            "narrative_model": "mechanism_reveal",
            "brand_tone": "高级克制",
            "ai_feasibility": "high — 产品特写为主，AI 生图友好",
            "risk": "可能过于抽象，缺少实用信息",
            "description": f"用电影级的镜头语言展示{title}的设计美学。光影在产品表面流动，细节自己说话。适合高端定位产品，以质感取胜。"
        }
    ]

    logger.info(f"Generated {len(directions)} creative directions for {title}")
    return directions

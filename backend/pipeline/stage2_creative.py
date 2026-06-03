"""
Stage 2.5 — 创意方向提案。

基于 Stage 1 的 AI 产品分析生成 3 个创意方向。
AI 模式：利用 target_audience / pain_points / use_scenarios / video_hook_angles
Fallback 模式：基于品类关键词的启发式规则。
"""

import logging
logger = logging.getLogger(__name__)

CREATIVE_NARRATIVE_MODELS = [
    "problem_solution", "emotional_resonance", "scene_contrast",
    "mechanism_reveal", "lifestyle_aspiration", "hero_journey"
]

WORLD_TYPES = ["product_world", "brand_world", "dual_world"]
PRODUCT_INTEGRATION_MODES = ["cinematic_breakdown", "brand_crosscut", "lifestyle_film"]


def _fallback_directions(product_info: dict) -> list[dict]:
    """无 AI 分析时的启发式创意方向（与原逻辑兼容）。"""
    title = product_info.get("title", "this product")
    desc = product_info.get("description", "amazing features")[:200]
    category = str(product_info.get("category_hints", []))

    is_tech = any(kw in category.lower() for kw in ["electronics", "tech", "手机"])
    is_beauty = any(kw in category.lower() for kw in ["beauty", "skincare", "美妆"])
    is_home = any(kw in category.lower() for kw in ["home", "kitchen", "garden", "家具", "厨房"])

    return [
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


def _ai_directions(product_info: dict) -> list[dict]:
    """基于 AI 产品分析生成 3 个针对性创意方向。"""
    title = product_info.get("title", "this product")
    pain_points = product_info.get("pain_points", [])
    scenarios = product_info.get("use_scenarios", [])
    hooks = product_info.get("video_hook_angles", [])
    audience = product_info.get("target_audience", [])
    usps = product_info.get("unique_selling_points", [])

    # 用真实数据填充，没有则用 title 兜底
    hook1 = hooks[0] if hooks else f"What if you could fix {title.lower()} in seconds?"
    hook2 = hooks[1] if len(hooks) > 1 else f"Stop settling. Start {title.lower()}."
    hook3 = hooks[2] if len(hooks) > 2 else f"The {title.lower()} everyone's talking about."

    pain1 = pain_points[0] if pain_points else "your daily frustration"
    pain2 = pain_points[1] if len(pain_points) > 1 else pain1
    scene1 = scenarios[0] if scenarios else "your daily life"
    scene2 = scenarios[1] if len(scenarios) > 1 else scene1
    aud1 = audience[0] if audience else "smart shoppers"
    usp1 = usps[0] if usps else title

    return [
        {
            "id": "a",
            "title": "痛点直击型",
            "concept": f"从 {pain1} 出发，展示 {title} 如何成为解决方案",
            "big_idea": f"让观众在看到产品的瞬间就想喊'这就是我需要的！'",
            "reason_to_watch": f"如果你也曾因为{pain1}而烦恼，这 {len(hooks) * 2 + 5} 秒会让你看到希望",
            "hook_moment": hook1,
            "visual_metaphor": f"问题状态（灰暗/束缚/不适）→ {title} 介入 → 解决状态（明亮/自由/舒适）",
            "world_type": "product_world",
            "product_integration_mode": "cinematic_breakdown",
            "narrative_model": "problem_solution",
            "brand_tone": "直接、可信、解决问题",
            "ai_feasibility": "high — 前后对比结构清晰，AI 生图友好",
            "risk": "痛点展示不宜过于夸张，否则显得不真实",
            "description": f"直接瞄准{pain1}这个核心痛点。前3秒用{hook1}抓住观众，然后展示{title}如何成为{aud1}的救星。{usp1}。"
        },
        {
            "id": "b",
            "title": "场景向往型",
            "concept": f"在 {scene1} 中自然融入 {title}",
            "big_idea": "观众买的是产品带来的理想状态",
            "reason_to_watch": f"想看看{aud1}如何用{title}改变{scene1}的体验",
            "hook_moment": hook2,
            "visual_metaphor": f"理想生活场景的视觉化 → {title}作为场景中的自然元素 → 向往感=购买欲",
            "world_type": "dual_world",
            "product_integration_mode": "lifestyle_film",
            "narrative_model": "lifestyle_aspiration",
            "brand_tone": "温暖、向往、高品质",
            "ai_feasibility": "medium — 生活场景需注意人物一致性",
            "risk": "场景感过强可能冲淡产品焦点",
            "description": f"不直接叫卖，而是展示{aud1}在{scene1}中使用{title}的理想画面。观众买的不是产品，是{title}带来的那种生活状态。"
        },
        {
            "id": "c",
            "title": "信任构建型",
            "concept": f"展示为什么 {title} 值得信赖——从设计到体验",
            "big_idea": "细节透露品质，品质建立信任，信任驱动下单",
            "reason_to_watch": f"真正的好产品禁得起近距离审视",
            "hook_moment": hook3,
            "visual_metaphor": f"微距镜头 → 材质/工艺特写 → 使用中的流畅体验 → '原来如此'的认知时刻",
            "world_type": "product_world",
            "product_integration_mode": "cinematic_breakdown",
            "narrative_model": "mechanism_reveal",
            "brand_tone": "高级、克制、专业",
            "ai_feasibility": "high — 产品特写+微距为主，AI 生图友好",
            "risk": "过于技术化可能让非专业用户感到疏远",
            "description": f"用电影级的视觉语言解构{title}。每一个镜头都在回答'为什么选它'。从{usp1}的设计美学到{scene2}中的实际表现，让产品自己说话。"
        }
    ]


async def generate_creative_directions(product_info: dict) -> list[dict]:
    """基于产品分析生成 3 个创意方向提案。AI 数据可用时用 AI 模式，否则 fallback。"""
    title = product_info.get("title", "this product")

    if product_info.get("ai_analyzed") and product_info.get("pain_points"):
        directions = _ai_directions(product_info)
        mode = "AI"
    else:
        directions = _fallback_directions(product_info)
        mode = "fallback"

    logger.info(f"Generated {len(directions)} creative directions for {title} ({mode} mode)")
    return directions

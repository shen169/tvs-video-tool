"""
Stage 2.5 — AI 智能推荐。

合并了原来的 stage2_creative (创意方向) + stage3_style (视觉风格)。
AI 根据产品分析 + 目标平台，一次性推荐 8 个维度的最佳组合。

维度: 视频类型 · 视觉风格 · 运镜 · 人物 · 场景 · 色调 · 音乐 · 尺寸
"""

import json
import os
import re
import logging
import httpx

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════
# 维度选项库
# ═══════════════════════════════════════════════════════════════════════

VIDEO_TYPES = {
    "pain_point_relief": "痛点解决方案 — 展示痛点→产品介入→解决",
    "real_user_share": "真实用户分享 — 用户真实使用场景，生活化口吻",
    "tvc_cinematic": "TVC质感大片 — 电影级产品展示，高端定位",
    "scene_lifestyle": "场景生活方式 — 产品融入理想生活画面",
    "comparison_test": "对比测评型 — 使用前后 / A vs B 对比",
    "unboxing_experience": "开箱体验型 — 开箱+第一印象+细节",
}

VISUAL_STYLES = {
    "clean_minimal": "简约干净 — 白/浅灰背景，产品为主",
    "lifestyle_warm": "生活温馨 — 暖色调家居场景，真实感",
    "tech_futuristic": "科技未来 — 深色背景，光影动感",
}

CAMERA_STYLES = {
    "smooth_cinematic": "电影感平滑 — 稳定运镜，浅景深",
    "dynamic_handheld": "动感手持 — 轻微晃动，临场感",
    "macro_detail": "微距细节 — 极近距离，材质特写",
}

HUMAN_STYLES = {
    "no_human": "无人物 — 纯产品展示",
    "hands_only": "手部出镜 — 只露手操作产品",
    "full_person": "人物出镜 — 模特/用户使用产品",
}

SCENE_STYLES = {
    "studio_clean": "纯色棚拍 — 干净的摄影棚背景",
    "home_indoor": "家居室内 — 温暖的家庭环境",
    "outdoor_nature": "户外自然 — 公园/街道/自然光",
    "office_business": "办公商务 — 现代办公室场景",
    "minimal_white": "极简白底 — 电商主图风格",
}

COLOR_TONES = {
    "warm_golden": "暖色调 — 金色/琥珀色温，亲切温暖",
    "cool_blue": "冷色调 — 蓝/青色调，科技专业",
    "neutral_natural": "自然中性 — 真实色彩，不偏冷暖",
    "vibrant_saturated": "高饱和活力 — 鲜艳明快，年轻感",
    "desaturated_premium": "低饱和高级 — 莫兰迪色调，高端克制",
}

MUSIC_STYLES = {
    "fast_electronic": "快节奏电子 — 科技感/TikTok 风格",
    "soft_piano": "舒缓钢琴 — 情感/治愈/高端",
    "light_acoustic": "轻快原声 — 吉他/尤克里里，生活感",
    "dynamic_drums": "动感鼓点 — 节奏强，运动/活力",
    "no_music_asmr": "无音乐/ASMR — 纯产品声/环境音",
}

LIGHTING_STYLES = {
    "soft_studio": "柔光棚拍 — 均匀柔和，无阴影",
    "natural_window": "自然窗光 — 单侧自然光，有立体感",
    "dramatic_rim": "戏剧轮廓光 — 暗背景+边缘光，高端感",
}

ANGLE_STYLES = {
    "eye_level": "平视 — 与人眼齐平，自然视角",
    "top_down": "俯拍 — 从上往下，适合桌面产品",
    "low_hero": "仰拍英雄 — 低角度，产品显得高大",
}

PLATFORM_PROFILES = {
    "tiktok": {"ratio": "9:16", "tone": "年轻快节奏", "duration_sec": 12},
    "amazon": {"ratio": "16:9", "tone": "专业产品展示", "duration_sec": 15},
    "youtube": {"ratio": "9:16", "tone": "信息量丰富", "duration_sec": 15},
    "instagram": {"ratio": "9:16", "tone": "视觉驱动", "duration_sec": 12},
}


# ═══════════════════════════════════════════════════════════════════════
# AI Prompt
# ═══════════════════════════════════════════════════════════════════════

RECOMMEND_SYSTEM = """You are a world-class video creative director for e-commerce short-form ads.

Your job: given a product's AI analysis data and target platforms, recommend the SINGLE BEST combination of creative direction and visual style across 8 dimensions.

RULES:
1. Be SPECIFIC — each choice must be justified by the product data.
2. Platform-aware — TikTok needs fast hooks, Amazon needs trust-building, etc.
3. Persona match — the style must fit the target audience's taste.
4. Return ONLY valid JSON — no markdown, no explanation."""

RECOMMEND_TEMPLATE = """Based on the product analysis below, recommend the best creative + style combination.

=== PRODUCT DATA ===
___PRODUCT_DATA___

=== TARGET PLATFORMS ===
___PLATFORMS_DATA___

=== AVAILABLE OPTIONS ===
Video Types: ___VIDEO_TYPES___
Visual Styles: ___VISUAL_STYLES___
Camera Styles: ___CAMERA_STYLES___
Human: ___HUMAN_STYLES___
Scene: ___SCENE_STYLES___
Color Tones: ___COLOR_TONES___
Music: ___MUSIC_STYLES___

Return this EXACT JSON:
{
  "video_type": "<key from Video Types>",
  "video_type_label": "<label>",
  "creative": {
    "title": "Creative direction title (6 words max, in English)",
    "concept": "One-sentence creative concept (use specific product details)",
    "big_idea": "The core creative insight that makes this video work",
    "hook_moment": "The first 3 seconds hook (under 15 words)",
    "narrative_model": "problem_solution / lifestyle_aspiration / mechanism_reveal / emotional_resonance"
  },
  "style": {
    "visual_style": "<key>",
    "camera": "<key>",
    "lighting": "<key>",
    "angle": "<key>",
    "human": "<key>",
    "scene": "<key>",
    "color_tone": "<key>",
    "music": "<key>",
    "aspect_ratio": "<based on primary platform>"
  },
  "reason": "One paragraph explaining why this combination is the best fit",
  "reason_points": ["point 1", "point 2", "point 3"]
}"""


# ═══════════════════════════════════════════════════════════════════════
# Fallback — 启发式规则
# ═══════════════════════════════════════════════════════════════════════

def _heuristic_recommend(product_info: dict, platforms: list[str]) -> dict:
    """无 AI 时的启发式推荐。"""
    title = product_info.get("title", "this product")
    category = str(product_info.get("category_hints", []))
    features = product_info.get("key_features", [])
    pains = product_info.get("pain_points", [])
    scenarios = product_info.get("use_scenarios", [])
    audience = product_info.get("target_audience", [])

    has_pain = bool(pains)
    has_scene = bool(scenarios)
    is_tech = any(kw in category.lower() for kw in ["electronics", "tech", "digital"])
    is_beauty = any(kw in category.lower() for kw in ["beauty", "skincare", "cosmetic"])
    is_health = any(kw in category.lower() for kw in ["health", "medical", "fitness", "wellness", "pain"])
    is_home = any(kw in category.lower() for kw in ["home", "kitchen", "garden", "furniture"])
    primary_plat = platforms[0] if platforms else "tiktok"
    plat_profile = PLATFORM_PROFILES.get(primary_plat, PLATFORM_PROFILES["tiktok"])

    # 视频类型
    if has_pain and (is_health or is_beauty):
        video_type = "pain_point_relief"
    elif has_scene and is_home:
        video_type = "scene_lifestyle"
    elif is_tech:
        video_type = "tvc_cinematic"
    else:
        video_type = "real_user_share"

    # 视觉风格
    if is_tech:
        visual_style = "tech_futuristic"
    elif is_home or is_beauty:
        visual_style = "lifestyle_warm"
    else:
        visual_style = "clean_minimal"

    # 运镜
    if is_tech or is_beauty:
        camera = "macro_detail"
    elif video_type == "real_user_share":
        camera = "dynamic_handheld"
    else:
        camera = "smooth_cinematic"

    # 人物
    if video_type in ("real_user_share", "scene_lifestyle"):
        human = "full_person"
    elif video_type == "pain_point_relief":
        human = "hands_only"
    else:
        human = "no_human"

    # 场景
    if is_home:
        scene = "home_indoor"
    elif is_health:
        scene = "studio_clean"
    elif video_type == "scene_lifestyle":
        scene = "outdoor_nature"
    else:
        scene = "minimal_white"

    # 色调
    if is_home or is_beauty:
        color_tone = "warm_golden"
    elif is_tech:
        color_tone = "cool_blue"
    elif video_type == "tvc_cinematic":
        color_tone = "desaturated_premium"
    else:
        color_tone = "neutral_natural"

    # 音乐
    if primary_plat in ("tiktok", "instagram"):
        music = "fast_electronic" if is_tech else "light_acoustic"
    elif is_health:
        music = "soft_piano"
    else:
        music = "light_acoustic"

    # 灯光
    if visual_style == "tech_futuristic":
        lighting = "dramatic_rim"
    elif visual_style == "lifestyle_warm":
        lighting = "natural_window"
    else:
        lighting = "soft_studio"

    # 角度
    if camera == "macro_detail":
        angle = "low_hero"
    elif video_type == "scene_lifestyle":
        angle = "eye_level"
    else:
        angle = "eye_level"

    # Hook
    hooks = product_info.get("video_hook_angles", [])
    hook = hooks[0] if hooks else f"Discover what {title} can do for you."

    return {
        "video_type": video_type,
        "video_type_label": VIDEO_TYPES.get(video_type, video_type),
        "creative": {
            "title": f"{title[:30]} — {VIDEO_TYPES.get(video_type, 'Product Showcase').split(' —')[0]}",
            "concept": f"Showcase {title} with {visual_style.replace('_', ' ')} aesthetics and {camera.replace('_', ' ')} cinematography",
            "big_idea": "Product as the centerpiece of a compelling visual narrative",
            "hook_moment": hook,
            "narrative_model": "problem_solution" if has_pain else "lifestyle_aspiration",
        },
        "style": {
            "visual_style": visual_style,
            "visual_style_label": VISUAL_STYLES.get(visual_style, ""),
            "camera": camera,
            "camera_label": CAMERA_STYLES.get(camera, ""),
            "lighting": lighting,
            "lighting_label": LIGHTING_STYLES.get(lighting, ""),
            "angle": angle,
            "angle_label": ANGLE_STYLES.get(angle, ""),
            "human": human,
            "human_label": HUMAN_STYLES.get(human, ""),
            "scene": scene,
            "scene_label": SCENE_STYLES.get(scene, ""),
            "color_tone": color_tone,
            "color_tone_label": COLOR_TONES.get(color_tone, ""),
            "music": music,
            "music_label": MUSIC_STYLES.get(music, ""),
            "aspect_ratio": plat_profile["ratio"],
        },
        "reason": f"基于{title}的产品特性（{category}品类）和{primary_plat}平台特性自动匹配。",
        "reason_points": [
            f"{VIDEO_TYPES.get(video_type, '')}最适合本产品",
            f"目标平台 {primary_plat} ({plat_profile['ratio']}) → {plat_profile['tone']}",
            f"{VISUAL_STYLES.get(visual_style, '')}搭配{CAMERA_STYLES.get(camera, '')}",
        ],
    }


# ═══════════════════════════════════════════════════════════════════════
# AI 调用
# ═══════════════════════════════════════════════════════════════════════

async def _call_ai(prompt: str) -> str | None:
    """优先 Anthropic，fallback DeepSeek。"""
    # Anthropic
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if api_key:
        try:
            from anthropic import AsyncAnthropic
            client = AsyncAnthropic(api_key=api_key, timeout=60)
            message = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                system=RECOMMEND_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception as e:
            logger.warning(f"Anthropic recommend failed: {e}")

    # DeepSeek fallback
    api_key = os.getenv("DEEPSEEK_API_KEY", "")
    if api_key:
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": RECOMMEND_SYSTEM},
                            {"role": "user", "content": prompt},
                        ],
                        "max_tokens": 1024,
                        "temperature": 0.3,
                    },
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"DeepSeek recommend failed: {e}")

    return None


def _parse_ai_response(raw: str) -> dict | None:
    """从 AI 响应中提取 JSON。"""
    json_match = re.search(r'\{[\s\S]*\}', raw)
    if not json_match:
        return None
    try:
        return json.loads(json_match.group(0))
    except json.JSONDecodeError:
        return None


# ═══════════════════════════════════════════════════════════════════════
# 主入口
# ═══════════════════════════════════════════════════════════════════════

async def generate_recommendation(product_info: dict, platforms: list[str]) -> dict:
    """为产品+平台组合生成 AI 推荐。"""
    title = product_info.get("title", "unknown")

    # 尝试 AI
    if product_info.get("ai_analyzed"):
        product_text = json.dumps({
            "title": title,
            "category": product_info.get("category_hints", []),
            "key_features": product_info.get("key_features", []),
            "pain_points": product_info.get("pain_points", []),
            "target_audience": product_info.get("target_audience", []),
            "use_scenarios": product_info.get("use_scenarios", []),
            "video_hook_angles": product_info.get("video_hook_angles", []),
            "unique_selling_points": product_info.get("unique_selling_points", []),
            "price": product_info.get("price", ""),
        }, ensure_ascii=False, indent=2)
        platforms_text = json.dumps({p: PLATFORM_PROFILES.get(p, {}) for p in platforms}, ensure_ascii=False)

        prompt = (
            RECOMMEND_TEMPLATE
            .replace("___PRODUCT_DATA___", product_text)
            .replace("___PLATFORMS_DATA___", platforms_text)
            .replace("___VIDEO_TYPES___", json.dumps(VIDEO_TYPES, ensure_ascii=False))
            .replace("___VISUAL_STYLES___", json.dumps(VISUAL_STYLES, ensure_ascii=False))
            .replace("___CAMERA_STYLES___", json.dumps(CAMERA_STYLES, ensure_ascii=False))
            .replace("___HUMAN_STYLES___", json.dumps(HUMAN_STYLES, ensure_ascii=False))
            .replace("___SCENE_STYLES___", json.dumps(SCENE_STYLES, ensure_ascii=False))
            .replace("___COLOR_TONES___", json.dumps(COLOR_TONES, ensure_ascii=False))
            .replace("___MUSIC_STYLES___", json.dumps(MUSIC_STYLES, ensure_ascii=False))
        )

        raw = await _call_ai(prompt)
        if raw:
            result = _parse_ai_response(raw)
            if result and result.get("style"):
                # 补充中文 label（AI 只返回 key）
                _enrich_labels(result)
                logger.info(f"AI recommendation for {title}: {result.get('video_type', '?')}")
                return result
            logger.warning(f"AI recommend parse failed for {title}")

    # Fallback
    logger.info(f"Using heuristic recommendation for {title}")
    return _heuristic_recommend(product_info, platforms)


def _enrich_labels(result: dict):
    """补充维度 label（AI 返回 key 即可，label 用选项库查表）。"""
    style = result.get("style", {})
    label_map = {
        "visual_style": VISUAL_STYLES,
        "camera": CAMERA_STYLES,
        "human": HUMAN_STYLES,
        "scene": SCENE_STYLES,
        "color_tone": COLOR_TONES,
        "music": MUSIC_STYLES,
        "lighting": LIGHTING_STYLES,
        "angle": ANGLE_STYLES,
    }
    for key, lookup in label_map.items():
        val = style.get(key, "")
        if val and val in lookup:
            style[f"{key}_label"] = lookup[val]
    result["video_type_label"] = VIDEO_TYPES.get(result.get("video_type", ""), "")

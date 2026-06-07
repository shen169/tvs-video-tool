"""
Stage 5 — 分镜预览图生成 (DeepSeek 写 prompt → Seedream 生图)。

流程:
  1. DeepSeek 根据产品数据+分镜信息生成自然语言生图 prompt
  2. Seedream 用该 prompt + 参考图做图生图
  3. 无 API key 时回退到模板拼接
"""

import os
import json
import logging
import httpx

logger = logging.getLogger(__name__)

ARK_API_BASE = "https://ark.cn-beijing.volces.com/api/v3"
SEEDREAM_MODEL = "doubao-seedream-5-0-260128"

# 限制并发，防 Seedream 限流
import asyncio as _asyncio
_seedream_sema = _asyncio.Semaphore(2)
_ai_sema = _asyncio.Semaphore(1)  # DeepSeek 串行，避免限流

# ═══════════════════════════════════════════════════════════════════════════
# DeepSeek System Prompt — 写出高质量 Seedream 生图 prompt
# ═══════════════════════════════════════════════════════════════════════════

PROMPT_SYSTEM = """You are a professional advertising photographer and art director.
Your job is to write Seedream image generation prompts for product video storyboard shots.

For each shot, write a SINGLE English paragraph (60-120 words) that describes the exact frame to generate.

Rules:
- Describe camera framing, composition, lighting, color palette, subject placement, background
- Include product appearance details from the product info provided
- Match the shot purpose (hook, reveal, detail, etc) with appropriate visual intensity
- Use cinematic photography terminology: depth of field, bokeh, golden hour, rim light, etc.
- The image will use a REFERENCE PHOTO of the product — describe the scene, not the product itself
- 9:16 vertical aspect ratio for all shots
- NO text, NO logos, NO watermarks in the image
- Professional commercial quality, photorealistic, 8K

Output format — return JSON array only, nothing else:
[{"n":1,"prompt":"..."},{"n":2,"prompt":"..."},...]"""


def _build_ai_user_prompt(product_info: dict, style: dict, shots: list[dict], platform: str) -> str:
    """构造发给 DeepSeek 的上下文数据。"""
    title = product_info.get("title", "")
    desc = product_info.get("product_summary", product_info.get("description", ""))
    features = product_info.get("key_features", [])
    usps = product_info.get("unique_selling_points", [])
    scenarios = product_info.get("use_scenarios", [])

    vs = style.get("visual_style", "clean_minimal")
    lighting = style.get("lighting", "soft_studio")
    human = style.get("human", "no_human")

    parts = [
        f"Product: {title}",
        f"Description: {desc[:200]}" if desc else "",
        f"Key features: {', '.join(features[:5])}" if features else "",
        f"USPs: {', '.join(usps[:3])}" if usps else "",
        f"Use scenarios: {', '.join(scenarios[:3])}" if scenarios else "",
        "",
        f"Visual style: {vs}",
        f"Lighting: {lighting}",
        f"Human presence: {human}",
        f"Platform: {platform} (9:16 vertical video)",
        "",
        "Storyboard shots to generate prompts for:",
    ]

    for s in shots:
        parts.append(
            f"Shot {s['number']}: "
            f"purpose={s.get('purpose','')}, "
            f"type={s.get('shot_type','medium')}, "
            f"angle={s.get('angle','eye_level')}, "
            f"camera={s.get('camera_move','')}, "
            f"scene=\"{s.get('scene','')[:200]}\", "
            f"voiceover=\"{s.get('voiceover','')[:100]}\""
        )

    return "\n".join(p for p in parts if p)


async def _ai_generate_prompts(product_info: dict, style: dict, shots: list[dict],
                               platform: str) -> list[str] | None:
    """用 DeepSeek 为所有分镜生成自然语言生图 prompt。失败返回 None。"""
    api_key = os.getenv("DEEPSEEK_API_KEY", "")
    if not api_key:
        return None

    user_prompt = _build_ai_user_prompt(product_info, style, shots, platform)

    async with _ai_sema:
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                resp = await client.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": PROMPT_SYSTEM},
                            {"role": "user", "content": user_prompt},
                        ],
                        "max_tokens": 2048,
                        "temperature": 0.4,
                    },
                )
                if resp.status_code != 200:
                    logger.warning(f"DeepSeek prompt gen failed: {resp.status_code}")
                    return None

                content = resp.json()["choices"][0]["message"]["content"]
                # 提取 JSON
                json_match = __import__("re").search(r"\[.*\]", content, __import__("re").DOTALL)
                if not json_match:
                    logger.warning(f"DeepSeek returned non-JSON: {content[:200]}")
                    return None

                items = json.loads(json_match.group(0))
                # 按 shot number 排序，取 prompt 字段
                items.sort(key=lambda x: x.get("n", 0))
                prompts = [it.get("prompt", "") for it in items]

                # 补齐长度
                while len(prompts) < len(shots):
                    prompts.append("")
                return prompts[:len(shots)]

        except Exception as e:
            logger.warning(f"DeepSeek prompt gen error: {e}")
            return None


# ═══════════════════════════════════════════════════════════════════════════
# 模板兜底 prompt（DeepSeek 不可用时）
# ═══════════════════════════════════════════════════════════════════════════

def _template_prompt(shot: dict, style: dict, continuity: str, product_info: dict) -> str:
    """模板拼接生图 prompt — AI 不可用时的兜底。"""
    scene = shot.get("scene", "")
    shot_type = shot.get("shot_type", "medium")
    angle = shot.get("angle", "eye_level")
    lighting = shot.get("lighting", "soft_studio")
    purpose = shot.get("purpose", "")

    vs = style.get("visual_style", "clean_minimal")
    title = product_info.get("title", "product")
    desc = product_info.get("product_summary", product_info.get("description", ""))
    features = product_info.get("key_features", [])

    style_desc = {
        "clean_minimal": "minimalist clean background, soft neutral colors",
        "lifestyle_warm": "warm home interior, natural materials, cozy atmosphere",
        "tech_futuristic": "sleek modern environment, subtle ambient lighting",
    }.get(vs, "professional studio setting")

    angle_desc = {
        "eye_level": "straight-on eye level view",
        "top_down": "overhead top-down view",
        "low_hero": "dramatic low angle hero perspective",
        "45_degree": "elegant 45-degree angle",
    }.get(angle, f"{angle} angle")

    camera_desc = {
        "slow_push_in": "subject centered, shallow depth of field",
        "slow_pull_out": "wide establishing shot, deep focus",
        "dolly_right": "smooth lateral composition",
        "static": "steady locked-off frame",
        "tracking_arc": "dynamic curved composition",
        "handheld_walk": "natural documentary feel",
        "steadicam_float": "floating smooth movement feel",
        "snap_zoom": "tight dramatic close-up",
        "crash_zoom": "intense zoomed perspective",
        "handheld_settle": "settled handheld stability",
        "focus_rack": "rack focus between elements",
        "macro_pan": "intricate detail reveal",
        "extreme_slow_push": "meditative slow advance",
        "depth_reveal": "layered depth unveiling",
        "whip_pan": "energetic whip transition",
    }.get(shot.get("camera_move", ""), "")

    feature_text = ", ".join(features[:2]) if features else ""

    parts = [
        f"Product advertising photo featuring \"{title}\"",
        f"{style_desc}",
        f"Scene: {scene[:200]}" if scene else "",
        f"{shot_type} shot, {angle_desc}" if angle_desc else "",
        f"{camera_desc}" if camera_desc else "",
        f"{lighting} lighting",
        f"Purpose: {purpose}" if purpose else "",
        f"Key details: {feature_text}" if feature_text else f"Details: {desc[:150]}" if desc else "",
        "9:16 vertical aspect ratio, photorealistic, professional commercial quality",
        "No text, no logos, no watermarks, no lettering",
        continuity if continuity else "",
    ]
    return ". ".join(p for p in parts if p)


# ═══════════════════════════════════════════════════════════════════════════
# Seedream API 调用
# ═══════════════════════════════════════════════════════════════════════════

async def _generate_preview_image(prompt: str, ref_image_url: str = None) -> str:
    """调用 Seedream 生成单张 9:16 预览图，可选参考图做图生图。"""
    api_key = os.getenv("SEEDANCE_API_KEY", "")
    if not api_key:
        return prompt

    async with _seedream_sema:
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                body = {
                    "model": SEEDREAM_MODEL,
                    "prompt": prompt,
                    "sequential_image_generation": "disabled",
                    "response_format": "url",
                    "size": "2k",
                    "stream": False,
                    "watermark": False,
                }
                if ref_image_url:
                    body["image"] = ref_image_url

                resp = await client.post(
                    f"{ARK_API_BASE}/images/generations",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json=body,
                )
                if resp.status_code != 200:
                    err_text = resp.text[:300]
                    logger.warning(f"Seedream preview failed ({resp.status_code}): {err_text}")
                    if "AccountOverdueError" in err_text or "overdue" in err_text.lower():
                        return "__API_ERROR__:AccountOverdueError"
                    return f"__API_ERROR__:HTTP{resp.status_code}"

                data = resp.json()
                images = data.get("data", [])
                if images and images[0].get("url"):
                    return images[0]["url"]

                return prompt
        except Exception as e:
            logger.warning(f"Seedream preview error: {e}")
            return prompt


# ═══════════════════════════════════════════════════════════════════════════
# 主入口
# ═══════════════════════════════════════════════════════════════════════════

async def generate_preview_images(task: dict, platform: str) -> list[str]:
    """为指定平台的所有分镜生成预览图。"""
    scripts = task.get("scripts", {}).get(platform, []) if task.get("scripts") else []
    if not scripts:
        return []

    style = task.get("selected_style") or {}
    product_info = task.get("product_info") or {}
    continuity = scripts[0].get("continuity_anchor", "") if scripts else ""

    # 参考图 URL（优先用户上传，其次产品抓取）
    ref_image_url = (task.get("uploaded_ref_image") or task.get("ref_image_url", "") or "")
    if ref_image_url and not ref_image_url.startswith("http"):
        ref_image_url = ""

    # Step 1: DeepSeek 生成所有 shot 的自然语言 prompt
    logger.info(f"[{platform}] Generating AI prompts for {len(scripts)} shots...")
    ai_prompts = await _ai_generate_prompts(product_info, style, scripts, platform)

    if ai_prompts and len(ai_prompts) == len(scripts):
        logger.info(f"[{platform}] AI prompts generated ({sum(1 for p in ai_prompts if p)} non-empty)")
    else:
        logger.info(f"[{platform}] AI prompts failed, using template fallback")
        ai_prompts = None

    # Step 2: 逐个生成预览图
    async def _gen_one(i: int, shot: dict) -> str:
        if ai_prompts and ai_prompts[i]:
            prompt = ai_prompts[i]
        else:
            prompt = _template_prompt(shot, style, continuity, product_info)
        return await _generate_preview_image(prompt, ref_image_url or None)

    previews = await _asyncio.gather(*[_gen_one(i, s) for i, s in enumerate(scripts)])

    img_count = sum(1 for p in previews if p.startswith("http"))
    logger.info(f"[{platform}] {len(previews)} previews ({img_count} images, "
                f"{len(previews) - img_count} fallback prompts)")
    return list(previews)

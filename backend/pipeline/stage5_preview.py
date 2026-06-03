"""
Stage 5 — 分镜预览图生成。

策略:
  1. 有 KIE API key → 为每个分镜调用真实生图
  2. 没有 → 返回 text prompt 字符串（前端可展示文字分镜）
"""

import os
import logging
import httpx

logger = logging.getLogger(__name__)

KIE_API_BASE = os.getenv("KIE_API_BASE", "https://api.kie.ai/api/v1")
KIE_API_KEY = os.getenv("KIE_API_KEY", "")
KIE_MODEL_T2I = os.getenv("KIE_IMAGE_MODEL_T2I", "gpt-image-2-text-to-image")


async def _generate_preview_image(prompt: str) -> str:
    """调用 KIE 生成单张预览图。"""
    if not KIE_API_KEY:
        return prompt  # 无 key 返回 prompt 文本

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{KIE_API_BASE}/images/generations",
                headers={
                    "Authorization": f"Bearer {KIE_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": KIE_MODEL_T2I,
                    "prompt": prompt,
                    "n": 1,
                    "size": "576x1024",  # 9:16 vertical
                    "response_format": "url",
                },
            )
            if resp.status_code != 200:
                logger.warning(f"KIE preview failed ({resp.status_code}): {resp.text[:200]}")
                return prompt

            data = resp.json()
            images = data.get("data", [])
            if images and images[0].get("url"):
                url = images[0]["url"]
                logger.info(f"KIE preview generated: {url[:80]}...")
                return url
            elif images and images[0].get("b64_json"):
                return f"data:image/png;base64,{images[0]['b64_json']}"

            return prompt

    except Exception as e:
        logger.warning(f"KIE preview error: {e}")
        return prompt


def _build_preview_prompt(shot: dict, style: dict, continuity: str,
                          product_info: dict) -> str:
    """为单个分镜构造生图 prompt。"""
    scene = shot.get("scene", "")
    shot_type = shot.get("shot_type", "medium")
    angle = shot.get("angle", "eye_level")
    lighting = shot.get("lighting", "soft_studio")
    purpose = shot.get("purpose", "")

    vs = style.get("visual_style", "clean_minimal")
    title = product_info.get("title", "product")
    short_name = " ".join(title.replace("Amazon.com:", "").split()[:4])

    return (
        f"{vs} product photography of {short_name}, photorealistic, 8K. "
        f"{scene}. "
        f"{shot_type} shot, {angle} angle, {lighting} lighting. "
        f"Purpose: {purpose}. "
        f"9:16 vertical, professional advertising quality. "
        f"No text, no logos, no watermarks. "
        f"{continuity}"
    )


async def generate_preview_images(task: dict, platform: str) -> list[str]:
    """为指定平台的所有分镜生成预览图（或 prompt）。"""
    scripts = task.get("scripts", {}).get(platform, [])
    style = task.get("selected_style", {})
    product_info = task.get("product_info", {})
    continuity = scripts[0].get("continuity_anchor", "") if scripts else ""

    previews = []
    for shot in scripts:
        prompt = _build_preview_prompt(shot, style, continuity, product_info)

        if KIE_API_KEY:
            url = await _generate_preview_image(prompt)
            previews.append(url)
        else:
            previews.append(prompt)

    logger.info(f"[{platform}] Generated {len(previews)} previews "
                f"({'images' if KIE_API_KEY else 'prompts'})")
    return previews


async def generate_preview_images_sync(task: dict, platform: str) -> list[str]:
    """同步版本的 generate_preview_images（别名）。"""
    return await generate_preview_images(task, platform)

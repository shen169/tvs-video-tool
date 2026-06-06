"""
Stage 5 — 分镜预览图生成 (Seedream via Ark API)。

策略:
  1. 有 SEEDANCE_API_KEY → 为每个分镜调用 Seedream 生图
  2. 没有 → 返回 prompt 文本（前端展示文字分镜）
"""

import os
import logging
import httpx

logger = logging.getLogger(__name__)

ARK_API_BASE = "https://ark.cn-beijing.volces.com/api/v3"
SEEDREAM_MODEL = "doubao-seedream-5-0-260128"


async def _generate_preview_image(prompt: str) -> str:
    """调用 Seedream 生成单张 9:16 预览图。"""
    api_key = os.getenv("SEEDANCE_API_KEY", "")
    if not api_key:
        return prompt  # 无 key 返回 prompt 文本

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{ARK_API_BASE}/images/generations",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": SEEDREAM_MODEL,
                    "prompt": prompt,
                    "sequential_image_generation": "disabled",
                    "response_format": "url",
                    "size": "1K",          # 预览图用小尺寸，省费用
                    "stream": False,
                    "watermark": False,
                },
            )
            if resp.status_code != 200:
                err_text = resp.text[:300]
                logger.warning(f"Seedream preview failed ({resp.status_code}): {err_text}")
                # 检查是否欠费
                if "AccountOverdueError" in err_text or "overdue" in err_text.lower():
                    return f"__API_ERROR__:AccountOverdueError"
                return f"__API_ERROR__:HTTP{resp.status_code}"

            data = resp.json()
            images = data.get("data", [])
            if images and images[0].get("url"):
                return images[0]["url"]

            return prompt

    except Exception as e:
        logger.warning(f"Seedream preview error: {e}")
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
    """为指定平台的所有分镜并行生成预览图（或 prompt）。"""
    scripts = task.get("scripts", {}).get(platform, []) if task.get("scripts") else []
    style = task.get("selected_style") or {}
    product_info = task.get("product_info") or {}
    continuity = scripts[0].get("continuity_anchor", "") if scripts else ""

    # 并行生成所有分镜的预览图（大大加速！）
    import asyncio

    async def _gen_one(shot: dict) -> str:
        prompt = _build_preview_prompt(shot, style, continuity, product_info)
        return await _generate_preview_image(prompt)

    # 只生成前 3 张关键帧（Hook/Build/Turn），省费用
    preview_shots = scripts[:3]
    previews = await asyncio.gather(*[_gen_one(shot) for shot in preview_shots])
    # 后 3 张用前 3 张的 URL 填充（或留空）
    while len(previews) < len(scripts):
        previews.append("__SKIPPED__:cost_optimization")

    img_count = sum(1 for p in previews if p.startswith("http"))
    logger.info(f"[{platform}] {len(previews)} previews ({img_count} images, "
                f"{len(previews) - img_count} prompts)")
    return list(previews)

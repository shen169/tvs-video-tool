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

# 限制并发 API 调用，防止触发 Seedream 限流（单个 API key 同时最多 2-3 个请求）
import asyncio as _asyncio
_semaphore = _asyncio.Semaphore(2)


async def _generate_preview_image(prompt: str, ref_image_url: str = None) -> str:
    """调用 Seedream 生成单张 9:16 预览图，可选参考图做图生图。"""
    api_key = os.getenv("SEEDANCE_API_KEY", "")
    if not api_key:
        return prompt  # 无 key 返回 prompt 文本

    async with _semaphore:  # 限制并发，避免 429 限流
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                body = {
                    "model": SEEDREAM_MODEL,
                    "prompt": prompt,
                    "sequential_image_generation": "disabled",
                    "response_format": "url",
                    "size": "2k",          # 2k 是 Seedream 最小尺寸
                    "stream": False,
                    "watermark": False,
                }
                # 传入参考图做图生图，确保分镜画面中产品外观一致
                if ref_image_url:
                    body["image"] = ref_image_url

                resp = await client.post(
                    f"{ARK_API_BASE}/images/generations",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=body,
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

    # 获取参考图 URL（优先用户上传的，其次产品抓取的）
    ref_image_url = (task.get("uploaded_ref_image")
                     or task.get("ref_image_url", "")
                     or "")
    if ref_image_url and not ref_image_url.startswith("http"):
        ref_image_url = ""  # 非 HTTP URL（如 __AI_GEN__: 占位符）不传

    # 并行生成所有分镜的预览图（受 _semaphore 限流）
    async def _gen_one(shot: dict) -> str:
        prompt = _build_preview_prompt(shot, style, continuity, product_info)
        return await _generate_preview_image(prompt, ref_image_url or None)

    # 全部 6 张分镜都生成预览图
    previews = await _asyncio.gather(*[_gen_one(shot) for shot in scripts])

    img_count = sum(1 for p in previews if p.startswith("http"))
    logger.info(f"[{platform}] {len(previews)} previews ({img_count} images, "
                f"{len(previews) - img_count} prompts)")
    return list(previews)

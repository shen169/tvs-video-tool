"""
Stage 2 — AI 参考图生成 (Seedream via Ark API)。

策略:
  1. 用户上传了图片 → 直接用
  2. 有 SEEDANCE_API_KEY → 调用 Seedream 生图
  3. 都没有 → 返回 prompt 占位符
"""

import os
import logging
import httpx

logger = logging.getLogger(__name__)

ARK_API_BASE = "https://ark.cn-beijing.volces.com/api/v3"
SEEDREAM_MODEL = "doubao-seedream-5-0-260128"


async def _generate_with_seedream(prompt: str) -> str | None:
    """调用 Ark/Seedream API 生成产品参考图。"""
    api_key = os.getenv("SEEDANCE_API_KEY", "")
    if not api_key:
        return None

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
                    "size": "2K",
                    "stream": False,
                    "watermark": False,
                },
            )
            if resp.status_code != 200:
                logger.error(f"Seedream generation failed: {resp.status_code} {resp.text[:300]}")
                return None

            data = resp.json()
            # Seedream 返回 data[0].url
            images = data.get("data", [])
            if images and images[0].get("url"):
                url = images[0]["url"]
                logger.info(f"Seedream generated: {url[:100]}...")
                return url

            logger.warning(f"Seedream: no image URL in response: {str(data)[:200]}")
            return None

    except Exception as e:
        logger.error(f"Seedream generation error: {e}")
        return None


def _build_prompt(product_info: dict) -> str:
    """根据产品分析构造生图 prompt。"""
    title = product_info.get("title", "product")
    features = product_info.get("key_features", [])
    summary = product_info.get("product_summary", product_info.get("description", ""))

    short_name = title.replace("Amazon.com:", "").replace("Amazon.com", "").strip()
    if len(short_name) > 80:
        short_name = " ".join(short_name.split()[:6])

    feature_text = ""
    if features:
        feature_text = ", ".join(features[:3])

    return (
        f"Commercial product photography, photorealistic, clean white background, "
        f"studio lighting, 1:1 square, 8K detail. "
        f"Product: {short_name}. "
        f"Features: {feature_text}. "
        f"{summary[:200]}. "
        f"Centered hero shot, 45-degree angle, soft shadows, "
        f"product only, no text, no logos, no watermarks, professional e-commerce style."
    )


async def generate_ref_image(task: dict) -> str:
    """生成产品参考图。"""
    # 用户上传了图片，直接使用
    if task.get("uploaded_ref_image"):
        logger.info("Using uploaded reference image")
        return task["uploaded_ref_image"]

    product_info = task.get("product_info", {})
    prompt = _build_prompt(product_info)

    # Seedream 生图
    url = await _generate_with_seedream(prompt)
    if url:
        return url

    # Fallback: 返回 prompt 占位符
    logger.info("Seedream unavailable — returning prompt placeholder")
    return f"__AI_GEN__:{prompt}"

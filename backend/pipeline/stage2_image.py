"""
Stage 2 — 参考图获取。

策略（省钱优先）:
  1. 用户上传了图片 → 直接用
  2. 产品页面有抓取到的图片 → 用第一张（白底主图）
  3. 都没有 → 调用 Seedream 生图（兜底）
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
                    "size": "2k",          # 2k 是 Seedream 最小尺寸
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
    """获取产品参考图 — 优先用抓取的图片，不花钱生图。"""
    # 1. 用户上传了图片，直接使用
    if task.get("uploaded_ref_image"):
        logger.info("Using uploaded reference image")
        return task["uploaded_ref_image"]

    product_info = task.get("product_info", {})

    # 2. 用产品页面抓取到的白底主图（免费！）
    product_images = product_info.get("images", [])
    if product_images and isinstance(product_images, list) and len(product_images) > 0:
        first_img = product_images[0]
        if isinstance(first_img, str) and first_img.startswith("http"):
            logger.info(f"Using scraped product image: {first_img[:80]}...")
            return first_img

    # 3. 抓取不到图，才用 Seedream 生图（兜底）
    prompt = _build_prompt(product_info)
    url = await _generate_with_seedream(prompt)
    if url:
        return url

    # 4. 全都没有 — prompt 占位符
    logger.info("No image available — returning prompt placeholder")
    return f"__AI_GEN__:{prompt}"

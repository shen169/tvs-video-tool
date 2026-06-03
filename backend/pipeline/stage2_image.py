"""
Stage 2 — AI 参考图生成。

策略:
  1. 用户上传了图片 → 直接用
  2. 有 KIE API key → 调用 KIE 生图 API (gpt-image-2-text-to-image)
  3. 都没有 → 返回 prompt 占位符
"""

import os
import logging
import httpx

logger = logging.getLogger(__name__)

KIE_API_BASE = os.getenv("KIE_API_BASE", "https://api.kie.ai/api/v1")
KIE_API_KEY = os.getenv("KIE_API_KEY", "")
KIE_MODEL_T2I = os.getenv("KIE_IMAGE_MODEL_T2I", "gpt-image-2-text-to-image")


async def _generate_with_kie(prompt: str) -> str | None:
    """调用 KIE API 生成图片，返回图片 URL 或 None。"""
    if not KIE_API_KEY:
        return None

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
                    "size": "1024x1024",
                    "response_format": "url",
                },
            )
            if resp.status_code != 200:
                logger.error(f"KIE image generation failed: {resp.status_code} {resp.text[:300]}")
                return None

            data = resp.json()
            # KIE 返回格式类似 OpenAI: data[0].url 或 data[0].b64_json
            images = data.get("data", [])
            if images and images[0].get("url"):
                url = images[0]["url"]
                logger.info(f"KIE generated image: {url[:80]}...")
                return url
            elif images and images[0].get("b64_json"):
                logger.info("KIE returned base64 image (stored as data URL)")
                return f"data:image/png;base64,{images[0]['b64_json']}"

            logger.warning(f"KIE response had no image URL: {str(data)[:200]}")
            return None

    except Exception as e:
        logger.error(f"KIE image generation error: {e}")
        return None


def _build_prompt(product_info: dict) -> str:
    """根据产品分析构造生图 prompt。"""
    title = product_info.get("title", "product")
    features = product_info.get("key_features", [])
    summary = product_info.get("product_summary", product_info.get("description", ""))

    # 提取核心产品名（去掉前缀和长尾）
    short_name = title.replace("Amazon.com:", "").replace("Amazon.com", "").strip()
    if len(short_name) > 80:
        short_name = " ".join(short_name.split()[:6])

    feature_text = ""
    if features:
        feature_text = ", ".join(features[:3])

    prompt = (
        f"Commercial product photography, photorealistic, clean white background, "
        f"studio lighting, 1:1 square, 8K detail. "
        f"Product: {short_name}. "
        f"Features: {feature_text}. "
        f"{summary[:200]}. "
        f"Centered hero shot, 45-degree angle, soft shadows, "
        f"product only, no text, no logos, no watermarks, professional e-commerce style."
    )
    return prompt


async def generate_ref_image(task: dict) -> str:
    """生成产品参考图。"""
    # 用户上传了图片，直接使用
    if task.get("uploaded_ref_image"):
        logger.info("Using uploaded reference image")
        return task["uploaded_ref_image"]

    product_info = task.get("product_info", {})
    prompt = _build_prompt(product_info)

    # 尝试 KIE 真实生图
    kie_url = await _generate_with_kie(prompt)
    if kie_url:
        return kie_url

    # Fallback: 返回 prompt 占位符
    logger.info("No KIE API key or generation failed — returning prompt placeholder")
    return f"__AI_GEN__:{prompt}"

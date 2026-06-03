"""
Stage 1 — AI 驱动的产品分析。

三层策略:
  1. HTTP 抓取页面 HTML，提取正文文本
  2. 从 URL 中提取 ASIN / 产品名等线索
  3. 将所有上下文发给 Claude，生成结构化产品分析

输出同时包含兼容旧字段 (title, description, price, images, category_hints)
和 AI 新增字段 (key_features, target_audience, pain_points, use_scenarios,
unique_selling_points, video_hook_angles)。
"""

import httpx
import json
import os
import re
import logging

logger = logging.getLogger(__name__)

# ── AI Prompt ──────────────────────────────────────────────────────────
ANALYSIS_SYSTEM_PROMPT = """You are a world-class e-commerce product analyst specializing in video ad creation.
Your job: analyze a product and produce a structured JSON analysis that will be used to generate short-form video ads.

IMPORTANT RULES:
1. Be SPECIFIC and CONCRETE. Never use placeholder text like "this product" or "amazing features".
2. Think deeply about WHO buys this, WHY they need it, and WHAT emotional need it fulfills.
3. Pain points should be emotionally resonant — the kind of frustration that makes someone click "buy now".
4. Use scenarios should be vivid and visual — they will become video shots.
5. Video hook angles should be ready-to-use opening lines for TikTok/Reels (3 seconds or less).
6. Write in English. Keep each field concise and punchy.
7. If the page content is sparse or missing, use the URL, product name hints, and your knowledge to fill in gaps.

Return ONLY valid JSON — no markdown, no explanation, no code fences."""

ANALYSIS_USER_PROMPT = """Analyze this product for video ad creation:

PRODUCT URL: {url}

URL HINTS:{url_hints}

PAGE CONTENT:
{page_content}

Return this exact JSON structure:
{{
  "product_name": "Clean product name (no site prefix like 'Amazon.com:')",
  "brand": "Brand name",
  "category_tree": ["Level1", "Level2", "Level3"],
  "price": "Price or empty string",
  "key_features": ["feature 1", "feature 2", ...],
  "target_audience": ["audience group 1", "audience group 2", ...],
  "pain_points": ["emotional pain point 1", "pain point 2", ...],
  "use_scenarios": ["vivid scenario 1", "scenario 2", ...],
  "unique_selling_points": ["USP 1", "USP 2", ...],
  "product_description": "2-3 sentence compelling summary for video intro",
  "video_hook_angles": ["hook angle 1 (3-sec opener)", "hook angle 2", ...]
}}"""

# ── Helpers ─────────────────────────────────────────────────────────────

def _extract_text_from_html(html: str, max_chars: int = 8000) -> str:
    """从 HTML 中提取可读文本，去掉 script/style/标签。"""
    text = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', ' ', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:max_chars]


def _extract_url_hints(url: str) -> str:
    """从 URL 中提取产品线索。"""
    hints = []

    # Amazon ASIN
    m = re.search(r'/dp/([A-Z0-9]+)', url)
    if m:
        hints.append(f"Amazon ASIN: {m.group(1)}")

    # 产品名（在 domain 后面、/dp/ 前面）
    m = re.search(r'\.com/([^/]+(?:/[^/]+)*?)/dp/', url)
    if m:
        slug = m.group(1).replace('-', ' ')
        hints.append(f"Product name from URL: {slug}")

    # /dp/ 后面的 slug（如有）
    m = re.search(r'/dp/[A-Z0-9]+/([^/?]+)', url)
    if m and not m.group(1).startswith('ref='):
        slug = m.group(1).replace('-', ' ')
        hints.append(f"URL product slug: {slug}")

    # 域名
    m = re.search(r'https?://(?:www\.)?([^/]+)', url)
    if m:
        domain = m.group(1)
        hints.append(f"Store: {domain}")
        if "amazon" in domain:
            hints.append("Platform: Amazon (bot detection likely — page content may be captcha)")
        elif "shopify" in domain:
            hints.append("Platform: Shopify")
        elif "walmart" in domain:
            hints.append("Platform: Walmart")

    return "\n".join(f"  - {h}" for h in hints) if hints else "  (none)"


def _extract_images_from_html(html: str, url: str) -> list[str]:
    """从 HTML 中提取图片 URL，过滤掉图标和占位图。"""
    images = []
    # 优先找 hi-res
    hi_res = re.findall(r'"hiRes":"([^"]+)"', html)
    images.extend(hi_res)
    # 再找 large
    large = re.findall(r'"large":"([^"]+)"', html)
    images.extend(large)
    # 最后用 img 标签兜底
    if not images:
        img_srcs = re.findall(r'<img[^>]*src="([^"]*)"', html)
        images = [s for s in img_srcs if s.startswith("http")
                  and not s.endswith(".svg")
                  and "sprite" not in s
                  and "icon" not in s.lower()
                  and "logo" not in s.lower()][:10]
    # 过滤掉明显是 UI 元素的图
    skip_kw = ["nav-sprite", "pixel", "transparent", "icon", "logo", "button"]
    images = [img for img in images if not any(kw in img.lower() for kw in skip_kw)]
    return images[:5]


async def _call_ai_analysis(url: str, page_content: str, url_hints: str) -> dict | None:
    """调用 Anthropic API 做产品分析。返回 parsed dict 或 None。"""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set — skipping AI analysis")
        return None

    user_prompt = ANALYSIS_USER_PROMPT.format(
        url=url,
        url_hints=url_hints,
        page_content=page_content or "(page could not be fetched — use URL info and your product knowledge)",
    )

    # 优先用官方 SDK，不可用时回退到 httpx 直调
    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=api_key, timeout=60)
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            system=ANALYSIS_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw_text = message.content[0].text
    except Exception:
        # 回退到 httpx 直调
        try:
            async with httpx.AsyncClient(timeout=90) as http_client:
                resp = await http_client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-haiku-4-5-20251001",
                        "max_tokens": 2048,
                        "system": ANALYSIS_SYSTEM_PROMPT,
                        "messages": [{"role": "user", "content": user_prompt}],
                    },
                )
                if resp.status_code != 200:
                    logger.error(f"AI API returned {resp.status_code}: {resp.text[:300]}")
                    return None
                data = resp.json()
                raw_text = data["content"][0]["text"]
        except Exception as e:
            logger.error(f"AI analysis call failed (both SDK and HTTP): {e}")
            return None

    # 从回复中提取 JSON（兼容带/不带 code fence 的情况）
    json_match = re.search(r'\{[\s\S]*\}', raw_text)
    if not json_match:
        logger.warning(f"No JSON found in AI response, raw: {raw_text[:200]}")
        return None

    try:
        return json.loads(json_match.group(0))
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse failed: {e}, raw: {raw_text[:200]}")
        return None


def _fallback_analysis(url: str, page_content: str, url_hints: str,
                       ai_raw_text: str = "") -> dict:
    """当 AI 不可用时，用传统方法尽可能提取产品信息。"""
    title = ""
    desc = ""
    price = ""
    images = []
    category_hints = []

    # 从 HTML 提取基础信息
    if page_content:
        m = re.search(r'(?:productTitle|title)[^>]*>([^<]+)', page_content)
        if m:
            title = m.group(1).strip()

        m = re.search(r'<meta[^>]*name="description"[^>]*content="([^"]*)"', page_content, re.IGNORECASE)
        if m:
            desc = m.group(1)[:500]

        m = re.search(r'\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?', page_content)
        if m:
            price = m.group(0)

        images = _extract_images_from_html(page_content, url)

        body_text = re.sub(r'<[^>]+>', ' ', page_content[:50000])
        cate_kw = ["electronics", "home", "kitchen", "sports", "beauty", "fashion",
                     "toys", "automotive", "health", "office", "pet", "garden",
                     "medical", "fitness", "wellness", "pain relief"]
        for kw in cate_kw:
            if kw.lower() in body_text.lower():
                category_hints.append(kw)

    # 从 URL 提取标题
    if not title:
        m = re.search(r'/dp/[A-Z0-9]+/([^/?]+)', url)
        if m:
            title = m.group(1).replace('-', ' ')[:200]

    return {
        "title": title or url,
        "description": desc,
        "price": price,
        "images": images,
        "category_hints": category_hints[:5],
        "url": url,
        # AI 字段置空，标记未分析
        "brand": "",
        "key_features": [],
        "target_audience": [],
        "pain_points": [],
        "use_scenarios": [],
        "unique_selling_points": [],
        "video_hook_angles": [],
        "product_summary": "",
        "ai_analyzed": False,
        "ai_raw": ai_raw_text[:500] if ai_raw_text else "",
    }


def _build_result(url: str, ai_data: dict, page_content: str) -> dict:
    """将 AI 分析结果 + 页面提取合并为统一输出。"""
    images = _extract_images_from_html(page_content, url)

    return {
        # ── 兼容旧字段 ──
        "title": ai_data.get("product_name", url),
        "description": ai_data.get("product_description", ""),
        "price": ai_data.get("price", ""),
        "images": images,
        "category_hints": ai_data.get("category_tree", []),
        "url": url,
        # ── AI 新增字段 ──
        "brand": ai_data.get("brand", ""),
        "key_features": ai_data.get("key_features", []),
        "target_audience": ai_data.get("target_audience", []),
        "pain_points": ai_data.get("pain_points", []),
        "use_scenarios": ai_data.get("use_scenarios", []),
        "unique_selling_points": ai_data.get("unique_selling_points", []),
        "video_hook_angles": ai_data.get("video_hook_angles", []),
        "product_summary": ai_data.get("product_description", ""),
        "ai_analyzed": True,
        "error": None,
    }


# ── 主入口 ──────────────────────────────────────────────────────────────

async def fetch_product_info(url: str) -> dict:
    """
    抓取产品页面并用 AI 分析，返回结构化产品信息。

    即使在无法获取页面的情况下（如 Amazon bot detection），
    AI 仍可根据 URL 中的产品线索 + 知识库做出高质量分析。
    """
    # Step 1: HTTP 抓取
    page_content = ""
    html_raw = ""
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(url, headers={
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/130.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            })
            html_raw = resp.text
            page_content = _extract_text_from_html(html_raw)
            logger.info(f"Fetched {len(html_raw)} bytes, extracted {len(page_content)} chars of text")
    except Exception as e:
        logger.warning(f"Page fetch failed for {url}: {e}")

    # Step 2: URL 线索
    url_hints = _extract_url_hints(url)

    # Step 3: AI 分析
    ai_data = await _call_ai_analysis(url, page_content, url_hints)

    # Step 4: 组装结果
    if ai_data:
        logger.info(f"AI analysis succeeded: {ai_data.get('product_name', 'N/A')[:80]}")
        return _build_result(url, ai_data, html_raw)
    else:
        logger.info("Falling back to regex-based extraction")
        return _fallback_analysis(url, html_raw, url_hints)

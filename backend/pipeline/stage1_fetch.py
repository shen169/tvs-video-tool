"""
Stage 1 — AI 驱动的产品分析。

多层策略:
  1. HTTP 抓取页面 HTML，提取正文文本
  2. Tavily 搜索产品信息（页面被屏蔽时补充上下文）
  3. DeepSeek / Anthropic AI 生成结构化产品分析
  4. 都不可用时 fallback 到正则提取

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


async def _tavily_search(url: str, product_hints: str) -> str:
    """使用 Tavily 搜索产品信息，作为页面抓取失败时的补充。"""
    api_key = os.getenv("TAVILY_API_KEY", "")
    if not api_key:
        return ""

    # 从 URL/hints 提取搜索关键词
    query_parts = []
    m = re.search(r'\.com/([^/]+(?:/[^/]+)*?)/dp/', url)
    if m:
        query_parts.append(m.group(1).replace('-', ' '))
    else:
        # 用 URL 最后一段作为产品名
        parts = url.rstrip('/').split('/')
        if parts:
            query_parts.append(parts[-1].replace('-', ' '))

    if not query_parts:
        return ""

    query = f"{' '.join(query_parts)} product review features specifications"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": api_key,
                    "query": query,
                    "search_depth": "basic",
                    "max_results": 5,
                    "include_answer": True,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                answer = data.get("answer", "")
                results = data.get("results", [])
                text = answer + "\n\n"
                for r in results[:5]:
                    text += f"- {r.get('title', '')}: {r.get('content', '')[:300]}\n"
                logger.info(f"Tavily search returned {len(text)} chars for '{query[:60]}'")
                return text[:4000]
            else:
                logger.warning(f"Tavily search failed: {resp.status_code}")
                return ""
    except Exception as e:
        logger.warning(f"Tavily search error: {e}")
        return ""


# ── AI API 调用 — 多 Provider 支持 ──────────────────────────────────────

async def _call_deepseek(user_prompt: str) -> str | None:
    """通过 DeepSeek API (OpenAI 兼容) 调用。"""
    api_key = os.getenv("DEEPSEEK_API_KEY", "")
    if not api_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    "max_tokens": 2048,
                    "temperature": 0.7,
                },
            )
            if resp.status_code != 200:
                logger.error(f"DeepSeek API returned {resp.status_code}: {resp.text[:300]}")
                return None
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"DeepSeek API call failed: {e}")
        return None


async def _call_anthropic(user_prompt: str) -> str | None:
    """通过 Anthropic API 调用（SDK 优先，HTTP 备用）。"""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return None

    # 尝试 SDK
    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=api_key, timeout=60)
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            system=ANALYSIS_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return message.content[0].text
    except Exception as e:
        logger.warning(f"Anthropic SDK failed ({e}), trying HTTP...")

    # 备用 HTTP
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
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
                logger.error(f"Anthropic HTTP returned {resp.status_code}: {resp.text[:300]}")
                return None
            data = resp.json()
            return data["content"][0]["text"]
    except Exception as e:
        logger.error(f"Anthropic HTTP call failed: {e}")
        return None


async def _call_ai_analysis(url: str, page_content: str, url_hints: str,
                            search_context: str) -> dict | None:
    """
    调用 AI 做产品分析。
    优先级: Anthropic → DeepSeek（任一可用即用）。
    """
    # 组装上下文
    context_parts = [f"PRODUCT URL: {url}"]
    if url_hints.strip():
        context_parts.append(f"URL HINTS:\n{url_hints}")
    if search_context.strip():
        context_parts.append(f"WEB SEARCH RESULTS:\n{search_context}")
    context_parts.append(
        f"PAGE CONTENT:\n{page_content if page_content else '(page could not be fetched — use URL and search results)'}"
    )

    user_prompt = "\n\n".join(context_parts)

    # 按优先级尝试各 AI provider
    raw_text = await _call_anthropic(user_prompt)
    provider = "anthropic"

    if not raw_text:
        raw_text = await _call_deepseek(user_prompt)
        provider = "deepseek"

    if not raw_text:
        logger.warning("No AI provider available — set ANTHROPIC_API_KEY or DEEPSEEK_API_KEY")
        return None

    logger.info(f"AI analysis via {provider}, response length: {len(raw_text)}")

    # 从回复中提取 JSON
    json_match = re.search(r'\{[\s\S]*\}', raw_text)
    if not json_match:
        logger.warning(f"No JSON found in AI response, raw: {raw_text[:300]}")
        return None

    try:
        return json.loads(json_match.group(0))
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse failed: {e}, raw: {raw_text[:300]}")
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

    # Step 2.5: Tavily 搜索（页面抓取失败时补充产品信息）
    search_context = ""
    if len(html_raw) < 10000:  # 页面内容不足（被反爬），用搜索补充
        logger.info("Page content insufficient, searching via Tavily...")
        search_context = await _tavily_search(url, url_hints)
    else:
        logger.info(f"Page content sufficient ({len(html_raw)} bytes), skipping Tavily")

    # Step 3: AI 分析
    ai_data = await _call_ai_analysis(url, page_content, url_hints, search_context)

    # Step 4: 组装结果
    if ai_data:
        logger.info(f"AI analysis succeeded: {ai_data.get('product_name', 'N/A')[:80]}")
        return _build_result(url, ai_data, html_raw)
    else:
        logger.info("Falling back to regex-based extraction")
        return _fallback_analysis(url, html_raw, url_hints)

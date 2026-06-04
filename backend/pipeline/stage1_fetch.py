"""
Stage 1 — 产品数据检索 + AI 分析。

两层架构:
  ╔═══════════════════════════════════════════╗
  ║  Layer 1: 数据检索                        ║
  ║  Apify Amazon Actor → Tavily → HTTP      ║
  ║  产出: 结构化产品原始数据 (title/price/    ║
  ║         features/images/reviews...)       ║
  ╠═══════════════════════════════════════════╣
  ║  Layer 2: AI 分析 (DeepSeek/Anthropic)    ║
  ║  输入: 检索到的产品原始数据                ║
  ║  产出: 卖点/人群/痛点/场景/hook角度        ║
  ╚═══════════════════════════════════════════╝
"""

import httpx
import json
import os
import re
import asyncio
import logging

logger = logging.getLogger(__name__)

# ── Apify 配置 ──────────────────────────────────────────────────────────
APIFY_TOKEN = os.getenv("APIFY_API_TOKEN", "")
# Apify Amazon Product Scraper actor
APIFY_AMAZON_ACTOR = "junglee/amazon-crawler"

# ── AI Prompt ──────────────────────────────────────────────────────────
ANALYSIS_SYSTEM_PROMPT = """You are a world-class e-commerce product analyst specializing in short-form video ad creation.

Your job: take RAW product data (scraped from the product page) and transform it into CREATIVE INSIGHTS for video ads.

IMPORTANT RULES:
1. Be SPECIFIC and CONCRETE. Never say "this product" or "amazing features".
2. Pain points must be EMOTIONALLY RESONANT — frustrations that make someone click "buy".
3. Use scenarios must be VISUAL and VIVID — they will become actual video shots.
4. Video hook angles must be ready-to-use opening lines (under 15 words, 3 seconds spoken).
5. Target audience must be SPECIFIC groups (not "everyone" or "people who like nice things").
6. Write ALL strings in English (the ads are for English-speaking markets).
7. Return ONLY valid JSON — no markdown, no explanation, no code fences."""


# ═══════════════════════════════════════════════════════════════════════
# Layer 1: 数据检索
# ═══════════════════════════════════════════════════════════════════════

async def _scrape_with_apify(asin: str) -> dict | None:
    """用 Apify Amazon Product Scraper 抓取产品数据。"""
    if not APIFY_TOKEN:
        logger.info("APIFY_API_TOKEN not set, skipping Apify")
        return None

    try:
        async with httpx.AsyncClient(timeout=180) as client:
            # Step 1: 启动 actor run，等待完成
            actor_path = APIFY_AMAZON_ACTOR.replace("/", "~")
            resp = await client.post(
                f"https://api.apify.com/v2/acts/{actor_path}/runs",
                params={
                    "token": APIFY_TOKEN,
                    "waitForFinish": "120",
                },
                json={
                    "asinCodes": [asin],
                    "maxItemsPerAsin": 1,
                    "proxyConfiguration": {"useApifyProxy": True},
                },
                timeout=180,
            )
            if resp.status_code == 403:
                logger.warning("Apify quota exceeded — falling back to Tavily")
                return None
            if resp.status_code not in (200, 201):
                logger.warning(f"Apify returned {resp.status_code}: {resp.text[:300]}")
                return None

            run_data = resp.json()
            run_info = run_data.get("data", {})
            run_id = run_info.get("id", "")
            status = run_info.get("status", "")

            if not run_id:
                logger.warning(f"Apify: no run id: {str(run_data)[:200]}")
                return None

            logger.info(f"Apify run {run_id}: status={status}")

            if status != "SUCCEEDED":
                logger.warning(f"Apify run not successful: {status}")
                return None

            # Step 2: 获取 dataset items
            default_dataset_id = run_info.get("defaultDatasetId", "")
            if default_dataset_id:
                ds_resp = await client.get(
                    f"https://api.apify.com/v2/datasets/{default_dataset_id}/items",
                    params={"token": APIFY_TOKEN, "format": "json"},
                )
                if ds_resp.status_code == 200:
                    items = ds_resp.json()
                    if isinstance(items, list) and len(items) > 0:
                        item = items[0]
                        logger.info(f"Apify scraped: {item.get('title', 'N/A')[:80]}")
                        return item
                    elif isinstance(items, dict):
                        logger.info(f"Apify scraped: {items.get('title', 'N/A')[:80]}")
                        return items

            logger.warning("Apify returned empty dataset")
            return None

    except Exception as e:
        logger.warning(f"Apify scraping failed: {e}")
        return None


async def _search_with_tavily(url: str, product_hints: str) -> str:
    """用 Tavily 搜索产品评价和规格信息。"""
    api_key = os.getenv("TAVILY_API_KEY", "")
    if not api_key:
        return ""

    # 从 URL 提取产品名作为搜索关键词（兼容多种 Amazon URL 格式）
    query_parts = []
    # 格式1: /dp/ASIN/title-slug
    m = re.search(r'\.com/([^/]+(?:/[^/]+)*?)/dp/', url)
    if m:
        query_parts.append(m.group(1).replace('-', ' '))
    # 格式2: /gp/product/ASIN (无产品名，用 ASIN 搜)
    m = re.search(r'/gp/product/([A-Z0-9]+)', url)
    if m and not query_parts:
        query_parts.append(f"Amazon ASIN {m.group(1)} product")

    if not query_parts:
        return ""

    query = f"{' '.join(query_parts)} product review features specifications pros cons"
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
                text = data.get("answer", "") + "\n\n"
                for r in data.get("results", [])[:5]:
                    text += f"- {r.get('title', '')}: {r.get('content', '')[:300]}\n"
                logger.info(f"Tavily search: {len(text)} chars for '{query[:60]}'")
                return text[:4000]
            return ""
    except Exception as e:
        logger.warning(f"Tavily search failed: {e}")
        return ""


async def _fetch_html(url: str) -> str:
    """直接 HTTP 抓取页面（Amazon 通常会被反爬）。"""
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
            return resp.text
    except Exception as e:
        logger.warning(f"HTTP fetch failed: {e}")
        return ""


def _parse_html_basics(html: str) -> dict:
    """从 HTML 中提取基础信息（fallback 用，兼容 bot detection 页面）。"""
    title = ""
    desc = ""
    price = ""
    images = []
    category_hints = []

    if len(html) < 500:
        return {"title": "", "description": "", "price": "", "images": [], "category_hints": []}

    # 1) <title> 标签（bot detection 页面也有！包含完整产品名）
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.DOTALL | re.IGNORECASE)
    if m:
        raw_title = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        # 去掉 "Amazon.com:" 前缀和 " : Health & Household" 等后缀
        raw_title = re.sub(r'^Amazon\.com\s*:?\s*', '', raw_title).strip()
        raw_title = re.sub(r'\s*:\s*(Health|Home|Sports|Electronics|Beauty|Kitchen|Office|Pet|Garden|Toys|Automotive|Fashion|Medical|Baby|Tools|Food|Music|Books|Software|Video Games|Appstore|Apps|Kindle Store|Clothing|Jewelry|Shoes|Handmade|Industrial|Scientific|Musical Instruments|Grocery|Luxury|Collectibles|Magazine|Subscription|Cell Phones|Accessories|Digital Music|CDs|Vinyl|DVD|Blu-ray|Prime Video|Alexa Skills|Echo|Fire|Fire Tablet|Fire TV|Kindle|Kindle E-readers|Kindle Books|Audible|Amazon Fresh|Amazon Pharmacy|Amazon Clinic|One Medical|Amazon Kids\+|Amazon Photos|Amazon Drive|Amazon Music|Amazon Pay|Amazon Credit|Amazon Gift Cards|Amazon Handmade|Amazon Home|Amazon Launchpad|Amazon Renewed|Amazon Warehouse|Amazon Second Chance|Amazon Outlet|Amazon Explore)\s*$', '', raw_title)
        title = raw_title.strip()

    # 2) productTitle span（仅在真实 Amazon 页面有效）
    if not title:
        m = re.search(r'<span[^>]*id="productTitle"[^>]*>(.*?)</span>', html, re.DOTALL)
        if m:
            title = re.sub(r'<[^>]+>', '', m.group(1)).strip()

    # 3) Meta description
    m = re.search(r'<meta[^>]*name="description"[^>]*content="([^"]*)"', html, re.IGNORECASE)
    if m:
        desc = m.group(1)[:500]

    # 4) Price — 多种格式
    for pattern in [r'\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?',
                    r'\$\d+\.?\d*']:
        m = re.search(pattern, html)
        if m and m.group(0) not in ('$0', '$0.00'):
            price = m.group(0)
            break

    # 5) Images
    for pat in [r'"hiRes":"([^"]+)"', r'"large":"([^"]+)"',
                r'<img[^>]*src="([^"]*)"']:
        found = re.findall(pat, html)
        images = [u for u in found if u.startswith("http") and not u.endswith(".svg")
                  and "sprite" not in u.lower() and "icon" not in u.lower()
                  and "pixel" not in u.lower() and "logo" not in u.lower()][:10]
        if images:
            break

    # 6) Category — 从 title/body 中推断
    body = re.sub(r'<[^>]+>', ' ', html[:50000])
    text = (title + " " + body).lower()
    cate_kw = ["electronics", "home", "kitchen", "sports", "beauty", "fashion",
               "health", "medical", "fitness", "wellness", "pain relief",
               "office", "pet", "garden", "automotive", "tools"]
    for kw in cate_kw:
        if kw in text:
            category_hints.append(kw)

    logger.info(f"HTML parsed: title='{title[:80]}', price='{price}', "
                f"images={len(images)}, categories={category_hints}")

    return {"title": title, "description": desc[:500], "price": price,
            "images": images, "category_hints": category_hints[:5]}


def _extract_search_hints(url: str) -> str:
    """从各种 URL 格式中提取产品搜索关键词。"""
    # /dp/ASIN/title-slug
    m = re.search(r'\.com/([^/]+(?:/[^/]+)*?)/dp/', url)
    if m:
        return m.group(1).replace('-', ' ')
    # /gp/product/ASIN
    m = re.search(r'/gp/product/([A-Z0-9]+)', url)
    if m:
        return f"Amazon ASIN {m.group(1)} product"
    # /product/slug
    m = re.search(r'/product/([^/?]+)', url)
    if m:
        return m.group(1).replace('-', ' ')
    # generic fallback
    parts = url.rstrip('/').split('/')
    for p in reversed(parts):
        if p and len(p) > 3 and not p.startswith('ref='):
            return p.replace('-', ' ')
    return ""


async def _retrieve_product_data(url: str) -> dict:
    """
    Layer 1 — 数据检索。
    优先: Apify Amazon Actor → Tavily 搜索 → HTTP 直接抓取。
    返回: 结构化的产品原始数据。
    """
    retrieved = {
        "title": "",
        "description": "",
        "price": "",
        "features": [],       # bullet points / specs
        "images": [],
        "category": [],
        "rating": "",
        "review_count": "",
        "search_context": "",  # Tavily 搜索结果
        "source": "none",      # apify | tavily | http | none
    }

    # 1) 提取 ASIN（Apify 需要）
    asin_match = re.search(r'/dp/([A-Z0-9]+)', url)
    asin = asin_match.group(1) if asin_match else ""

    # 2) Apify Amazon Product Scraper
    if asin:
        apify_data = await _scrape_with_apify(asin)
        if apify_data:
            retrieved.update({
                "title": apify_data.get("title", ""),
                "description": apify_data.get("description", "")[:800],
                "price": apify_data.get("price", {}).get("value", "") if isinstance(apify_data.get("price"), dict) else str(apify_data.get("price", "")),
                "features": apify_data.get("featureBullets", []) or apify_data.get("features", []),
                "images": apify_data.get("imageUrls", []) or apify_data.get("images", []) or [],
                "category": apify_data.get("category", []) or apify_data.get("categories", []),
                "rating": str(apify_data.get("rating", "") or apify_data.get("starRating", "")),
                "review_count": str(apify_data.get("reviewsCount", "") or apify_data.get("numberOfReviews", "")),
                "source": "apify",
            })
            logger.info(f"Apify data: title={retrieved['title'][:60]}, "
                        f"features={len(retrieved['features'])}, "
                        f"images={len(retrieved['images'])}")

    # 3) HTTP 优先（真实页面数据，免费且快）
    html = await _fetch_html(url)
    basics = _parse_html_basics(html)
    if basics.get("title"):
        retrieved.update(basics)
        retrieved["source"] = "http"
        logger.info(f"HTTP parsed real product: {basics['title'][:80]}")

    # 4) Tavily 搜索（补充评价、口碑；仅在 HTTP 数据不够时作为主要来源）
    if not retrieved.get("title") or retrieved["source"] == "none":
        url_hints = _extract_search_hints(url)
    else:
        # 已经有产品名，用精确关键词搜补充信息
        url_hints = retrieved["title"][:100]

    # 判断 hints 质量：有实际产品名 = good，只有 ASIN 或空 = bad
    hints_is_good = bool(url_hints and len(url_hints) > 15 and "ASIN" not in url_hints)
    retrieved["search_hints_quality"] = "good" if hints_is_good else "bad"

    search_text = await _search_with_tavily(url, url_hints)
    if search_text:
        retrieved["search_context"] = search_text
        if retrieved["source"] == "none":
            retrieved["source"] = "tavily"

    # 5) 如果什么都没拿到，标记为无法识别
    if not retrieved["title"]:
        retrieved["title"] = url.split("/")[-1].replace('-', ' ')[:100]
        if not retrieved["title"] or retrieved["title"] in ("gp", "dp", "product"):
            retrieved["title"] = ""

    # 清理 features（确保是字符串列表）
    if retrieved["features"]:
        cleaned = []
        for f in retrieved["features"]:
            if isinstance(f, str):
                cleaned.append(f.strip()[:200])
            elif isinstance(f, dict):
                cleaned.append(str(f.get("text", f.get("name", str(f))))[:200])
        retrieved["features"] = [f for f in cleaned if f and len(f) > 3][:10]

    # 清理 images（确保是 URL 字符串列表）
    if retrieved["images"]:
        img_cleaned = []
        for img in retrieved["images"]:
            if isinstance(img, str) and img.startswith("http"):
                img_cleaned.append(img)
            elif isinstance(img, dict):
                url_val = img.get("url", img.get("src", img.get("link", "")))
                if url_val and url_val.startswith("http"):
                    img_cleaned.append(url_val)
        retrieved["images"] = img_cleaned[:10]

    logger.info(f"Data source: {retrieved['source']} | "
                f"Title: {retrieved['title'][:60]} | "
                f"Features: {len(retrieved['features'])} | "
                f"Images: {len(retrieved['images'])} | "
                f"Search: {len(retrieved['search_context'])} chars")

    return retrieved


# ═══════════════════════════════════════════════════════════════════════
# Layer 2: AI 分析
# ═══════════════════════════════════════════════════════════════════════

def _build_analysis_prompt(retrieved: dict, url: str) -> str:
    """把检索到的原始数据组装成给 AI 分析的 prompt。"""
    parts = [f"PRODUCT URL: {url}\n"]

    parts.append("=== RAW PRODUCT DATA (scraped from page) ===")

    if retrieved.get("title"):
        parts.append(f"Title: {retrieved['title']}")

    if retrieved.get("price"):
        parts.append(f"Price: {retrieved['price']}")

    if retrieved.get("rating"):
        parts.append(f"Rating: {retrieved['rating']} ({retrieved.get('review_count', '?')} reviews)")

    if retrieved.get("features"):
        parts.append("Features / Bullet Points:")
        for i, f in enumerate(retrieved["features"], 1):
            parts.append(f"  {i}. {f}")

    if retrieved.get("description"):
        parts.append(f"Description: {retrieved['description'][:600]}")

    if retrieved.get("category"):
        cat = retrieved["category"]
        if isinstance(cat, list):
            parts.append(f"Category: {' > '.join(str(c) for c in cat)}")
        else:
            parts.append(f"Category: {cat}")

    if retrieved.get("search_context"):
        parts.append(f"\n=== ADDITIONAL SEARCH RESULTS ===\n{retrieved['search_context'][:3000]}")

    parts.append(f"\nData source: {retrieved.get('source', 'unknown')}")

    return "\n".join(parts)


ANALYSIS_USER_PROMPT = """Analyze this product and return a JSON object for video ad creation.

{retrieved_data}

Return this EXACT JSON structure (fill every field, use empty string/list if truly unknown):
{{
  "product_name": "Clean, short product name (max 8 words, remove brand if redundant)",
  "brand": "Brand name",
  "category_tree": ["Level1", "Level2", "Level3"],
  "price": "Price string (e.g. '$39.99') or empty string",
  "key_features": ["Most important feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
  "target_audience": ["Specific group 1 (e.g. 'Office workers with chronic back pain')", "group 2", "group 3", "group 4"],
  "pain_points": ["Emotional frustration 1 (write as if you've experienced it)", "pain 2", "pain 3", "pain 4"],
  "use_scenarios": ["Vivid visual scene 1 (specific enough to film)", "scene 2", "scene 3", "scene 4"],
  "unique_selling_points": ["What makes this different/better 1", "USP 2", "USP 3"],
  "product_description": "A compelling 2-3 sentence summary for video voiceover intro",
  "video_hook_angles": ["Short hook opener 1 (under 15 words)", "hook 2 (under 15 words)", "hook 3 (under 15 words)", "hook 4 (under 15 words)"]
}}

CRITICAL:
- video_hook_angles MUST be short (< 15 words each). Think TikTok hooks: "Back pain ruining your day?", "No wires. No pills. Just relief."
- target_audience MUST be specific groups, NOT labels like "primary" or "secondary".
- pain_points MUST be emotional/frustrating, not just feature restatements.
- use_scenarios MUST be visual scenes you could film, not abstract concepts."""


async def _call_deepseek(prompt: str) -> str | None:
    """DeepSeek API (OpenAI 兼容)。"""
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
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 2048,
                    "temperature": 0.7,
                },
            )
            if resp.status_code != 200:
                logger.error(f"DeepSeek returned {resp.status_code}: {resp.text[:300]}")
                return None
            return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"DeepSeek call failed: {e}")
        return None


async def _call_anthropic(prompt: str) -> str | None:
    """Anthropic API (SDK 优先，HTTP 备用)。"""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return None

    # SDK
    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=api_key, timeout=60)
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            system=ANALYSIS_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text
    except Exception as e:
        logger.warning(f"Anthropic SDK failed: {e}")

    # HTTP fallback
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
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            if resp.status_code != 200:
                logger.error(f"Anthropic HTTP returned {resp.status_code}")
                return None
            return resp.json()["content"][0]["text"]
    except Exception as e:
        logger.error(f"Anthropic HTTP failed: {e}")
        return None


async def _analyze_with_ai(retrieved: dict, url: str) -> dict | None:
    """
    Layer 2 — AI 分析。
    把检索到的产品原始数据发给 DeepSeek/Anthropic，产出创意分析。
    """
    retrieved_text = _build_analysis_prompt(retrieved, url)
    full_prompt = ANALYSIS_USER_PROMPT.format(retrieved_data=retrieved_text)

    # 优先 Anthropic，fallback DeepSeek
    raw = await _call_anthropic(full_prompt)
    provider = "anthropic"
    if not raw:
        raw = await _call_deepseek(full_prompt)
        provider = "deepseek"

    if not raw:
        logger.warning("No AI provider available")
        return None

    logger.info(f"AI analysis via {provider}, response: {len(raw)} chars")

    # 提取 JSON
    json_match = re.search(r'\{[\s\S]*\}', raw)
    if not json_match:
        logger.warning(f"No JSON in AI response: {raw[:300]}")
        return None

    try:
        return json.loads(json_match.group(0))
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse failed: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════
# 组装输出
# ═══════════════════════════════════════════════════════════════════════

def _assemble_result(url: str, retrieved: dict, ai_data: dict | None) -> dict:
    """把检索数据 + AI 分析合并为最终输出。"""
    result = {
        # ── 兼容旧字段 ──
        "title": (ai_data.get("product_name") if ai_data else "") or retrieved.get("title", url),
        "description": (ai_data.get("product_description") if ai_data else "") or retrieved.get("description", ""),
        "price": (ai_data.get("price") if ai_data else "") or retrieved.get("price", ""),
        "images": retrieved.get("images", []),
        "category_hints": (ai_data.get("category_tree") if ai_data else []) or retrieved.get("category", []),
        "url": url,
        # ── AI 新增字段 ──
        "brand": (ai_data.get("brand") if ai_data else "") or "",
        "key_features": (ai_data.get("key_features") if ai_data else []) or retrieved.get("features", []),
        "target_audience": ai_data.get("target_audience", []) if ai_data else [],
        "pain_points": ai_data.get("pain_points", []) if ai_data else [],
        "use_scenarios": ai_data.get("use_scenarios", []) if ai_data else [],
        "unique_selling_points": ai_data.get("unique_selling_points", []) if ai_data else [],
        "video_hook_angles": ai_data.get("video_hook_angles", []) if ai_data else [],
        "product_summary": (ai_data.get("product_description") if ai_data else "") or "",
        # ── 元数据 ──
        "ai_analyzed": ai_data is not None,
        "data_source": retrieved.get("source", "none"),
        "error": None,
    }

    # 兜底：如果 AI 分析没做，用检索数据填充 key_features
    if not result["key_features"]:
        result["key_features"] = retrieved.get("features", [])[:5]

    # 确保 title 干净（去掉 Amazon 前缀）
    for prefix in ["Amazon.com:", "Amazon.com :", "Amazon.com"]:
        if result["title"].startswith(prefix):
            result["title"] = result["title"][len(prefix):].strip().lstrip(":").strip()

    return result


# ── 主入口 ──────────────────────────────────────────────────────────────

async def fetch_product_info(url: str) -> dict:
    """
    产品分析主入口。

    Layer 1: Apify → Tavily → HTTP 检索产品原始数据
    Layer 2: DeepSeek/Anthropic AI 分析 → 创意输出
    """
    logger.info(f"Stage 1 start: {url[:100]}")

    # ── Layer 1: 数据检索 ──
    retrieved = await _retrieve_product_data(url)

    if retrieved.get("error"):
        return {
            "title": url, "description": "", "price": "", "images": [],
            "category_hints": [], "url": url,
            "key_features": [], "target_audience": [], "pain_points": [],
            "use_scenarios": [], "unique_selling_points": [],
            "video_hook_angles": [], "product_summary": "",
            "ai_analyzed": False, "data_source": "error",
            "error": retrieved["error"],
        }

    # ── Layer 2: AI 分析 ──
    # 数据质量门禁：判断是否有足够可靠的信息给 AI 分析
    # 三类可信数据源：HTTP 真实页面 > Tavily 有产品名的搜索 > 空
    has_http_title = retrieved.get("source") == "http" and len(retrieved.get("title", "")) > 10
    has_good_search = (
        len(retrieved.get("search_context", "")) > 500 and
        retrieved.get("search_hints_quality") == "good"
    )
    has_features = len(retrieved.get("features", [])) > 0

    if has_http_title or has_good_search or has_features:
        ai_data = await _analyze_with_ai(retrieved, url)
    else:
        logger.warning(
            f"Insufficient data: http_title={has_http_title}, "
            f"good_search={has_good_search}, features={has_features}"
        )
        ai_data = None

    # ── 组装 ──
    return _assemble_result(url, retrieved, ai_data)

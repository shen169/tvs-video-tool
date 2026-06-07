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
# junglee/amazon-crawler: 需要 categoryOrProductUrls（keyword爬取），不适合单产品查询
APIFY_AMAZON_ACTOR = "junglee/amazon-crawler"
# 注意: 免费层 Apify actor 代理常被 Amazon 封，返回空数据。优先依赖 HTML JSON-LD 解析。

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

async def _scrape_with_apify(url: str) -> dict | None:
    """用 Apify Amazon Product Scraper 抓取产品数据。

    junglee/amazon-crawler 要求:
    - categoryOrProductUrls: [{"url": "https://www.amazon.com/..."}]  ← 对象数组，不是字符串！
    - URL 需要完整亚马逊产品链接（含产品名 slug），短格式 /dp/ASIN 会返回 no_results_found
    """
    if not APIFY_TOKEN:
        logger.info("APIFY_API_TOKEN not set, skipping Apify")
        return None

    try:
        async with httpx.AsyncClient(timeout=180) as client:
            actor_path = APIFY_AMAZON_ACTOR.replace("/", "~")
            resp = await client.post(
                f"https://api.apify.com/v2/acts/{actor_path}/runs",
                params={
                    "token": APIFY_TOKEN,
                    "waitForFinish": 120,
                },
                json={
                    "categoryOrProductUrls": [{"url": url}],
                    "maxItems": 3,
                },
                timeout=180,
            )
            if resp.status_code == 403:
                logger.warning("Apify quota exceeded — falling back to other sources")
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
                        # 检查是否是 error item（产品不存在/反爬拦截）
                        if item.get("error"):
                            logger.warning(f"Apify item error: {item.get('error')} — {item.get('errorDescription', '')}")
                            return None
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

    # 4) Price — 优先 Amazon 特定元素，再 fallback 到正则
    # 4a) 尝试 Amazon 专有价格元素
    for span_id in ['priceblock_ourprice', 'priceblock_dealprice',
                     'apexPriceToPay', 'corePriceDisplay_desktop_feature_div',
                     'tp_price_block_total_price_ww', 'price_inside_buybox']:
        m = re.search(
            rf'<[^>]*id=["\']{span_id}["\'][^>]*>.*?\$[\d,]+(?:\.\d{{2}})?.*?</',
            html, re.DOTALL | re.IGNORECASE)
        if m:
            pm = re.search(r'\$[\d,]+(?:\.\d{2})?', m.group(0))
            if pm and pm.group(0) not in ('$0', '$0.00', '$0.0'):
                price = pm.group(0).replace(',', '')
                logger.info(f"Price from Amazon element #{span_id}: {price}")
                break

    # 4b) 尝试 class 包含 price 的 span
    if not price:
        m = re.search(
            r'<span[^>]*class="[^"]*price[^"]*"[^>]*>\s*(\$[\d,]+(?:\.\d{2})?)\s*</span>',
            html, re.IGNORECASE)
        if m and m.group(1) not in ('$0', '$0.00'):
            price = m.group(1).replace(',', '')

    # 4c) JSON-LD structured data — Amazon 产品页面最可靠的数据源
    #     提取完整 Product schema: title, price, images, brand, description, rating
    jsonld_data = {}
    for m_ld in re.finditer(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, re.DOTALL | re.IGNORECASE):
        try:
            ld = json.loads(m_ld.group(1))
            if isinstance(ld, dict) and ld.get("@type") == "Product":
                jsonld_data = ld
                break
            # 也可能是 @graph 数组
            if isinstance(ld, dict) and "@graph" in ld:
                for item in ld["@graph"]:
                    if isinstance(item, dict) and item.get("@type") == "Product":
                        jsonld_data = item
                        break
                if jsonld_data:
                    break
        except (json.JSONDecodeError, ValueError):
            continue

    if jsonld_data:
        # Price (优先 offers.price，Amazon 标准字段)
        offers = jsonld_data.get("offers", {})
        if isinstance(offers, dict):
            jld_price = str(offers.get("price", ""))
        elif isinstance(offers, list) and len(offers) > 0:
            jld_price = str(offers[0].get("price", ""))
        else:
            jld_price = ""

        if jld_price:
            try:
                float(jld_price)  # 验证是合法数字
                if float(jld_price) > 0.5:
                    price = f"${jld_price}"
                    logger.info(f"Price from JSON-LD offers.price: {price}")
            except (ValueError, TypeError):
                pass

        # 如果没从 offers 拿到价格，尝试其他路径
        if not price:
            for key in ("lowPrice", "highPrice", "price"):
                raw = jsonld_data.get(key, "")
                if raw:
                    try:
                        if float(str(raw)) > 0.5:
                            price = f"${raw}"
                            logger.info(f"Price from JSON-LD {key}: {price}")
                            break
                    except (ValueError, TypeError):
                        pass

        # JSON-LD 提供额外的可靠字段，补充到结果中
        _jld_title = jsonld_data.get("name", "")
        if _jld_title and not title:
            title = _jld_title.strip()
            logger.info(f"Title from JSON-LD: {title[:80]}")

        _jld_desc = jsonld_data.get("description", "")
        if _jld_desc and not desc:
            desc = str(_jld_desc)[:500]

        # Images from JSON-LD (Amazon 通常放高清图 URL)
        _jld_images = jsonld_data.get("image", [])
        if isinstance(_jld_images, str):
            _jld_images = [_jld_images]
        if isinstance(_jld_images, list) and _jld_images and not images:
            images = [str(img) for img in _jld_images if str(img).startswith("http")][:10]
            if images:
                logger.info(f"Images from JSON-LD: {len(images)}")

        _jld_brand = jsonld_data.get("brand", {})
        if isinstance(_jld_brand, dict):
            _jld_brand_name = _jld_brand.get("name", "")
        elif isinstance(_jld_brand, str):
            _jld_brand_name = _jld_brand
        else:
            _jld_brand_name = ""

        _jld_rating = jsonld_data.get("aggregateRating", {})
        if isinstance(_jld_rating, dict):
            _jld_rating_val = _jld_rating.get("ratingValue", "")
            _jld_review_cnt = _jld_rating.get("reviewCount", "")
        else:
            _jld_rating_val = ""
            _jld_review_cnt = ""

    # 4d) Fallback: 找所有 $ 金额，优先取带小数的（真实产品价格特征）
    if not price:
        all_prices = re.findall(r'\$[\d,]+(?:\.\d{2})?', html)
        # 过滤：排除明显不合理的价格（<$1, 纯整数且<$20 的可能是导航/运费）
        candidates = []
        for p in all_prices:
            numeric = float(p.replace('$', '').replace(',', ''))
            if numeric < 0.5:
                continue
            candidates.append((p, numeric))
        if candidates:
            # 优先选择带小数的（$29.99 > $30）
            with_cents = [(p, n) for p, n in candidates if '.' in p and n > 1.0]
            if with_cents:
                # 选最贵的（产品价格通常是页面上最高的价格之一）
                price = sorted(with_cents, key=lambda x: -x[1])[0][0].replace(',', '')
            else:
                # 没有带小数的，选 > $20 的（过滤运费/小商品）
                big = [(p, n) for p, n in candidates if n > 20]
                if big:
                    price = sorted(big, key=lambda x: -x[1])[0][0].replace(',', '')
                else:
                    price = candidates[0][0].replace(',', '')
            logger.info(f"Price from regex scan: {price} (from {len(candidates)} candidates)")

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
                f"images={len(images)}, categories={category_hints}"
                + (f", jsonld=yes" if jsonld_data else ""))

    return {"title": title, "description": desc[:500], "price": price,
            "images": images, "category_hints": category_hints[:5],
            "jsonld_brand": _jld_brand_name if jsonld_data else "",
            "jsonld_rating": _jld_rating_val if jsonld_data else "",
            "jsonld_review_count": str(_jld_review_cnt) if jsonld_data else ""}


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
        "brand": "",
        "features": [],       # bullet points / specs
        "images": [],
        "category": [],
        "rating": "",
        "review_count": "",
        "search_context": "",  # Tavily 搜索结果
        "source": "none",      # apify | tavily | http | none
    }

    # 1) 检查是否是 Amazon URL（有 /dp/ASIN 或 /gp/product/ASIN）
    asin_match = re.search(r'/dp/([A-Z0-9]+)', url)
    asin = asin_match.group(1) if asin_match else ""

    # 2) Apify Amazon Product Scraper（传完整 URL，junglee actor 需要产品名 slug）
    #    只要看起来是亚马逊链接就尝试；Tavily/HTTP 兜底
    if "amazon." in url:
        apify_data = await _scrape_with_apify(url)
        if apify_data:
            # ── 价格解析（junglee actor 返回多种格式） ──
            raw_price = apify_data.get("price", "")
            if isinstance(raw_price, dict):
                apify_price = raw_price.get("value", "")
            elif isinstance(raw_price, (int, float)):
                apify_price = f"${raw_price}"
            elif isinstance(raw_price, str) and raw_price.strip():
                # 格式: "278 $" → "$278",  "29.99 $" → "$29.99"
                raw_str = raw_price.strip()
                currency_match = re.match(r'([\d,.]+)\s*\$?', raw_str)
                if currency_match:
                    apify_price = f"${currency_match.group(1)}"
                else:
                    apify_price = raw_str
            else:
                apify_price = ""

            raw_list_price = apify_data.get("listPrice", "")
            if isinstance(raw_list_price, (str, int, float)) and str(raw_list_price).strip():
                list_str = str(raw_list_price).strip()
                m = re.match(r'([\d,.]+)', list_str)
                if m:
                    apify_price = f"${m.group(1)}"

            # ── 图片 ──
            apify_images = (
                apify_data.get("highResolutionImages") or
                apify_data.get("galleryThumbnails") or
                apify_data.get("imageUrls") or
                []
            )
            if not apify_images and apify_data.get("thumbnailImage"):
                apify_images = [apify_data["thumbnailImage"]]

            # ── 分类（breadCrumbs 是 path 列表） ──
            breadcrumbs = apify_data.get("breadCrumbs", [])
            if isinstance(breadcrumbs, list):
                apify_category = [b.get("name", str(b)) if isinstance(b, dict) else str(b)
                                  for b in breadcrumbs]
            else:
                apify_category = apify_data.get("category", []) or apify_data.get("categories", [])

            retrieved.update({
                "title": apify_data.get("title", ""),
                "description": apify_data.get("description", "")[:800],
                "price": apify_price,
                "features": (apify_data.get("features") or
                             apify_data.get("featureBullets") or []),
                "images": apify_images if isinstance(apify_images, list) else [],
                "category": apify_category,
                "rating": str(apify_data.get("stars", "") or apify_data.get("rating", "")),
                "review_count": str(apify_data.get("reviewsCount", "") or
                                    apify_data.get("numberOfReviews", "")),
                "source": "apify",
            })
            logger.info(f"Apify data: title={retrieved['title'][:60]}, "
                        f"price={apify_price}, features={len(retrieved['features'])}, "
                        f"images={len(retrieved['images'])}")

    # 3) HTTP 解析（仅在 Apify 数据不完整时补充，绝不覆盖 Apify 真实数据）
    html = await _fetch_html(url)
    basics = _parse_html_basics(html)
    if basics.get("title"):
        # 只填空白字段，不覆盖已有数据（Apify 抓取的数据更可靠）
        base_fields = {
            "title": "title",
            "description": "description",
            "price": "price",
            "images": "images",
            "category_hints": "category",
        }
        for src_field, dst_field in base_fields.items():
            existing = retrieved.get(dst_field)
            is_empty = (
                existing is None or
                (isinstance(existing, str) and not existing.strip()) or
                (isinstance(existing, list) and len(existing) == 0)
            )
            if is_empty and basics.get(src_field):
                retrieved[dst_field] = basics[src_field]

        # JSON-LD 额外字段（brand, rating, review_count）
        for src, dst in [("jsonld_brand", "brand"), ("jsonld_rating", "rating"),
                         ("jsonld_review_count", "review_count")]:
            existing = retrieved.get(dst)
            is_empty = (
                existing is None or
                (isinstance(existing, str) and not existing.strip())
            )
            if is_empty and basics.get(src):
                retrieved[dst] = basics[src]
                logger.debug(f"Filled '{dst}' from JSON-LD: {basics[src][:40]}")

        if retrieved["source"] == "none":
            retrieved["source"] = "http"
        logger.info(f"HTTP merged (not overwritten): title='{basics['title'][:80]}', "
                    f"price='{basics.get('price', '')}'")

    # 4) Tavily 搜索（补充评价、口碑；仅在 HTTP 数据不够时作为主要来源）
    if not retrieved.get("title") or retrieved["source"] in ("none", "tavily"):
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


ANALYSIS_USER_PROMPT_TEMPLATE = """Analyze this product and return a JSON object for video ad creation.

___RETRIEVED_DATA___

Return this EXACT JSON structure (fill every field, use empty string/list if truly unknown):
{
  "product_name": "Clean, short product name (max 8 words, remove brand if redundant)",
  "brand": "Brand name",
  "category_tree": ["Level1", "Level2", "Level3"],
  "price": "EXACT price from scraped data ONLY. If no price found, use empty string ''. NEVER invent or guess a price.",
  "key_features": ["Most important feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
  "target_audience": ["Specific group 1 (e.g. 'Office workers with chronic back pain')", "group 2", "group 3", "group 4"],
  "pain_points": ["Emotional frustration 1 (write as if you've experienced it)", "pain 2", "pain 3", "pain 4"],
  "use_scenarios": ["Vivid visual scene 1 (specific enough to film)", "scene 2", "scene 3", "scene 4"],
  "unique_selling_points": ["What makes this different/better 1", "USP 2", "USP 3"],
  "product_description": "A compelling 2-3 sentence summary for video voiceover intro",
  "video_hook_angles": ["Short hook opener 1 (under 15 words)", "hook 2 (under 15 words)", "hook 3 (under 15 words)", "hook 4 (under 15 words)"]
}

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
    full_prompt = ANALYSIS_USER_PROMPT_TEMPLATE.replace("___RETRIEVED_DATA___", retrieved_text)

    # 优先 DeepSeek（便宜），fallback Anthropic
    raw = await _call_deepseek(full_prompt)
    provider = "deepseek"
    if not raw:
        raw = await _call_anthropic(full_prompt)
        provider = "anthropic"

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
    # 辅助：确保字段是列表
    def _as_list(val, default=None):
        if default is None:
            default = []
        if val is None:
            return default
        if isinstance(val, str):
            return [val] if val.strip() else default
        if isinstance(val, list):
            return [str(v).strip() for v in val if str(v).strip()]
        return default

    # AI 编造的假价格检测：纯数字且不在抓取数据中出现过的，丢弃
    _ai_raw_price = (ai_data.get("price") if ai_data else "") or ""
    ai_price = (str(_ai_raw_price) if not isinstance(_ai_raw_price, str) else _ai_raw_price).strip()
    scraped_price = str(retrieved.get("price", "") or "").strip()
    # 如果 AI 给的价格不在抓取数据里出现过（哪怕部分匹配），大概率是编的
    if ai_price and scraped_price and ai_price not in scraped_price and scraped_price not in ai_price:
        logger.warning(f"AI price '{ai_price}' doesn't match scraped '{scraped_price}' — discarding AI price")
        ai_price = ""
    # 如果抓取数据本身就没价格，AI 给的价格也大概率是编的（除非抓取源有但格式奇怪）
    if ai_price and not scraped_price:
        logger.warning(f"AI generated price '{ai_price}' with no scraped price — discarding")
        ai_price = ""

    # 规范化价格格式：确保始终带 $ 前缀
    final_price = ai_price or scraped_price
    if final_price and not final_price.startswith("$"):
        try:
            float(final_price)  # 验证是合法数字
            final_price = f"${final_price}"
        except (ValueError, TypeError):
            pass  # 保留原样

    result = {
        # ── 兼容旧字段 ──
        "title": (ai_data.get("product_name") if ai_data else "") or retrieved.get("title", url),
        "description": (ai_data.get("product_description") if ai_data else "") or retrieved.get("description", ""),
        "price": final_price,
        "images": retrieved.get("images", []),
        "category_hints": (ai_data.get("category_tree") if ai_data else []) or retrieved.get("category", []),
        "url": url,
        # ── AI 新增字段（强制标准化为列表） ──
        "brand": (ai_data.get("brand") if ai_data else "") or retrieved.get("brand", ""),
        "key_features": _as_list(ai_data.get("key_features") if ai_data else None) or retrieved.get("features", []),
        "target_audience": _as_list(ai_data.get("target_audience") if ai_data else None),
        "pain_points": _as_list(ai_data.get("pain_points") if ai_data else None),
        "use_scenarios": _as_list(ai_data.get("use_scenarios") if ai_data else None),
        "unique_selling_points": _as_list(ai_data.get("unique_selling_points") if ai_data else None),
        "video_hook_angles": _as_list(ai_data.get("video_hook_angles") if ai_data else None),
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

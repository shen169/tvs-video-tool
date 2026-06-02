import httpx
import re


async def fetch_product_info(url: str) -> dict:
    """抓取产品页面，提取结构化信息。"""
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                              "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            })
            html = resp.text
    except Exception as e:
        return {"error": f"抓取失败: {str(e)}", "title": url, "description": "", "price": "", "images": [], "category_hints": [], "url": url}

    title = ""
    title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE)
    if title_match:
        title = title_match.group(1).strip()

    desc = ""
    desc_match = re.search(r'<meta[^>]*name="description"[^>]*content="([^"]*)"', html, re.IGNORECASE)
    if desc_match:
        desc = desc_match.group(1)

    price = ""
    price_match = re.search(r'\$\d+\.?\d*', html)
    if price_match:
        price = price_match.group(0)

    images = []
    img_matches = re.findall(r'<img[^>]*src="([^"]*)"', html)
    images = [src for src in img_matches[:10] if src.startswith("http") and not src.endswith(".svg")]

    category_keywords = []
    body_text = re.sub(r'<[^>]+>', ' ', html[:50000])
    cate_patterns = ["electronics", "home", "kitchen", "sports", "beauty", "fashion",
                     "toys", "automotive", "health", "office", "pet", "garden"]
    for kw in cate_patterns:
        if kw.lower() in body_text.lower():
            category_keywords.append(kw)

    return {
        "title": title,
        "description": desc[:500],
        "price": price,
        "images": images[:5],
        "category_hints": category_keywords[:5],
        "url": url,
    }

import os
import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)

SEEDANCE_API = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks"
SEEDANCE_MODEL = "doubao-seedance-2-0-260128"


def _build_content(task: dict, platform: str) -> list[dict]:
    """构造 Seedance content 数组，包含 text + reference images。"""
    scripts = task.get("scripts", {}).get(platform, [])
    style = task.get("selected_style", {})
    ref_image_url = task.get("ref_image_url", "")

    # 合并所有分镜为一个连续 prompt
    shots_text = "；".join([
        f"{s['duration']}秒：{s['scene']}。字幕：{s['subtitle']}"
        for s in scripts
    ])
    style_prefix = (
        f"{style.get('visual_style', 'clean_minimal')} product video, "
        f"{style.get('camera', 'smooth_cinematic')} camera movement, "
        f"{style.get('lighting', 'soft_studio')} lighting, "
        f"photorealistic quality."
    )
    merged_prompt = f"全程{style_prefix}。{shots_text}"

    content = [{"type": "text", "text": merged_prompt}]

    # 如果有产品参考图（非 AI 生成占位符），加入
    if ref_image_url and not ref_image_url.startswith("__") and ref_image_url.startswith("http"):
        content.append({
            "type": "image_url",
            "image_url": {"url": ref_image_url},
            "role": "reference_image",
        })

    return content


async def _poll_task(task_id: str, api_key: str, timeout: int = 300) -> dict:
    """轮询 Seedance 任务直到完成或超时。"""
    import httpx
    deadline = asyncio.get_event_loop().time() + timeout
    async with httpx.AsyncClient(timeout=30) as client:
        while asyncio.get_event_loop().time() < deadline:
            resp = await client.get(
                f"{SEEDANCE_API}/{task_id}",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            data = resp.json()
            status = data.get("status", "unknown")
            logger.info(f"[{task_id}] Seedance status: {status}")

            if status == "completed" or status == "succeeded":
                # video_url 在 content.video_url 中
                content = data.get("content", {})
                if isinstance(content, dict):
                    video_url = content.get("video_url", "")
                else:
                    video_url = ""
                return {"status": "completed", "video_url": video_url, "raw": data}
            elif status in ("failed", "cancelled"):
                return {"status": status, "error": data.get("error", status), "raw": data}

            await asyncio.sleep(15)

        return {"status": "timeout", "error": "Polling timed out"}


async def generate_video(task: dict, platform: str) -> str:
    """调用 Seedance 2.0 生成视频，轮询完成后返回视频 URL。"""
    scripts = task.get("scripts", {}).get(platform, [])
    title = task.get("product_info", {}).get("title", "product")

    api_key = os.getenv("SEEDANCE_API_KEY", "")
    if not api_key:
        logger.info(f"[{platform}] No SEEDANCE_API_KEY, returning mock URL")
        return f"__MOCK_VIDEO__:{platform}__{title[:20]}"

    content = _build_content(task, platform)

    is_amazon = platform == "amazon"
    total_duration = int(sum(s["duration"] for s in scripts))
    # Seedance duration range: 2-15 seconds
    total_duration = max(2, min(15, total_duration))
    # 音频生成耗时长排队久，MVP 默认关。有需求时改 True
    use_audio = os.getenv("SEEDANCE_AUDIO", "false").lower() == "true"
    payload = {
        "model": SEEDANCE_MODEL,
        "content": content,
        "generate_audio": use_audio,
        "ratio": "16:9" if is_amazon else "9:16",
        "duration": total_duration,
        "watermark": False,
    }

    logger.info(f"[{platform}] Sending to Seedance: duration={total_duration}s, ratio={payload['ratio']}")

    import httpx
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                SEEDANCE_API,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            data = resp.json()
            seedance_task_id = data.get("id", "")
            if not seedance_task_id:
                logger.error(f"[{platform}] Seedance create failed: {data}")
                return f"__ERROR__:no_task_id:{str(data)[:100]}"

            logger.info(f"[{platform}] Seedance task created: {seedance_task_id}")

        # 轮询等待完成
        result = await _poll_task(seedance_task_id, api_key)
        if result["status"] == "completed":
            return result["video_url"]
        else:
            return f"__ERROR__:{result['status']}:{result.get('error', 'unknown')[:100]}"

    except Exception as e:
        logger.warning(f"[{platform}] Seedance API exception: {e}")
        return f"__ERROR__:{str(e)[:200]}"


async def generate_all_videos(task: dict, platforms: list[str]) -> dict[str, str]:
    """并行生成所有平台的视频。"""
    import asyncio as _asyncio

    async def _gen_one(plat: str) -> tuple[str, str]:
        return plat, await generate_video(task, plat)

    results = await _asyncio.gather(*[_gen_one(plat) for plat in platforms])
    return {plat: url for plat, url in results}

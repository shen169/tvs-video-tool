import os
import logging

logger = logging.getLogger(__name__)


async def generate_video(task: dict, platform: str) -> str:
    """调用 Seedance 2.0 生成视频。MVP 返回 mock URL，后续接真实 API。"""
    scripts = task.get("scripts", {}).get(platform, [])
    style = task.get("selected_style", {})
    title = task.get("product_info", {}).get("title", "product")

    # 构造合并 prompt
    shots_text = "；".join([
        f"{s['duration']}秒：{s['scene']}" for s in scripts
    ])
    merged = (
        f"{style.get('visual_style', 'clean')} product video, "
        f"{style.get('camera', 'smooth')}, "
        f"{style.get('lighting', 'soft')}. {shots_text}"
    )

    api_key = os.getenv("SEEDANCE_API_KEY", "")
    if not api_key:
        return f"__MOCK_VIDEO__:{platform}__{title[:20]}"

    # 真实 API 调用（有 key 时）
    import httpx
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "doubao-seedance-2-0-260128",
                    "content": [{"type": "text", "text": merged}],
                    "generate_audio": True,
                    "ratio": "9:16" if platform != "amazon" else "16:9",
                    "duration": sum(s["duration"] for s in scripts),
                    "watermark": False,
                },
            )
            data = resp.json()
            return data.get("data", {}).get("video_url", merged)
    except Exception as e:
        logger.warning(f"[{platform}] Seedance API call failed: {e}")
        return f"__ERROR__:{str(e)}"


async def generate_all_videos(task: dict, platforms: list[str]) -> dict[str, str]:
    videos = {}
    for plat in platforms:
        videos[plat] = await generate_video(task, plat)
    return videos

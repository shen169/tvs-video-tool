import asyncio
import logging
from ..task_manager import InMemoryTaskStore
from ..models import TaskStage
from .stage1_fetch import fetch_product_info
from .stage2_image import generate_ref_image
from .stage3_style import generate_style_options

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_pipeline(task_id: str, store: InMemoryTaskStore):
    """Stage 1-3：从创建任务到等待风格选择"""
    try:
        task = store.get(task_id)
        if not task:
            logger.error(f"[{task_id}] Task not found")
            return
        logger.info(f"[{task_id}] Stage 1: Fetching product info from {task.product_url}")
        store.update(task_id, stage=TaskStage.FETCHING)
        product_info = await fetch_product_info(task.product_url)
        if product_info.get("error"):
            raise Exception(product_info["error"])
        store.update(task_id, product_info=product_info, stage=TaskStage.REF_IMAGE)

        logger.info(f"[{task_id}] Stage 2: Generating reference image")
        task_dict = store.get(task_id).model_dump()
        ref_image = await generate_ref_image(task_dict)
        store.update(task_id, ref_image_url=ref_image)

        logger.info(f"[{task_id}] Stage 3: Generating style options")
        style_options = await generate_style_options(product_info)
        store.update(task_id, style_options=style_options)

        logger.info(f"[{task_id}] Stage 2.5: Generating AI recommendation")
        platforms_list = [p.value for p in task.platforms]
        from .stage25_recommend import generate_recommendation
        recommendation = await generate_recommendation(product_info, platforms_list)
        store.update(task_id, recommendation=recommendation, stage=TaskStage.RECOMMEND_WAIT)
        logger.info(f"[{task_id}] Recommendation: {recommendation.get('video_type', '?')}")

    except Exception as e:
        logger.error(f"[{task_id}] Pipeline error: {e}")
        store.update(task_id, stage=TaskStage.FAILED, error=str(e)[:500])


async def continue_pipeline(task_id: str, store: InMemoryTaskStore):
    """用户确认推荐后 → 生成脚本分镜 + 预览图"""
    try:
        task = store.get(task_id)
        if not task:
            logger.error(f"[{task_id}] Task not found")
            return
        logger.info(f"[{task_id}] Generating scripts")
        store.update(task_id, stage=TaskStage.SCRIPT_GEN)
        platforms = [p.value for p in task.platforms]
        from .stage4_script import generate_all_scripts
        style = (task.selected_style.model_dump() if task.selected_style else {})
        scripts = await generate_all_scripts(
            task.product_info, platforms,
            style,
            task.creative_direction
        )
        store.update(task_id, scripts=scripts)

        # 生成预览图（提前到 preview_wait 之前）
        logger.info(f"[{task_id}] Generating preview images for {len(platforms)} platforms")
        from .stage5_preview import generate_preview_images
        previews: dict[str, list[str]] = {}
        async def _gen_platform(plat: str):
            previews[plat] = await generate_preview_images(task.model_dump(), plat)
            store.update(task_id, preview_images=dict(previews))
            logger.info(f"[{task_id}] {plat} previews saved ({len(previews[plat])} shots)")
        await asyncio.gather(*[_gen_platform(plat) for plat in platforms])

        store.update(task_id, preview_images=previews, stage=TaskStage.PREVIEW_WAIT)
        logger.info(f"[{task_id}] Scripts + previews complete, waiting for storyboard confirmation")
    except Exception as e:
        logger.error(f"[{task_id}] Pipeline error at script gen: {e}")
        store.update(task_id, stage=TaskStage.FAILED, error=str(e)[:500])


async def run_stage5_and_6(task_id: str, store: InMemoryTaskStore):
    """Stage 6：调用 Seedance 生成视频（预览图已在 continue_pipeline 中生成）"""
    try:
        task = store.get(task_id)
        if not task:
            logger.error(f"[{task_id}] Task not found")
            return
        task_dict = task.model_dump()
        platforms = [p.value for p in task.platforms]

        logger.info(f"[{task_id}] Stage 6: Generating videos via Seedance")
        store.update(task_id, stage=TaskStage.VIDEO_GEN)
        from .stage6_video import generate_all_videos
        videos = await generate_all_videos(task_dict, platforms)
        store.update(task_id, video_urls=videos, stage=TaskStage.DONE)
        logger.info(f"[{task_id}] Pipeline complete!")

    except Exception as e:
        logger.error(f"[{task_id}] Pipeline error at video gen: {e}")
        store.update(task_id, stage=TaskStage.FAILED, error=str(e)[:500])

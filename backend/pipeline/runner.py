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
        store.update(task_id, style_options=style_options, stage=TaskStage.STYLE_WAIT)
        logger.info(f"[{task_id}] Pipeline waiting for style selection")

    except Exception as e:
        logger.error(f"[{task_id}] Pipeline error: {e}")
        store.update(task_id, stage=TaskStage.FAILED, error=str(e)[:500])


async def continue_pipeline(task_id: str, store: InMemoryTaskStore):
    """Stage 4+ placeholder：风格选择后继续生成脚本、预览图和视频"""
    logger.info(f"[{task_id}] Stage 4+: Pipeline continuation triggered (not yet implemented)")
    task = store.get(task_id)
    logger.info(f"[{task_id}] Current stage: {task.stage.value}")

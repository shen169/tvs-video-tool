from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from .models import TaskState, TaskStage, Platform
from .task_manager import InMemoryTaskStore
import aiofiles, os

router = APIRouter(prefix="/api")
store: InMemoryTaskStore = None


def init_routes(s: InMemoryTaskStore):
    global store
    store = s


@router.post("/tasks")
async def create_task(url: str = Form(...), platforms: str = Form("tiktok,amazon,youtube,instagram")):
    platform_list = [Platform(p.strip()) for p in platforms.split(",") if p.strip()]
    task = TaskState(task_id="", product_url=url, platforms=platform_list, stage=TaskStage.PENDING)
    task = store.create(task)
    import asyncio as _asyncio
    from .pipeline.runner import run_pipeline
    _asyncio.create_task(run_pipeline(task.task_id, store))
    return {"task_id": task.task_id, "stage": task.stage.value}


@router.post("/tasks/{task_id}/ref-image")
async def upload_ref_image(task_id: str, file: UploadFile = File(...)):
    task = store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    os.makedirs(f"output/{task_id}", exist_ok=True)
    # sanitize filename
    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    path = f"output/{task_id}/ref_{safe_name}"
    async with aiofiles.open(path, "wb") as f:
        await f.write(await file.read())
    task = store.update(task_id, uploaded_ref_image=path)
    return {"task_id": task_id, "ref_image_path": path}


@router.post("/tasks/{task_id}/regenerate-ref-image")
async def regenerate_ref_image(task_id: str):
    """重新生成参考图（清除旧的，重新调用 Seedream）。"""
    task = store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    # 清除旧参考图，重新生成
    store.update(task_id, ref_image_url=None, uploaded_ref_image=None)
    from .pipeline.stage2_image import generate_ref_image as _gen_ref
    import asyncio as _asyncio

    async def _regen():
        try:
            task_dict = store.get(task_id).model_dump()
            ref = await _gen_ref(task_dict)
            store.update(task_id, ref_image_url=ref)
        except Exception as e:
            store.update(task_id, ref_image_url=f"__AI_GEN_ERROR__:{str(e)[:200]}")

    _asyncio.create_task(_regen())
    return {"task_id": task_id, "message": "Reference image regeneration started"}


@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    task = store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    return task.model_dump()


@router.post("/tasks/{task_id}/creative")
async def select_creative(task_id: str, creative_data: dict):
    task = store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    if task.stage != TaskStage.CREATIVE_WAIT:
        raise HTTPException(status_code=409, detail=f"Task is in stage '{task.stage.value}', expected 'creative_wait'")
    store.update(task_id, creative_direction=creative_data, stage=TaskStage.STYLE_WAIT)
    # 继续到风格选择阶段，不自动推进（等待风格选择）
    return {"task_id": task_id, "stage": TaskStage.STYLE_WAIT.value}


@router.post("/tasks/{task_id}/confirm-recommend")
async def confirm_recommend(task_id: str, data: dict):
    """用户确认 AI 推荐（或手动调整后），触发脚本生成。"""
    task = store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    if task.stage != TaskStage.RECOMMEND_WAIT:
        raise HTTPException(status_code=409, detail=f"Task is in stage '{task.stage.value}', expected 'recommend_wait'")
    creative = data.get("creative", {})
    style = data.get("style", {})
    if not creative or not style:
        raise HTTPException(status_code=422, detail="Missing 'creative' or 'style' field")
    from .models import StyleChoice
    try:
        selected = StyleChoice(**{k: style.get(k, "") for k in ["visual_style", "camera", "lighting", "angle", "human"]})
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid style data")
    store.update(task_id, creative_direction=creative, selected_style=selected, stage=TaskStage.SCRIPT_GEN)
    from .pipeline.runner import continue_pipeline
    import asyncio as _asyncio
    _asyncio.create_task(continue_pipeline(task_id, store))
    return {"task_id": task_id, "stage": TaskStage.SCRIPT_GEN.value}


@router.post("/tasks/{task_id}/style")
async def select_style(task_id: str, style_data: dict):
    task = store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    if task.stage != TaskStage.STYLE_WAIT:
        raise HTTPException(status_code=409, detail=f"Task is in stage '{task.stage.value}', expected 'style_wait'")
    from .pipeline.runner import continue_pipeline
    from .models import StyleChoice
    try:
        style = StyleChoice(**style_data)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid style data: requires visual_style, camera, lighting, angle, human")
    store.update(task_id, selected_style=style, stage=TaskStage.SCRIPT_GEN)
    import asyncio as _asyncio
    _asyncio.create_task(continue_pipeline(task_id, store))
    return {"task_id": task_id, "stage": TaskStage.SCRIPT_GEN.value}


@router.get("/tasks")
async def list_tasks():
    """列出最近的任务（用于历史记录页）"""
    tasks = store.list_all()
    tasks.sort(key=lambda t: t.task_id, reverse=True)
    return [{"task_id": t.task_id, "stage": t.stage.value, "product_info": t.product_info} for t in tasks[:50]]


@router.post("/tasks/{task_id}/rollback")
async def rollback_task(task_id: str, data: dict):
    """回退到之前的阶段，清除下游数据。"""
    task = store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")

    target_stage = data.get("stage")
    if not target_stage:
        raise HTTPException(status_code=422, detail="Missing 'stage' field")

    # 验证 target_stage 是有效的阶段
    try:
        target = TaskStage(target_stage)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid stage: {target_stage}")

    # 阶段顺序索引（越大越靠后）
    STAGE_ORDER = [
        TaskStage.PENDING,
        TaskStage.FETCHING,
        TaskStage.REF_IMAGE,
        TaskStage.CREATIVE_WAIT,
        TaskStage.STYLE_WAIT,
        TaskStage.RECOMMEND_WAIT,
        TaskStage.SCRIPT_GEN,
        TaskStage.PREVIEW_WAIT,
        TaskStage.VIDEO_GEN,
        TaskStage.DONE,
        TaskStage.FAILED,
    ]
    stage_idx = {s: i for i, s in enumerate(STAGE_ORDER)}

    current_idx = stage_idx.get(task.stage, 0)
    target_idx = stage_idx.get(target, 0)

    if target_idx >= current_idx:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot rollback from '{task.stage.value}' to '{target.value}' — target must be before current stage",
        )

    # 清除下游数据
    clear_map: dict[int, list[str]] = {
        stage_idx[TaskStage.FETCHING]:     ["product_info", "ref_image_url", "recommendation", "creative_directions", "creative_direction", "style_options", "selected_style", "scripts", "preview_images", "video_urls"],
        stage_idx[TaskStage.REF_IMAGE]:    ["recommendation", "creative_directions", "creative_direction", "style_options", "selected_style", "scripts", "preview_images", "video_urls"],
        stage_idx[TaskStage.CREATIVE_WAIT]: ["recommendation", "creative_direction", "style_options", "selected_style", "scripts", "preview_images", "video_urls"],
        stage_idx[TaskStage.STYLE_WAIT]:   ["recommendation", "selected_style", "scripts", "preview_images", "video_urls"],
        stage_idx[TaskStage.RECOMMEND_WAIT]: ["recommendation", "creative_direction", "selected_style", "scripts", "preview_images", "video_urls"],
        stage_idx[TaskStage.SCRIPT_GEN]:   ["scripts", "preview_images", "video_urls"],
        # 回退到 preview_wait 时保留 preview_images（它们是这个阶段的展示数据）
        stage_idx[TaskStage.PREVIEW_WAIT]: ["video_urls"],
        stage_idx[TaskStage.VIDEO_GEN]:    ["video_urls"],
    }

    update_kwargs = {"stage": target}
    for idx in range(target_idx, len(STAGE_ORDER)):
        for field in clear_map.get(idx, []):
            update_kwargs[field] = None

    store.update(task_id, **update_kwargs)

    # 对于自动生成阶段，重新触发管线
    if target in (TaskStage.FETCHING, TaskStage.REF_IMAGE):
        from .pipeline.runner import run_pipeline
        import asyncio as _asyncio
        _asyncio.create_task(run_pipeline(task_id, store))
    elif target == TaskStage.RECOMMEND_WAIT:
        from .pipeline.stage25_recommend import generate_recommendation
        import asyncio as _asyncio
        async def _regen_rec():
            try:
                t = store.get(task_id)
                if t:
                    rec = await generate_recommendation(t.product_info, [p.value for p in t.platforms])
                    store.update(task_id, recommendation=rec)
            except Exception as e:
                store.update(task_id, error=f"Recommendation regen failed: {str(e)[:200]}")
        _asyncio.create_task(_regen_rec())
    elif target == TaskStage.SCRIPT_GEN:
        from .pipeline.runner import continue_pipeline
        import asyncio as _asyncio
        _asyncio.create_task(continue_pipeline(task_id, store))
    elif target == TaskStage.PREVIEW_WAIT:
        # 重新生成预览图，确保回退后仍有预览图可展示
        from .pipeline.stage5_preview import generate_preview_images
        import asyncio as _asyncio
        async def _regen_preview():
            try:
                t = store.get(task_id)
                if t and t.scripts:
                    previews = {}
                    for plat in t.scripts:
                        previews[plat] = await generate_preview_images(t.model_dump(), plat)
                    store.update(task_id, preview_images=previews)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"[{task_id}] Preview regen on rollback failed: {e}")
        _asyncio.create_task(_regen_preview())
    elif target == TaskStage.VIDEO_GEN:
        from .pipeline.runner import run_stage5_and_6
        import asyncio as _asyncio
        _asyncio.create_task(run_stage5_and_6(task_id, store))

    return {"task_id": task_id, "stage": target.value}


@router.post("/tasks/{task_id}/regenerate-previews")
async def regenerate_previews(task_id: str):
    """手动重新生成预览图（不改变阶段，用于自愈）。"""
    task = store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    if not task.scripts:
        raise HTTPException(status_code=409, detail="Task has no scripts; generate scripts first")
    from .pipeline.stage5_preview import generate_preview_images
    import asyncio as _asyncio

    async def _regen():
        try:
            t = store.get(task_id)
            if t and t.scripts:
                previews = {}
                for plat in t.scripts:
                    previews[plat] = await generate_preview_images(t.model_dump(), plat)
                store.update(task_id, preview_images=previews)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"[{task_id}] Manual preview regen failed: {e}")
    _asyncio.create_task(_regen())
    return {"task_id": task_id, "message": "Preview regeneration started"}


@router.post("/tasks/{task_id}/storyboard")
async def confirm_storyboard(task_id: str, data: dict):
    task = store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    if task.stage != TaskStage.PREVIEW_WAIT:
        raise HTTPException(status_code=409, detail=f"Task is in stage '{task.stage.value}', expected 'preview_wait'")
    store.update(task_id, stage=TaskStage.VIDEO_GEN)
    from .pipeline.runner import run_stage5_and_6
    import asyncio as _asyncio
    _asyncio.create_task(run_stage5_and_6(task_id, store))
    return {"task_id": task_id, "stage": TaskStage.VIDEO_GEN.value}

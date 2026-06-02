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
    platform_list = [Platform(p.strip()) for p in platforms.split(",")]
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


@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    task = store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    return task.model_dump()


@router.post("/tasks/{task_id}/style")
async def select_style(task_id: str, style_data: dict):
    task = store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    from .pipeline.runner import continue_pipeline
    from .models import StyleChoice
    style = StyleChoice(**{k: v for k, v in style_data.items() if k in StyleChoice.model_fields})
    store.update(task_id, selected_style=style, stage=TaskStage.SCRIPT_GEN)
    _asyncio = __import__('asyncio')
    _asyncio.create_task(continue_pipeline(task_id, store))
    return {"task_id": task_id, "stage": TaskStage.SCRIPT_GEN.value}

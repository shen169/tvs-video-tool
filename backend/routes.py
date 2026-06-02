from fastapi import APIRouter, UploadFile, File, Form
from .models import TaskState, TaskStage, Platform
from .task_manager import InMemoryTaskStore

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
    return {"task_id": task.task_id, "stage": task.stage.value}


@router.post("/tasks/{task_id}/ref-image")
async def upload_ref_image(task_id: str, file: UploadFile = File(...)):
    task = store.get(task_id)
    if not task:
        return {"error": "task not found"}, 404
    import aiofiles, os
    os.makedirs(f"output/{task_id}", exist_ok=True)
    path = f"output/{task_id}/ref_{file.filename}"
    async with aiofiles.open(path, "wb") as f:
        await f.write(await file.read())
    task = store.update(task_id, uploaded_ref_image=path)
    return {"task_id": task_id, "ref_image_path": path}


@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    task = store.get(task_id)
    if not task:
        return {"error": "task not found"}, 404
    return task.model_dump()

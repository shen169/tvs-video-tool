import json
import os
import uuid
from abc import ABC, abstractmethod
from .models import TaskState, TaskStage


class TaskStore(ABC):
    @abstractmethod
    def create(self, task: TaskState) -> TaskState: ...
    @abstractmethod
    def get(self, task_id: str) -> TaskState | None: ...
    @abstractmethod
    def update(self, task_id: str, **kwargs) -> TaskState: ...
    @abstractmethod
    def list_all(self) -> list[TaskState]: ...


class InMemoryTaskStore(TaskStore):
    def __init__(self):
        self._tasks: dict[str, TaskState] = {}

    def create(self, task: TaskState) -> TaskState:
        task.task_id = str(uuid.uuid4())[:8]
        self._tasks[task.task_id] = task
        return task

    def get(self, task_id: str) -> TaskState | None:
        return self._tasks.get(task_id)

    def update(self, task_id: str, **kwargs) -> TaskState:
        task = self._tasks[task_id]
        for k, v in kwargs.items():
            setattr(task, k, v)
        return task

    def list_all(self) -> list[TaskState]:
        return list(self._tasks.values())


class FileTaskStore(InMemoryTaskStore):
    """持久化版 TaskStore — 内存 + JSON 文件，重启不丢任务。"""

    def __init__(self, storage_dir: str = "output/tasks"):
        super().__init__()
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        self._load_all()

    def _task_path(self, task_id: str) -> str:
        return os.path.join(self.storage_dir, f"{task_id}.json")

    def _save(self, task_id: str):
        task = self._tasks.get(task_id)
        if task:
            with open(self._task_path(task_id), "w") as f:
                json.dump(task.model_dump(), f, indent=2, ensure_ascii=False, default=str)

    def _load_all(self):
        for filename in os.listdir(self.storage_dir):
            if filename.endswith(".json"):
                try:
                    with open(os.path.join(self.storage_dir, filename)) as f:
                        data = json.load(f)
                    from .models import TaskState
                    task = TaskState(**data)
                    self._tasks[task.task_id] = task
                except Exception:
                    pass  # 损坏文件跳过

    def create(self, task):
        result = super().create(task)
        self._save(result.task_id)
        return result

    def update(self, task_id: str, **kwargs):
        result = super().update(task_id, **kwargs)
        self._save(task_id)
        return result

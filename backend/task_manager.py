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

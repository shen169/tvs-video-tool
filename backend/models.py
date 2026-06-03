from enum import Enum
from typing import Optional
from pydantic import BaseModel


class TaskStage(str, Enum):
    PENDING = "pending"
    FETCHING = "fetching"
    REF_IMAGE = "ref_image"
    CREATIVE_WAIT = "creative_wait"
    STYLE_WAIT = "style_wait"
    SCRIPT_GEN = "script_gen"
    PREVIEW_WAIT = "preview_wait"
    VIDEO_GEN = "video_gen"
    DONE = "done"
    FAILED = "failed"


class Platform(str, Enum):
    TIKTOK = "tiktok"
    AMAZON = "amazon"
    YOUTUBE = "youtube"
    INSTAGRAM = "instagram"


class StyleChoice(BaseModel):
    visual_style: str
    camera: str
    lighting: str
    angle: str
    human: str


class ShotItem(BaseModel):
    number: int
    duration: float
    shot_type: str
    angle: str
    lighting: str
    camera_move: str
    purpose: str
    transition: str
    scene: str
    voiceover: str
    subtitle: str
    continuity_anchor: Optional[str] = None


class TaskState(BaseModel):
    task_id: str
    product_url: str
    platforms: list[Platform]
    stage: TaskStage = TaskStage.PENDING
    product_info: Optional[dict] = None
    ref_image_url: Optional[str] = None
    uploaded_ref_image: Optional[str] = None
    style_options: Optional[list[dict]] = None
    creative_directions: Optional[list[dict]] = None
    creative_direction: Optional[dict] = None
    selected_style: Optional[StyleChoice] = None
    scripts: Optional[dict[str, list[ShotItem]]] = None
    preview_images: Optional[dict[str, list[str]]] = None
    video_urls: Optional[dict[str, str]] = None
    error: Optional[str] = None

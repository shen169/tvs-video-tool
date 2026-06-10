from enum import Enum
from typing import Optional
from pydantic import BaseModel


class TaskStage(str, Enum):
    PENDING = "pending"
    FETCHING = "fetching"
    REF_IMAGE = "ref_image"
    CREATIVE_WAIT = "creative_wait"       # deprecated — replaced by RECOMMEND_WAIT
    STYLE_WAIT = "style_wait"             # deprecated — replaced by RECOMMEND_WAIT
    RECOMMEND_WAIT = "recommend_wait"     # AI 智能推荐（8 维度一键确认）
    SCRIPT_GEN = "script_gen"
    SCRIPT_REVIEW = "script_review"       # 脚本审核编辑（用户可修改每镜文案）
    PREVIEW_WAIT = "preview_wait"         # deprecated — replaced by SCRIPT_REVIEW
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
    music: Optional[str] = None


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
    recommendation: Optional[dict] = None           # AI 8维度推荐
    style_options: Optional[list[dict]] = None       # deprecated
    creative_directions: Optional[list[dict]] = None # deprecated
    creative_direction: Optional[dict] = None
    selected_style: Optional[StyleChoice] = None
    scripts: Optional[dict[str, list[ShotItem]]] = None
    preview_images: Optional[dict[str, list[str]]] = None
    video_urls: Optional[dict[str, str]] = None
    error: Optional[str] = None
    user_id: Optional[str] = None
    credits_consumed: int = 0

# ═══════════════════════════════════════════════════════════════════════
# 支付系统模型
# ═══════════════════════════════════════════════════════════════════════

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class User(BaseModel):
    id: str
    email: str
    password_hash: str
    role: UserRole = UserRole.USER
    credits: int = 0
    created_at: str = ""


class CreditTransaction(BaseModel):
    id: str
    user_id: str
    amount: int              # 正=充值, 负=消耗
    type: str                # "topup" | "consume" | "refund"
    stripe_session_id: Optional[str] = None
    task_id: Optional[str] = None
    created_at: str = ""


class PricingPlan(BaseModel):
    id: str                  # "plan_9" | "plan_30" | "plan_90"
    name: str
    credits: int
    price_cents: int
    quality: str = "1080p"
    is_active: bool = True

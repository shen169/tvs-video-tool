# 支付系统 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 TVS Video Tool 添加基于点数包的支付系统——邮箱注册/登录、Stripe 充值、预览确认后扣点生成视频。

**架构：** 后端 FastAPI 全权处理用户、认证、点数、扣费（单一数据源）。JSON 文件持久化（与现有 FileTaskStore 模式一致）。JWT 认证中间件保护管线 API。Stripe Checkout payment 模式充值，webhook 验签充值。

**技术栈：** Python: bcrypt + python-jose + stripe SDK · Next.js: 自定义组件 · 存储: JSON 文件 + threading.Lock

**规格：** `docs/superpowers/specs/2026-06-11-payment-design.md`

---

## 文件清单

### 后端新增
| 文件 | 职责 |
|------|------|
| `backend/config.py` | 点数套餐定义 + 常量 |
| `backend/user_store.py` | User CRUD + 点数增减（JSON 文件 + Lock） |
| `backend/credit_store.py` | CreditTransaction 记录（JSON 文件） |
| `backend/auth.py` | JWT 签发/验证 + Depends 中间件 |
| `backend/stripe_routes.py` | Stripe Checkout 端点 |
| `backend/stripe_webhook.py` | Stripe Webhook 验签处理 |

### 后端修改
| 文件 | 改动 |
|------|------|
| `backend/models.py` | 新增 User, CreditTransaction, PricingPlan；TaskState 加 `user_id`, `credits_consumed` |
| `backend/routes.py` | Task 端点加认证 + `POST confirm-scripts` 加扣点逻辑 |
| `backend/main.py` | 注册 auth/stripe 路由，初始化 UserStore/CreditStore |
| `backend/requirements.txt` | 加 `python-jose[cryptography]`, `bcrypt`, `stripe` |

### 前端新增
| 文件 | 职责 |
|------|------|
| `frontend/app/credits/page.tsx` | 充值页 — 套餐卡片 + 点数流水 |
| `frontend/components/CreditBadge.tsx` | 顶栏余额角标 |
| `frontend/components/InsufficientModal.tsx` | 余额不足弹窗 — 引导充值 |

### 前端修改
| 文件 | 改动 |
|------|------|
| `frontend/lib/api.ts` | 新增 auth / credits / stripe API 函数；402 错误处理 |
| `frontend/middleware.ts` | 兼容 `tvs_token` JWT cookie |
| `frontend/app/login/page.tsx` | Tab 切换：简单密码 / 邮箱登录+注册 |
| `frontend/components/Sidebar.tsx` | 加 `💰 充值` 导航入口 + 余额显示 |
| `frontend/app/task/[id]/page.tsx` | `script_review` → 确认时弹扣点确认 / 402 弹充值引导 |
| `frontend/app/page.tsx` | 加 auth check（未登录提示） |

---

### 任务 1：安装依赖 + 数据模型

**文件：**
- 修改：`backend/requirements.txt`
- 修改：`backend/models.py`

- [ ] **步骤 1：安装依赖**

```bash
cd /Users/jojo/Desktop/📁\ 开发项目/tvs-video-tool
source backend/venv/bin/activate
pip install python-jose[cryptography] bcrypt stripe
```

编辑 `backend/requirements.txt`，追加：

```
python-jose[cryptography]==3.3.0
bcrypt==4.2.1
stripe==11.6.0
```

- [ ] **步骤 2：在 models.py 新增数据模型**

在 `backend/models.py` 末尾追加：

```python
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
```

- [ ] **步骤 3：在 TaskState 加 user_id 和 credits_consumed 字段**

在 `TaskState` 类末尾（`error` 字段之后）添加：

```python
user_id: Optional[str] = None
credits_consumed: int = 0
```

- [ ] **步骤 4：Commit**

```bash
git add backend/requirements.txt backend/models.py
git commit -m "feat: 支付系统数据模型 — User, CreditTransaction, PricingPlan"
```

---

### 任务 2：配置 + 常量

**文件：**
- 创建：`backend/config.py`

- [ ] **步骤 1：创建 config.py**

```python
"""点数套餐配置 + 系统常量."""

PRICING_PLANS = [
    {
        "id": "plan_9",
        "name": "入门 · 9 点",
        "credits": 9,
        "videos": 3,
        "price_cents": 6900,   # ¥69
        "quality": "1080p",
    },
    {
        "id": "plan_30",
        "name": "标准 · 30 点",
        "credits": 30,
        "videos": 10,
        "price_cents": 19900,  # ¥199
        "quality": "1080p",
    },
    {
        "id": "plan_90",
        "name": "专业 · 90 点",
        "credits": 90,
        "videos": 30,
        "price_cents": 49900,  # ¥499
        "quality": "720p",
    },
]

# 每平台视频扣点数
CREDITS_PER_PLATFORM = 3

# Stripe 货币
STRIPE_CURRENCY = "cny"

# JWT 过期时间（天）
JWT_EXPIRE_DAYS = 30
```

- [ ] **步骤 2：Commit**

```bash
git add backend/config.py
git commit -m "feat: 点数套餐配置 + 系统常量"
```

---

### 任务 3：用户存储层

**文件：**
- 创建：`backend/user_store.py`

- [ ] **步骤 1：创建 UserStore**

```python
"""用户 + 点数存储（JSON 文件持久化 + 线程安全）."""

import json
import os
import uuid
import threading
import bcrypt
from datetime import datetime, timezone
from .models import User


class UserStore:
    def __init__(self, storage_dir: str = "output/users"):
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        self._users: dict[str, User] = {}
        self._email_index: dict[str, str] = {}  # email → user_id
        self._lock = threading.Lock()
        self._load_all()

    def _path(self, user_id: str) -> str:
        return os.path.join(self.storage_dir, f"{user_id}.json")

    def _save(self, user_id: str):
        user = self._users.get(user_id)
        if user:
            tmp = self._path(user_id) + ".tmp"
            with open(tmp, "w") as f:
                json.dump(user.model_dump(), f, indent=2, ensure_ascii=False)
            os.replace(tmp, self._path(user_id))

    def _load_all(self):
        for fn in os.listdir(self.storage_dir):
            if fn.endswith(".json"):
                try:
                    with open(os.path.join(self.storage_dir, fn)) as f:
                        data = json.load(f)
                    user = User(**data)
                    self._users[user.id] = user
                    self._email_index[user.email.lower()] = user.id
                except Exception:
                    pass

    def get(self, user_id: str) -> User | None:
        return self._users.get(user_id)

    def get_by_email(self, email: str) -> User | None:
        uid = self._email_index.get(email.lower())
        return self._users.get(uid) if uid else None

    def create(self, email: str, password: str) -> User:
        with self._lock:
            if self.get_by_email(email):
                raise ValueError("Email already registered")
            now = datetime.now(timezone.utc).isoformat()
            user = User(
                id=str(uuid.uuid4()),
                email=email.lower(),
                password_hash=bcrypt.hashpw(
                    password.encode(), bcrypt.gensalt()
                ).decode(),
                credits=0,
                created_at=now,
            )
            self._users[user.id] = user
            self._email_index[user.email] = user.id
            self._save(user.id)
            return user

    def verify_password(self, email: str, password: str) -> User | None:
        user = self.get_by_email(email)
        if not user:
            return None
        if bcrypt.checkpw(password.encode(), user.password_hash.encode()):
            return user
        return None

    def add_credits(self, user_id: str, amount: int) -> User:
        with self._lock:
            user = self._users[user_id]
            user.credits += amount
            self._save(user_id)
            return user

    def deduct(self, user_id: str, amount: int) -> User:
        """扣点。点数不足抛出 ValueError。"""
        with self._lock:
            user = self._users[user_id]
            if user.credits < amount:
                raise ValueError(f"Insufficient credits: {user.credits} < {amount}")
            user.credits -= amount
            self._save(user_id)
            return user
```

- [ ] **步骤 2：Commit**

```bash
git add backend/user_store.py
git commit -m "feat: UserStore — 用户注册/登录/点数增减（JSON持久化+线程安全）"
```

---

### 任务 4：点数流水存储层

**文件：**
- 创建：`backend/credit_store.py`

- [ ] **步骤 1：创建 CreditStore**

```python
"""点数流水存储（JSON 文件持久化）."""

import json
import os
import uuid
from datetime import datetime, timezone
from .models import CreditTransaction


class CreditStore:
    def __init__(self, storage_dir: str = "output/credits"):
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        self._transactions: dict[str, CreditTransaction] = {}
        self._by_user: dict[str, list[str]] = {}
        self._seen_stripe: set[str] = set()  # stripe_session_id 去重
        self._load_all()

    def _path(self, tx_id: str) -> str:
        return os.path.join(self.storage_dir, f"{tx_id}.json")

    def _save(self, tx_id: str):
        tx = self._transactions.get(tx_id)
        if tx:
            tmp = self._path(tx_id) + ".tmp"
            with open(tmp, "w") as f:
                json.dump(tx.model_dump(), f, indent=2, ensure_ascii=False)
            os.replace(tmp, self._path(tx_id))

    def _load_all(self):
        for fn in os.listdir(self.storage_dir):
            if fn.endswith(".json"):
                try:
                    with open(os.path.join(self.storage_dir, fn)) as f:
                        data = json.load(f)
                    tx = CreditTransaction(**data)
                    self._transactions[tx.id] = tx
                    self._by_user.setdefault(tx.user_id, []).append(tx.id)
                    if tx.stripe_session_id:
                        self._seen_stripe.add(tx.stripe_session_id)
                except Exception:
                    pass

    def add(self, user_id: str, amount: int, type_: str,
            stripe_session_id: str | None = None,
            task_id: str | None = None) -> CreditTransaction:
        now = datetime.now(timezone.utc).isoformat()
        tx = CreditTransaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=amount,
            type=type_,
            stripe_session_id=stripe_session_id,
            task_id=task_id,
            created_at=now,
        )
        self._transactions[tx.id] = tx
        self._by_user.setdefault(user_id, []).append(tx.id)
        if stripe_session_id:
            self._seen_stripe.add(stripe_session_id)
        self._save(tx.id)
        return tx

    def is_stripe_duplicate(self, session_id: str) -> bool:
        return session_id in self._seen_stripe

    def get_by_user(self, user_id: str, limit: int = 50) -> list[CreditTransaction]:
        tx_ids = self._by_user.get(user_id, [])
        txs = [self._transactions[tid] for tid in reversed(tx_ids) if tid in self._transactions]
        return txs[:limit]
```

- [ ] **步骤 2：Commit**

```bash
git add backend/credit_store.py
git commit -m "feat: CreditStore — 点数流水记录（stripe_session_id 去重）"
```

---

### 任务 5：JWT 认证模块

**文件：**
- 创建：`backend/auth.py`

- [ ] **步骤 1：创建 auth.py**

```python
"""JWT 认证 — 签发/验证/中间件."""

import os
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from .user_store import UserStore
from .models import User
from .config import JWT_EXPIRE_DAYS

JWT_SECRET = os.getenv("JWT_SECRET", "tvs-jwt-secret-change-me")
ALGORITHM = "HS256"

# 由 main.py 初始化时注入
_user_store: UserStore | None = None


def init_auth(store: UserStore):
    global _user_store
    _user_store = store


def create_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user.id,
        "email": user.email,
        "iat": now,
        "exp": now + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


async def get_current_user(authorization: str = Header(...)) -> User:
    """FastAPI Depends — 从 Authorization header 提取 JWT，返回 User。"""
    if not _user_store:
        raise HTTPException(500, detail="Auth not initialized")

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(401, detail="Invalid authorization header")

    try:
        payload = jwt.decode(parts[1], JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(401, detail="Invalid or expired token")

    user = _user_store.get(payload["sub"])
    if not user:
        raise HTTPException(401, detail="User not found")
    return user
```

- [ ] **步骤 2：Commit**

```bash
git add backend/auth.py
git commit -m "feat: JWT 认证中间件 — create_token + get_current_user"
```

---

### 任务 6：Stripe 模块（Checkout + Webhook）

**文件：**
- 创建：`backend/stripe_routes.py`
- 创建：`backend/stripe_webhook.py`

- [ ] **步骤 1：创建 stripe_routes.py**

```python
"""Stripe Checkout 端点."""

import os
import stripe
from fastapi import APIRouter, Depends, HTTPException
from .auth import get_current_user
from .models import User
from .config import PRICING_PLANS, STRIPE_CURRENCY

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
router = APIRouter(prefix="/api/credits")


@router.get("/prices")
async def get_prices(user: User = Depends(get_current_user)):
    """返回可用套餐列表。"""
    return {
        "plans": PRICING_PLANS,
        "currency": STRIPE_CURRENCY,
        "balance": user.credits,
    }


@router.post("/checkout")
async def create_checkout(data: dict, user: User = Depends(get_current_user)):
    """创建 Stripe Checkout Session，返回支付 URL。"""
    plan_id = data.get("plan_id", "")
    plan = next((p for p in PRICING_PLANS if p["id"] == plan_id), None)
    if not plan:
        raise HTTPException(400, detail=f"Unknown plan: {plan_id}")

    success_url = data.get("success_url", f"{os.getenv('BASE_URL', 'http://localhost:3000')}/credits?success=true")
    cancel_url = data.get("cancel_url", f"{os.getenv('BASE_URL', 'http://localhost:3000')}/credits?canceled=true")

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": STRIPE_CURRENCY,
                    "product_data": {
                        "name": plan["name"],
                        "description": f"生成 {plan['videos']} 个视频 · {plan['credits']} 点 · {plan['quality']}",
                    },
                    "unit_amount": plan["price_cents"],
                },
                "quantity": 1,
            }],
            metadata={
                "user_id": user.id,
                "credits": str(plan["credits"]),
                "plan_id": plan["id"],
            },
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return {"url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(500, detail=f"Stripe error: {e.user_message or str(e)}")
```

**创建 stripe_webhook.py：**

```python
"""Stripe Webhook — 验签 + 充值."""

import os
import stripe
from fastapi import APIRouter, Request, HTTPException
from .user_store import UserStore
from .credit_store import CreditStore
import logging

logger = logging.getLogger(__name__)

_user_store: UserStore | None = None
_credit_store: CreditStore | None = None
router = APIRouter(prefix="/api/stripe")


def init_webhook(user_store: UserStore, credit_store: CreditStore):
    global _user_store, _credit_store
    _user_store = user_store
    _credit_store = credit_store


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """处理 Stripe 回调事件。"""
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if webhook_secret:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            raise HTTPException(400, detail=f"Webhook validation failed: {e}")
    else:
        # 本地测试：跳过验签
        import json
        event = json.loads(payload)

    if event["type"] != "checkout.session.completed":
        return {"status": "ignored", "type": event["type"]}

    session = event["data"]["object"]
    session_id = session.get("id", "")
    metadata = session.get("metadata", {})
    user_id = metadata.get("user_id", "")
    credits_str = metadata.get("credits", "0")

    if not user_id or not credits_str:
        logger.error(f"Webhook missing metadata: {session_id}")
        return {"status": "error", "detail": "missing metadata"}

    credits = int(credits_str)

    if _credit_store.is_stripe_duplicate(session_id):
        logger.info(f"Duplicate webhook ignored: {session_id}")
        return {"status": "duplicate", "session_id": session_id}

    user = _user_store.get(user_id)
    if not user:
        logger.error(f"Webhook user not found: {user_id}")
        return {"status": "error", "detail": "user not found"}

    _user_store.add_credits(user_id, credits)
    _credit_store.add(
        user_id=user_id,
        amount=credits,
        type_="topup",
        stripe_session_id=session_id,
    )

    logger.info(f"Webhook: user={user.email} +{credits} credits (session={session_id})")
    return {"status": "ok", "credits_added": credits}
```

- [ ] **步骤 2：Commit**

```bash
git add backend/stripe_routes.py backend/stripe_webhook.py
git commit -m "feat: Stripe Checkout + Webhook — 创建支付会话 / 验签充值"
```

---

### 任务 7：改造现有路由 — 加认证 + 扣点

**文件：**
- 修改：`backend/routes.py`

- [ ] **步骤 1：改造 create_task — 加认证 + 绑定 user_id**

在 `backend/routes.py` 顶部导入区添加：

```python
from .auth import get_current_user
from .models import User
from .config import CREDITS_PER_PLATFORM
```

修改 `create_task` 函数签名和内部：

```python
@router.post("/tasks")
async def create_task(
    url: str = Form(...),
    platforms: str = Form("tiktok"),
    user: User = Depends(get_current_user),
):
    platform_list = [Platform(p.strip()) for p in platforms.split(",") if p.strip()]
    task = TaskState(
        task_id="", product_url=url, platforms=platform_list,
        stage=TaskStage.PENDING, user_id=user.id,
    )
    task = store.create(task)
    import asyncio as _asyncio
    from .pipeline.runner import run_pipeline
    _asyncio.create_task(run_pipeline(task.task_id, store))
    return {"task_id": task.task_id, "stage": task.stage.value}
```

- [ ] **步骤 2：改造 get_task — 加认证 + 权限检查**

```python
@router.get("/tasks/{task_id}")
async def get_task(task_id: str, user: User = Depends(get_current_user)):
    task = store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    if task.user_id and task.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return task.model_dump()
```

- [ ] **步骤 3：改造 list_tasks — 只返回当前用户的**

```python
@router.get("/tasks")
async def list_tasks(user: User = Depends(get_current_user)):
    tasks = store.list_all()
    # 只返回当前用户的任务
    tasks = [t for t in tasks if t.user_id == user.id]
    tasks.sort(key=lambda t: t.task_id, reverse=True)
    return [{"task_id": t.task_id, "stage": t.stage.value, "product_info": t.product_info} for t in tasks[:50]]
```

- [ ] **步骤 4：改造 confirm-scripts — 加扣点逻辑**

在 `confirm_scripts` 函数开头加入认证和扣点逻辑：

```python
@router.post("/tasks/{task_id}/confirm-scripts")
async def confirm_scripts(task_id: str, user: User = Depends(get_current_user)):
    task = store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="task not found")
    if task.user_id and task.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if task.stage != TaskStage.SCRIPT_REVIEW:
        raise HTTPException(status_code=409,
            detail=f"Task is in stage '{task.stage.value}', expected 'script_review'")

    # ── 扣点逻辑 ──
    from .user_store import UserStore
    from .credit_store import CreditStore
    cost = len(task.platforms) * CREDITS_PER_PLATFORM

    # 获取 user_store / credit_store（由 main.py 注入到模块全局）
    if _user_store is None or _credit_store is None:
        raise HTTPException(500, detail="Payment system not initialized")

    if task.credits_consumed == 0:
        try:
            _user_store.deduct(user.id, cost)
        except ValueError:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "insufficient_credits",
                    "required": cost,
                    "current": user.credits,
                },
            )
        _credit_store.add(
            user_id=user.id, amount=-cost, type_="consume", task_id=task_id,
        )
        # 刷新 user 状态（deduct 已写持久化文件，这里从 store 重新读）
        user = _user_store.get(user.id)
        store.update(task_id, credits_consumed=cost)
    else:
        # 回退后重新确认，不重复扣点
        pass

    store.update(task_id, stage=TaskStage.VIDEO_GEN)
    from .pipeline.runner import run_stage5_and_6
    import asyncio as _asyncio
    _asyncio.create_task(run_stage5_and_6(task_id, store))

    return {
        "task_id": task_id,
        "stage": TaskStage.VIDEO_GEN.value,
        "credits_consumed": cost,
        "credits_remaining": user.credits,
    }
```

在 `routes.py` 顶部（`store: InMemoryTaskStore = None` 之后）添加：

```python
_user_store = None
_credit_store = None


def init_payment_stores(us, cs):
    global _user_store, _credit_store
    _user_store = us
    _credit_store = cs
```

- [ ] **步骤 5：对其他交互端点加认证（ref-image, confirm-recommend, scripts update, rollback 等）**

> 对这些端点添加 `user: User = Depends(get_current_user)` + 所有权检查（`task.user_id != user.id → 403`），格式同 Step 2。此处省略重复代码。

- [ ] **步骤 6：Commit**

```bash
git add backend/routes.py
git commit -m "feat: 管线 API 加 JWT 认证 + confirm-scripts 扣点逻辑"
```

---

### 任务 8：改造 main.py — 装配所有模块

**文件：**
- 修改：`backend/main.py`

- [ ] **步骤 1：在 main.py 中初始化所有新模块**

替换 `backend/main.py` 为：

```python
import os
from pathlib import Path
from dotenv import load_dotenv

_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)
else:
    _root_env = Path(__file__).parent.parent / ".env"
    if _root_env.exists():
        load_dotenv(_root_env)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .task_manager import FileTaskStore
from .user_store import UserStore
from .credit_store import CreditStore
from .auth import init_auth
from .stripe_webhook import init_webhook

app = FastAPI(title="TVS Video Tool API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

store = FileTaskStore()
user_store = UserStore()
credit_store = CreditStore()

# 注入 auth / webhook / routes
init_auth(user_store)
init_webhook(user_store, credit_store)

from .routes import router, init_routes, init_payment_stores
init_routes(store)
init_payment_stores(user_store, credit_store)
app.include_router(router)

# ── 认证路由 ──
from fastapi import APIRouter as _APIRouter, HTTPException as _HTTPException
from pydantic import BaseModel as _BaseModel
from .auth import create_token, get_current_user

auth_router = _APIRouter(prefix="/api/auth")


class _RegisterBody(_BaseModel):
    email: str
    password: str


class _LoginBody(_BaseModel):
    email: str
    password: str


@auth_router.post("/register")
async def register(body: _RegisterBody):
    try:
        user = user_store.create(body.email, body.password)
    except ValueError as e:
        raise _HTTPException(409, detail=str(e))
    token = create_token(user)
    return {"token": token, "user": {"id": user.id, "email": user.email, "credits": user.credits}}


@auth_router.post("/login")
async def login(body: _LoginBody):
    user = user_store.verify_password(body.email, body.password)
    if not user:
        raise _HTTPException(401, detail="Invalid email or password")
    token = create_token(user)
    return {"token": token, "user": {"id": user.id, "email": user.email, "credits": user.credits}}


@auth_router.get("/me")
async def me(user=Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "credits": user.credits}


app.include_router(auth_router)

# ── Stripe 路由 ──
from .stripe_routes import router as stripe_router
from .stripe_webhook import router as webhook_router
app.include_router(stripe_router)
app.include_router(webhook_router)

# ── 点数流水 ──
credits_router = _APIRouter(prefix="/api/credits")


@credits_router.get("/history")
async def credit_history(user=Depends(get_current_user)):
    txs = credit_store.get_by_user(user.id, limit=50)
    return [tx.model_dump() for tx in txs]


app.include_router(credits_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
```

- [ ] **步骤 2：Commit**

```bash
git add backend/main.py
git commit -m "feat: 装配 auth + stripe + credits 路由到 main.py"
```

---

### 任务 9：前端 API 层

**文件：**
- 修改：`frontend/lib/api.ts`

- [ ] **步骤 1：添加 auth / credits API 函数**

在 `frontend/lib/api.ts` 末尾追加：

```typescript
// ═══════════════════════════════════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════════════════════════════════

const TOKEN_KEY = "tvs_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getStoredToken(): string | null {
  return getToken();
}

export async function register(email: string, password: string) {
  const res = await fetch(`${BASE.replace("/api/backend", "")}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registration failed");
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE.replace("/api/backend", "")}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

export async function getMe() {
  const res = await fetch(`${BASE.replace("/api/backend", "")}/api/auth/me`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "/login";
}

// ═══════════════════════════════════════════════════════════════════════
// Credits
// ═══════════════════════════════════════════════════════════════════════

export async function getPricePlans() {
  const res = await fetch(`${BASE.replace("/api/backend", "")}/api/credits/prices`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to fetch plans");
  return res.json();
}

export async function createCheckout(planId: string) {
  const res = await fetch(`${BASE.replace("/api/backend", "")}/api/credits/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ plan_id: planId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Checkout failed");
  }
  return res.json();
}

export async function getCreditHistory() {
  const res = await fetch(`${BASE.replace("/api/backend", "")}/api/credits/history`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}
```

- [ ] **步骤 2：改造现有 request 函数加 JWT header**

```typescript
async function request(url: string, options?: RequestInit) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e: any) {
    throw new Error(`网络请求失败: ${e.message || '请确认后端服务已启动'}`);
  }

  // 402 点数不足 — 抛特定错误
  if (res.status === 402) {
    const body = await res.json().catch(() => ({}));
    const detail = body.detail || {};
    throw new PaymentRequiredError(
      detail.error || "insufficient_credits",
      detail.required || 0,
      detail.current || 0,
    );
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `HTTP ${res.status}`);
    }
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200) || '后端服务不可用'}`);
  }
  return res.json();
}

export class PaymentRequiredError extends Error {
  constructor(
    message: string,
    public required: number,
    public current: number,
  ) {
    super(message);
    this.name = "PaymentRequiredError";
  }
}
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: 前端 API 层 — auth/credits/stripe 请求 + JWT header + 402 处理"
```

---

### 任务 10：登录页改造 — 邮箱登录

**文件：**
- 修改：`frontend/app/login/page.tsx`

- [ ] **步骤 1：重写 login page 支持双模式**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/api";

type Mode = "password" | "email_login" | "email_register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("password");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 简单密码登录（保留）
  const handlePassword = async () => {
    if (!password) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth", { method: "POST", body: new URLSearchParams({ password }) });
      if (res.redirected) { router.push("/"); return; }
      if (!res.ok) throw new Error("Wrong password");
      router.push("/");
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  // 邮箱登录
  const handleEmailLogin = async () => {
    if (!email || !pwd) return;
    setLoading(true); setError("");
    try {
      await login(email, pwd);
      router.push("/");
    } catch (e: any) { setError(e.message); setLoading(false); }
  };

  // 邮箱注册
  const handleEmailRegister = async () => {
    if (!email || !pwd) return;
    if (pwd.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    try {
      await register(email, pwd);
      router.push("/");
    } catch (e: any) { setError(e.message); setLoading(false); }
  };

  return (
    <div className="flex items-center justify-center h-full bg-[#09090b]">
      <div className="w-full max-w-sm space-y-6 text-center animate-in animate-in-1">
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mx-auto">
          <svg className="w-7 h-7 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">TVS Video Tool</h1>
          <p className="text-sm text-zinc-500 mt-1">AI Commerce Video Generator</p>
        </div>

        {/* Mode Tabs */}
        <div className="flex rounded-xl bg-[#121214] border border-[#27272c] p-1">
          {(["password", "email_login", "email_register"] as Mode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                mode === m ? "bg-amber-500/10 text-amber-400 border border-amber-500/15" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {m === "password" ? "Quick" : m === "email_login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Password mode */}
        {mode === "password" && (
          <div className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-[#121214] border border-[#27272c] text-white placeholder-zinc-600 text-center text-sm focus:outline-none focus:border-amber-500/40 transition-all"
              placeholder="Enter password" autoFocus
              onKeyDown={(e) => e.key === "Enter" && handlePassword()} />
            <button onClick={handlePassword} disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20">
              {loading ? "..." : "Enter"}
            </button>
          </div>
        )}

        {/* Email Login / Register mode */}
        {(mode === "email_login" || mode === "email_register") && (
          <div className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-[#121214] border border-[#27272c] text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500/40 transition-all"
              placeholder="Email" autoFocus />
            <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-[#121214] border border-[#27272c] text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500/40 transition-all"
              placeholder="Password (min 6 chars)"
              onKeyDown={(e) => e.key === "Enter" && (mode === "email_login" ? handleEmailLogin() : handleEmailRegister())} />
            <button onClick={mode === "email_login" ? handleEmailLogin : handleEmailRegister} disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20">
              {loading ? "..." : mode === "email_login" ? "Sign In" : "Create Account"}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15 text-red-400 text-xs">{error}</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/app/login/page.tsx
git commit -m "feat: 登录页 — Quick密码 / 邮箱登录 / 邮箱注册 三模式"
```

---

### 任务 11：Middleware 兼容 JWT cookie

**文件：**
- 修改：`frontend/middleware.ts`

- [ ] **步骤 1：允许 JWT 用户跳过 password 检查**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "tvs2024";

export function middleware(request: NextRequest) {
  const authed = request.cookies.get("tvs_auth")?.value;
  const hasJwt = request.cookies.get("tvs_token")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isApi = request.nextUrl.pathname.startsWith("/api");

  // API routes bypass auth
  if (isApi) return NextResponse.next();

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const base = `${proto}://${host}`;

  // JWT 登录的用户（由前端 localStorage 写入 cookie）
  // 注意：middleware 无法读 localStorage，所以用 cookie 做双重标记
  const jwtAuthed = request.cookies.get("tvs_authed")?.value === "1";

  // 有密码 cookie 或 JWT 标记 → 通过
  if ((authed && authed === ACCESS_PASSWORD) || jwtAuthed) {
    if (isLoginPage) {
      return NextResponse.redirect(new URL("/", base), 303);
    }
    return NextResponse.next();
  }

  // 未认证 → 跳登录
  if (!isLoginPage) {
    return NextResponse.redirect(new URL("/login", base), 303);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/middleware.ts
git commit -m "feat: middleware 兼容 JWT cookie（tvs_authed 标记）"
```

---

### 任务 12：CreditBadge 组件

**文件：**
- 创建：`frontend/components/CreditBadge.tsx`

- [ ] **步骤 1：创建 CreditBadge**

```tsx
"use client";
import { useEffect, useState } from "react";
import { getMe, getStoredToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function CreditBadge() {
  const [credits, setCredits] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    getMe()
      .then((u) => { setCredits(u.credits); setEmail(u.email); })
      .catch(() => {});
  }, []);

  if (credits === null) return null;

  return (
    <button
      onClick={() => router.push("/credits")}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/20 hover:bg-amber-500/10 transition-all duration-200 cursor-pointer"
    >
      <span className="text-[10px] text-zinc-500 truncate max-w-[100px]">{email}</span>
      <span className="w-px h-4 bg-zinc-700/50" />
      <span className="text-xs font-semibold text-amber-400">💰 {credits}</span>
    </button>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/components/CreditBadge.tsx
git commit -m "feat: CreditBadge — 顶栏余额角标"
```

---

### 任务 13：InsufficientModal 组件

**文件：**
- 创建：`frontend/components/InsufficientModal.tsx`

- [ ] **步骤 1：创建 InsufficientModal**

```tsx
"use client";
import { useRouter } from "next/navigation";

interface Props {
  required: number;
  current: number;
  onClose: () => void;
}

export default function InsufficientModal({ required, current, onClose }: Props) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in">
      <div className="w-full max-w-sm mx-4 p-6 rounded-2xl bg-[#121214] border border-[#27272c] shadow-2xl space-y-5">
        <div className="text-center">
          <div className="text-3xl mb-3">💰</div>
          <h3 className="text-lg font-bold text-zinc-100">余额不足</h3>
          <p className="text-sm text-zinc-400 mt-1">
            需要 <span className="text-amber-400 font-semibold">{required} 点</span>，
            当前余额 <span className="text-red-400 font-semibold">{current} 点</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-[#1c1c20] border border-[#27272c] text-zinc-400 text-sm font-medium hover:text-zinc-200 transition-all">
            取消
          </button>
          <button onClick={() => { onClose(); router.push("/credits"); }}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20">
            去充值
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/components/InsufficientModal.tsx
git commit -m "feat: InsufficientModal — 余额不足弹窗引导充值"
```

---

### 任务 14：充值页

**文件：**
- 创建：`frontend/app/credits/page.tsx`

- [ ] **步骤 1：创建 CreditsPage**

```tsx
"use client";
import { useEffect, useState } from "react";
import { getPricePlans, createCheckout, getCreditHistory, getMe, getStoredToken } from "@/lib/api";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  credits: number;
  videos: number;
  price_cents: number;
  quality: string;
}

interface Tx {
  id: string;
  amount: number;
  type: string;
  created_at: string;
  task_id?: string;
}

export default function CreditsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [history, setHistory] = useState<Tx[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { router.push("/login"); return; }
    Promise.all([
      getPricePlans().catch(() => null),
      getCreditHistory().catch(() => []),
      getMe().catch(() => null),
    ]).then(([pData, hData, me]) => {
      if (pData) setPlans(pData.plans || []);
      if (me) setBalance(me.credits);
      setHistory(hData || []);
    }).catch(() => setError("Failed to load"));
  }, []);

  const handleBuy = async (planId: string) => {
    setLoading(planId);
    try {
      const { url } = await createCheckout(planId);
      window.location.href = url;
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  };

  if (balance === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-14">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-zinc-100">充值</h1>
        <p className="text-sm text-zinc-500 mt-1">
          当前余额：<span className="text-amber-400 font-bold text-lg">{balance} 点</span>
        </p>
      </div>

      {/* Plans */}
      <section className="mb-10">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-4 block">
          选择套餐
        </label>
        <div className="grid grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id}
              className={`p-5 rounded-2xl border transition-all duration-300 ${
                plan.id === "plan_30"
                  ? "border-amber-500/30 bg-amber-500/[0.03] shadow-lg shadow-amber-500/5"
                  : "border-[#27272c] bg-[#121214] hover:border-zinc-600"
              }`}
            >
              <div className="text-sm font-semibold text-zinc-100 mb-1">{plan.name}</div>
              <div className="text-[10px] text-zinc-500 mb-3">
                {plan.videos} 个视频 · {plan.quality}
              </div>
              <div className="text-2xl font-bold text-zinc-100 mb-4">
                ¥{(plan.price_cents / 100).toFixed(0)}
              </div>
              <button
                onClick={() => handleBuy(plan.id)}
                disabled={loading === plan.id}
                className={`w-full h-10 rounded-xl text-xs font-bold transition-all ${
                  plan.id === "plan_30"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500"
                    : "bg-[#1c1c20] border border-[#27272c] text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {loading === plan.id ? "..." : "购买"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/15 text-red-400 text-sm mb-6">{error}</div>
      )}

      {/* History */}
      <section>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-4 block">
          点数流水
        </label>
        <div className="rounded-2xl border border-[#27272c] bg-[#121214] divide-y divide-[#1c1c20] overflow-hidden">
          {history.length === 0 ? (
            <div className="p-6 text-center text-zinc-600 text-sm">暂无记录</div>
          ) : (
            history.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {tx.type === "topup" ? "充值" : tx.type === "consume" ? "生成视频" : "退款"}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-600">
                  {new Date(tx.created_at).toLocaleDateString("zh-CN")}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/app/credits/page.tsx
git commit -m "feat: 充值页 — 套餐卡片 + 点数流水"
```

---

### 任务 15：改造 Sidebar + Layout

**文件：**
- 修改：`frontend/components/Sidebar.tsx`
- 修改：`frontend/app/layout.tsx`

- [ ] **步骤 1：Sidebar 加充值入口 + 余额**

在 `Sidebar.tsx` 的 NAV 数组和 JSX 中：

```tsx
// NAV 数组追加：
{ href: "/credits", label: "Credits", icon: "M12 6v12m-3-2.818.879.659c1.171.879 3.07 1.979 4.242 1.979.208 0 .417-.012.624-.036M20.25 3.75l-7.5 7.5M3.75 20.25l7.5-7.5" },
```

在 Sidebar footer 上方添加 JWT 用户状态：

```tsx
{/* User Status */}
<div className="px-5 py-3">
  <UserStatus />
</div>
```

新建 `frontend/components/UserStatus.tsx`（内联到 Sidebar 或单独文件）：

```tsx
"use client";
import { useEffect, useState } from "react";
import { getMe, logout, getStoredToken } from "@/lib/api";

export default function UserStatus() {
  const [email, setEmail] = useState("");
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!getStoredToken()) return;
    getMe().then(u => { setEmail(u.email); setCredits(u.credits); }).catch(() => {});
  }, []);

  if (!email) return null;

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-zinc-500 truncate">{email}</div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-amber-400">💰 {credits ?? "—"}</span>
      </div>
      <button onClick={logout} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
        Sign out
      </button>
    </div>
  );
}
```

- [ ] **步骤 2：Layout 加 CreditBadge**

在 `layout.tsx` 的 `<main>` 之前插入 CreditBadge：

```tsx
import CreditBadge from "@/components/CreditBadge";

// ...
<body className="h-full flex bg-[#08080a]">
  <Sidebar />
  <main className="flex-1 overflow-auto relative">
    <div className="absolute top-4 right-6 z-10">
      <CreditBadge />
    </div>
    {children}
  </main>
</body>
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/components/Sidebar.tsx frontend/app/layout.tsx frontend/components/UserStatus.tsx
git commit -m "feat: Sidebar 加充值入口 + Layout 加 CreditBadge"
```

---

### 任务 16：改造 Task 页 — 扣点确认弹窗

**文件：**
- 修改：`frontend/app/task/[id]/page.tsx`

- [ ] **步骤 1：在 confirm-scripts 调用处加扣点确认弹窗**

在 `handleConfirmScripts` 函数中（或新增）：

```tsx
import { PaymentRequiredError } from "@/lib/api";
import InsufficientModal from "@/components/InsufficientModal";

// 在组件内添加状态
const [showCreditConfirm, setShowCreditConfirm] = useState(false);
const [insufficient, setInsufficient] = useState<{ required: number; current: number } | null>(null);

const handleConfirmScripts = async () => {
  // 弹出确认弹窗
  setShowCreditConfirm(true);
};

const doConfirmScripts = async () => {
  setShowCreditConfirm(false);
  try {
    await confirmScripts(taskId);
    setTask((p: any) => ({ ...p, stage: "video_gen" }));
    setTimeout(() => poll(), 1000);
  } catch (e: any) {
    if (e instanceof PaymentRequiredError) {
      setInsufficient({ required: e.required, current: e.current });
    } else {
      setError(e.message);
    }
  }
};

// JSX 中添加：
{showCreditConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="w-full max-w-sm mx-4 p-6 rounded-2xl bg-[#121214] border border-[#27272c] shadow-2xl space-y-5">
      <div className="text-center">
        <div className="text-3xl mb-3">🎬</div>
        <h3 className="text-lg font-bold text-zinc-100">确认生成视频？</h3>
        <p className="text-sm text-zinc-400 mt-1">
          本次生成 <span className="text-amber-400 font-semibold">{task.platforms?.length || 1} 个平台</span>，
          消耗 <span className="text-amber-400 font-semibold">{(task.platforms?.length || 1) * 3} 点</span>
        </p>
        <p className="text-xs text-zinc-500 mt-2">
          当前余额：{task.credits_remaining ?? "—"} 点
        </p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => setShowCreditConfirm(false)}
          className="flex-1 h-11 rounded-xl bg-[#1c1c20] border border-[#27272c] text-zinc-400 text-sm font-medium">
          取消
        </button>
        <button onClick={doConfirmScripts}
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm shadow-lg shadow-amber-500/20">
          确认生成 ✦
        </button>
      </div>
    </div>
  </div>
)}

{insufficient && (
  <InsufficientModal
    required={insufficient.required}
    current={insufficient.current}
    onClose={() => setInsufficient(null)}
  />
)}
```

- [ ] **步骤 2：Commit**

```bash
git add frontend/app/task/[id]/page.tsx
git commit -m "feat: task 页 — 扣点确认弹窗 + 402 余额不足引导"
```

---

### 任务 17：改造首页 — 未登录提示

**文件：**
- 修改：`frontend/app/page.tsx`

- [ ] **步骤 1：加认证检查**

在 `HomePage` 组件顶部加：

```tsx
import { getStoredToken } from "@/lib/api";
import { useEffect } from "react";

// 在组件内：
useEffect(() => {
  const token = getStoredToken();
  if (!token) {
    // 用户未 JWT 登录，但仍可通过 middleware 密码 cookie 访问
    // 显示提示但不强制跳转
  }
}, []);
```

实际处理：保留现有流程，因为 middleware 已经做了密码认证。JWT 用户从 login 进来时自动设置了 token。首页做最小改动——如果 `!getStoredToken()` 且不是密码登录的，底部显示"注册/登录以保存点数"提示。

> 此步改动最小，主要是 future-proof。

- [ ] **步骤 2：Commit**

```bash
git add frontend/app/page.tsx
git commit -m "feat: 首页 — JWT 用户状态感知"
```

---

### 任务 18：联调验证

- [ ] **步骤 1：启动后端验证**

```bash
cd /Users/jojo/Desktop/📁\ 开发项目/tvs-video-tool
source backend/venv/bin/activate
cd backend && source venv/bin/activate && cd .. && uvicorn backend.main:app --port 8000 --reload
```

验证端点：
```bash
# 健康检查
curl http://localhost:8000/api/health

# 注册
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 登录
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 获取用户信息（用上面返回的 token）
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"

# 获取套餐
curl http://localhost:8000/api/credits/prices \
  -H "Authorization: Bearer <TOKEN>"
```

- [ ] **步骤 2：验证 Stripe（本地测试）**

```bash
# 安装 Stripe CLI
brew install stripe/stripe-cli/stripe

# 启动 webhook 转发
stripe listen --forward-to localhost:8000/api/stripe/webhook

# 触发测试 checkout
stripe trigger checkout.session.completed
```

确认 `output/users/` 下用户 JSON 的 `credits` 增加，`output/credits/` 下有新流水。

- [ ] **步骤 3：启动前端验证**

```bash
cd frontend && npm run dev
```

1. 访问 `http://localhost:3000/login` → 邮箱注册 → 跳转首页
2. 右上角显示余额角标（0 点）
3. 侧栏有"Credits"入口 → 点击到充值页
4. 创建任务 → 走完整管线到 `script_review`
5. 点"确认生成" → 弹扣点确认弹窗 → 余额不足弹 InsufficientModal → 引导充值

- [ ] **步骤 4：验证回退不重复扣点**

```bash
# 扣点后 rollback 到 script_review
curl -X POST http://localhost:8000/api/tasks/<TASK_ID>/rollback \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"stage":"script_review"}'

# 再次确认 — 不应该扣点
curl -X POST http://localhost:8000/api/tasks/<TASK_ID>/confirm-scripts \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

检查 `credits_consumed > 0` 所以不再扣点。

- [ ] **步骤 5：最终 Commit**

```bash
git add -A
git commit -m "test: 联调验证 — auth + credits + stripe webhook + rollback dedup"
git push
```

---

## 实现依赖关系

```
Task 1 (models)  ──→  Task 2 (config)   Task 3 (user_store)  Task 4 (credit_store)
                           │                    │                    │
                           └────────────────────┴────────────────────┘
                                                │
                                          Task 5 (auth)
                                          Task 6 (stripe)
                                                │
                                          Task 7 (routes 改造)
                                          Task 8 (main.py 装配)
                                                │
                              ┌─────────────────┴──────────────────┐
                              │                                    │
                        Task 9 (api.ts)                   Task 10 (login page)
                         Task 12 (CreditBadge)            Task 11 (middleware)
                         Task 13 (InsufficientModal)
                         Task 14 (credits page)
                         Task 15 (sidebar + layout)
                         Task 16 (task page)
                         Task 17 (home page)
                              │
                         Task 18 (联调)
```

> 后端任务 1-8 必须顺序执行。前端任务 9-17 可在任务 8 完成后并行进行。任务 18 是最终验证。

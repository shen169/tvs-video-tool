# 支付系统设计

> 2026-06-11 · brainstorming → design

## 决策摘要

| 决策 | 结论 |
|------|------|
| 收费模式 | 纯付费，按量计费（点数包） |
| 扣费点 | `preview_wait` → 用户点"生成视频"时扣点 |
| 扣费标准 | 3 点 / 平台视频 |
| 账户体系 | 自建邮箱 + 密码注册（bcrypt + JWT） |
| 支付服务 | Stripe Checkout（payment 模式） |
| 架构 | 后端全权处理（FastAPI 单一数据源） |

## 成本分析

| 服务 | 单价 | 来源 |
|------|------|------|
| DeepSeek Chat | ¥1/M 入 + ¥2/M 出 | 官网 |
| Seedream 5.0 | ¥0.22/张 | 火山引擎 |
| Seedance 2.0 1080P | 51 元/百万 tokens（≈¥1/秒） | 火山引擎 |
| Seedance 2.0 720P | 46 元/百万 tokens（≈¥0.9/秒） | 火山引擎 |

### 单平台 15 秒视频成本

| 阶段 | 成本 |
|------|:--:|
| Stage 1-5 沉没（分析+推荐+预览图） | ¥1.34 |
| Stage 6 Seedance 1080P | ¥15.00 |
| **合计** | **¥16.34** |

| 平台数 | 总成本 | 沉没成本 |
|:--:|------|:--:|
| 1 | ¥16.34 | ¥1.34 |
| 4 | ¥65.33 | ¥5.33 |

## 点数包定价

**1 视频 = 3 点**，扣费在 `POST /tasks/{id}/confirm-scripts`

| | 入门 | 标准 | 专业 |
|------|:--:|:--:|:--:|
| 点数 | 9 点 | 30 点 | 90 点 |
| 可生成 | 3 视频 | 10 视频 | 30 视频 |
| 售价 | **¥69** | **¥199** | **¥499** |
| 视频画质 | 1080P | 1080P | 720P |
| 折合/视频 | ¥23 | ¥19.9 | ¥16.6 |
| 单视频毛利 | ¥6.66 | ¥3.56 | ¥2.91 |
| 毛利率 | 29% | 18% | 18% |

---

## 一、数据模型

### 新增模型（`backend/models.py`）

```python
class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"

class User(BaseModel):
    id: str                    # uuid
    email: str                 # 唯一
    password_hash: str         # bcrypt
    role: UserRole = UserRole.USER
    credits: int = 0           # 剩余点数
    created_at: str

class CreditTransaction(BaseModel):
    id: str
    user_id: str
    amount: int                # 正=充值, 负=消耗
    type: str                  # "topup" | "consume" | "refund"
    stripe_session_id: str | None
    task_id: str | None        # 消耗时关联
    created_at: str

class PricingPlan(BaseModel):
    id: str                    # "plan_9" / "plan_30" / "plan_90"
    name: str
    credits: int
    price_cents: int
    quality: str               # "1080p" | "720p"
    is_active: bool = True
```

### TaskState 加字段

```python
user_id: Optional[str] = None     # 谁创建的
credits_consumed: int = 0          # 已扣点数（回退重来不重复扣）
```

### 存储层

- `UserStore` — JSON 文件持久化（`output/users/`），带 `threading.Lock` 并发保护
- `CreditStore` — JSON 文件持久化（`output/credits/`），按 user_id 索引

---

## 二、后端 API

### 新增端点

| Method | Path | 认证 | 说明 |
|--------|------|:--:|------|
| POST | `/api/auth/register` | ✗ | email + password → JWT |
| POST | `/api/auth/login` | ✗ | email + password → JWT |
| GET | `/api/auth/me` | ✅ | 当前用户 + 余额 |
| GET | `/api/credits/prices` | ✅ | 套餐列表 |
| POST | `/api/credits/checkout` | ✅ | 创建 Stripe Session → 返回 URL |
| POST | `/api/stripe/webhook` | ✗ | Stripe 回调，验签充值 |
| GET | `/api/credits/history` | ✅ | 点数流水 |

### 现有端点改造

| 端点 | 改动 |
|------|------|
| `POST /api/tasks` | 加 JWT，task 绑 `user_id` |
| `GET /api/tasks` | 只返回该用户的任务 |
| `GET /api/tasks/{id}` | 只能查看自己的 task |
| `POST /tasks/{id}/confirm-scripts` | **加扣点检查：余额 ≥ 平台数×3** |
| `POST /tasks/{id}/rollback` | 不退款，保留 `credits_consumed` |

### JWT 中间件（`backend/auth.py`）

```python
from fastapi import Depends, HTTPException, Header
from jose import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "tvs-jwt-secret-change-me")
ALGORITHM = "HS256"

async def get_current_user(authorization: str = Header(...)) -> User:
    token = authorization.split(" ")[1]
    payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    user = user_store.get(payload["sub"])
    if not user:
        raise HTTPException(401)
    return user
```

### 扣点逻辑

```python
# POST /tasks/{id}/confirm-scripts
cost = len(task.platforms) * 3  # 每平台 3 点

if task.credits_consumed > 0:
    # 回退后重来，不重复扣
    pass
else:
    if user.credits < cost:
        raise HTTPException(402, detail={
            "error": "insufficient_credits",
            "required": cost,
            "current": user.credits
        })
    user_store.deduct(user.id, cost)
    store.update(task_id, credits_consumed=cost)

store.update(task_id, stage=TaskStage.VIDEO_GEN)
asyncio.create_task(run_stage5_and_6(task_id, store))
```

### Stripe 集成（`backend/stripe_routes.py` + `stripe_webhook.py`）

- **Checkout**：`stripe.checkout.Session.create(mode="payment")`，metadata 带 `{user_id, credits, plan_id}`
- **Webhook**：验 `stripe-signature`，`checkout.session.completed` → 读 metadata → 充值 + 写流水
- **幂等**：`stripe_session_id` 去重
- **success_url**：`/credits?session_id={CHECKOUT_SESSION_ID}`
- **cancel_url**：`/credits?canceled=true`

### 环境变量

```bash
JWT_SECRET=xxx                    # JWT 签名密钥
STRIPE_SECRET_KEY=sk_test_xxx     # Stripe 密钥
STRIPE_WEBHOOK_SECRET=whsec_xxx   # Webhook 验签
ACCESS_PASSWORD=tvs2024           # 已有，保留
```

---

## 三、前端改动

### 现有页面改动

| 页面 | 改动 |
|------|------|
| `/login` | Tab：快速进入 / 邮箱登录+注册 |
| `/` (首页) | 右上角加余额角标 `CreditBadge` |
| `/task/[id]` | `preview_wait` → 点"生成视频"弹扣点确认；余额不足弹充值引导 |
| `Sidebar` | 加"充值"入口 |

### 新增页面

| 路径 | 组件 | 说明 |
|------|------|------|
| `/credits` | `CreditsPage` | 套餐卡片 + 余额 + 流水 |
| `CreditBadge` | 组件 | 顶栏点数显示 |
| `InsufficientModal` | 组件 | 余额不足弹窗 |

### `/credits` 页面结构

```
┌──────────────────────────────────────────────┐
│  💰 当前余额：35 点                           │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  9 点    │  │  30 点   │  │  90 点   │   │
│  │  3 视频  │  │ 10 视频  │  │ 30 视频  │   │
│  │  1080P   │  │  1080P   │  │  720P    │   │
│  │  ¥69     │  │  ¥199    │  │  ¥499    │   │
│  │ [购买]   │  │ [购买]   │  │ [购买]   │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│                                              │
│  📋 点数流水                                 │
│  06-11  生成视频 (tiktok+amazon)   -6 点     │
│  06-10  充值 30 点                +30 点     │
└──────────────────────────────────────────────┘
```

### 扣点确认弹窗

余额充足时：
```
确认生成视频？
本次生成 2 个平台，消耗 6 点数
当前余额：35 点 → 生成后：29 点

[取消]  [确认生成 ✦]
```

余额不足时：
```
余额不足
需要 6 点，当前 0 点

[去充值]  [取消]
```

### API 层（`lib/api.ts` 新增）

```typescript
register(email: string, password: string) => { token, user }
login(email: string, password: string) => { token, user }
getMe() => { user }
getPricePlans() => PricingPlan[]
createCheckout(planId: string) => { url: string }
getCreditHistory() => CreditTransaction[]
```

---

## 四、Stripe 时序

```
用户浏览器              FastAPI                         Stripe
   │                     │                               │
   │ 1. 点击"购买 30 点"  │                               │
   │ ───────────────────→│ POST /credits/checkout        │
   │                     │   plan_id: "plan_30"          │
   │                     │                               │
   │                     │ 2. stripe.checkout.sessions    │
   │                     │    .create({                   │
   │                     │      mode: "payment",          │
   │                     │      metadata: {               │
   │                     │        user_id, credits: 30    │
   │                     │      }                         │
   │                     │    })                          │
   │                     │ ─────────────────────────────→│
   │                     │ ←── session.url ──────────────│
   │                     │                               │
   │ 3. 302 → Stripe     │                               │
   │ ←───────────────────│                               │
   │                     │                               │
   │ 4. 用户在 Stripe 支付                                │
   │ ───────────────────────────────────────────────────→│
   │                     │                               │
   │                     │ 5. Webhook                     │
   │                     │ ←── checkout.session           │
   │                     │     .completed ───────────────│
   │                     │                               │
   │                     │ 6. 验签 + 充值                 │
   │                     │    user.credits += 30          │
   │                     │    写 CreditTransaction        │
   │                     │                               │
   │ 7. → /credits?success=true                           │
   │    → 轮询 GET /me 确认余额                           │
```

---

## 五、错误处理

| 场景 | 处理 |
|------|------|
| 点数不足 | HTTP 402，前端弹充值引导 |
| 扣点成功，Seedance 失败 | 不退点（成本已消耗），task 标 failed |
| 扣点成功，管线崩溃 | 不退点。rollback 重来不重复扣（`credits_consumed` 保护） |
| Stripe webhook 重复 | `stripe_session_id` 去重 |
| 并发扣点 | `threading.Lock` 保护 |
| 回退后重新确认 | `credits_consumed > 0` → 不扣 |

---

## 六、实现顺序

| # | 步骤 | 涉及文件 |
|:--:|------|------|
| 1 | 后端数据模型 | `models.py` — User, CreditTransaction, PricingPlan |
| 2 | 存储层 | `user_store.py`, `credit_store.py` |
| 3 | JWT 认证 | `auth.py` — register / login / middleware |
| 4 | 改造现有路由 | `routes.py` — 加认证 + 扣点 + `user_id` |
| 5 | Stripe | `stripe_routes.py`, `stripe_webhook.py` |
| 6 | 前端 login 改邮箱登录 | `login/page.tsx`, `middleware.ts` |
| 7 | 前端充值页 | `credits/page.tsx`, `CreditBadge.tsx` |
| 8 | 扣点弹窗 + 402 处理 | `task/[id]/page.tsx`, `InsufficientModal.tsx` |
| 9 | 联调测试 | 全链路 |

### 不改动的部分

- 管线 6 个 stage（`pipeline/stage*.py`）
- 现有 password middleware（保留，可选关闭）
- 部署配置（`render.yaml`, `railway.toml`）

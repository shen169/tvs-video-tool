# CLAUDE.md — TVS Video Tool

## 项目
跨境电商 AI 带货视频生成 Web 应用。粘贴产品链接 → AI 分析 → 推荐风格 → 确认分镜 → 预览图 → Seedance 出片。

## 技术栈
- 前端：Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- 后端：Python 3.12 + FastAPI + httpx
- 视频：Seedance 2.0 (`doubao-seedance-2-0-260128`)
- 图片：Seedream 5.0 (`doubao-seedream-5-0-260128`)
- AI 文本：DeepSeek Chat（主）+ Anthropic Haiku（fallback）
- 支付：Stripe Checkout（payment 模式）
- 认证：邮箱 + bcrypt + JWT + 密码双重模式
- 管理：Admin 角色 + 后台面板（/admin）

## 启动
```bash
# 后端（必须从项目根目录启动，否则相对导入会失败）
cd backend && source venv/bin/activate && cd .. && uvicorn backend.main:app --port 8000 --reload

# 前端
cd frontend && npm run dev
```

## 环境变量

| 变量 | 说明 | 必需 |
|------|------|:--:|
| `SEEDANCE_API_KEY` | 火山引擎方舟 API Key（Seedance + Seedream 共用） | ✅ |
| `DEEPSEEK_API_KEY` | DeepSeek API Key（AI 分析 + 推荐 + prompt） | ✅ |
| `ANTHROPIC_API_KEY` | Anthropic API Key（DeepSeek 不可用时的 fallback） | ❌ |
| `APIFY_API_TOKEN` | Apify Amazon 爬虫 Token | ❌ |
| `TAVILY_API_KEY` | Tavily 搜索 API Key | ❌ |
| `JWT_SECRET` | JWT 签名密钥（生产环境务必修改默认值） | ✅ |
| `STRIPE_SECRET_KEY` | Stripe 密钥 | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 验签密钥 | ✅ |
| `ACCESS_PASSWORD` | 前端密码登录 + admin 账户密码（保留） | ✅ |
| `BASE_URL` | 部署域名（Stripe success/cancel URL 用到） | ❌ |

## API 成本

| 服务 | 单价 | 15秒视频成本 |
|------|------|:--:|
| DeepSeek Chat | ¥1/M 入 + ¥2/M 出 | ~¥0.015 |
| Seedream 5.0 | ¥0.22/张 | ~¥1.32（6 张预览图） |
| Seedance 2.0 1080P | ¥1/秒 | ¥15 |
| **合计** | | **~¥16.34/平台视频** |

> 专业套餐用 720P（¥0.9/秒），降本到 ~¥13.72/视频

## 项目结构
```
tvs-video-tool/
├── frontend/                  # Next.js 前端
│   ├── app/
│   │   ├── page.tsx          # 首页 — 输入链接 + 选平台
│   │   ├── task/[id]/         # 任务进度页 — 管线各阶段交互
│   │   ├── login/             # 登录页 — 密码 / 邮箱登录
│   │   ├── credits/           # 充值页 — 套餐卡片 + 流水
│   │   ├── admin/             # 管理后台 — 用户列表/流水/统计/手动充值
│   │   ├── history/           # 历史任务
│   │   └── api/               # Next.js API Route（代理到后端）
│   ├── components/
│   │   ├── PipelineProgress.tsx
│   │   ├── RecommendationCard.tsx
│   │   ├── ScriptEditor.tsx
│   │   ├── StoryboardGallery.tsx
│   │   ├── VideoResult.tsx
│   │   ├── CreditBadge.tsx    # 余额角标
│   │   ├── InsufficientModal.tsx # 余额不足弹窗
│   │   ├── UserStatus.tsx     # 侧栏用户状态（邮箱+余额+登出）
│   │   ├── Sidebar.tsx
│   │   └── ...
│   ├── lib/api.ts             # 后端请求封装
│   └── middleware.ts          # 认证网关（cookie + JWT）
├── backend/                   # FastAPI 后端
│   ├── main.py                # 应用入口 + CORS
│   ├── models.py              # TaskState, User, CreditTransaction, etc.
│   ├── routes.py              # 管线 API（task CRUD + 交互）
│   ├── auth.py                # JWT 认证中间件
│   ├── task_manager.py        # TaskStore（内存 + JSON 文件持久化）
│   ├── user_store.py          # User + 点数存储（JSON 文件 + Lock）
│   ├── credit_store.py        # 点数流水存储
│   ├── config.py              # 套餐配置 + 常量
│   ├── stripe_routes.py       # Stripe Checkout 端点
│   ├── stripe_webhook.py      # Stripe Webhook 处理
│   └── pipeline/
│       ├── runner.py          # 管线编排器
│       ├── stage1_fetch.py    # 产品抓取（Apify→Tavily→HTTP）+ AI 分析
│       ├── stage2_image.py    # 参考图（抓取图优先，兜底 Seedream）
│       ├── stage2_creative.py # [deprecated] 创意方向
│       ├── stage25_recommend.py # AI 8 维度智能推荐
│       ├── stage3_style.py    # [deprecated] 风格选择
│       ├── stage4_script.py   # 模板分镜脚本（6 种视频类型 × 6 镜）
│       ├── stage5_preview.py  # 分镜预览图（DeepSeek prompt → Seedream 生图）
│       └── stage6_video.py    # Seedance 2.0 视频生成 + 轮询
├── docs/superpowers/specs/    # 设计文档
└── output/                    # 运行时输出（tasks/, users/, credits/）
```

## API 端点

### 管线
| Method | Path | 认证 | 说明 |
|--------|------|:--:|------|
| POST | `/api/tasks` | ✅ | 创建任务（url + platforms） |
| GET | `/api/tasks` | ✅ | 用户的任务列表 |
| GET | `/api/tasks/{id}` | ✅ | 查询任务状态（只能看自己的） |
| POST | `/api/tasks/{id}/ref-image` | ✅ | 上传自定义参考图 |
| POST | `/api/tasks/{id}/confirm-recommend` | ✅ | 确认 AI 推荐 → 脚本生成 |
| PUT | `/api/tasks/{id}/scripts` | ✅ | 保存编辑后的脚本 |
| POST | `/api/tasks/{id}/confirm-scripts` | ✅ | **确认脚本 → 扣 3 点/平台 → 视频生成** |
| POST | `/api/tasks/{id}/rollback` | ✅ | 回退阶段 |
| POST | `/api/tasks/{id}/regenerate-ref-image` | ✅ | 重新生成参考图 |
| POST | `/api/tasks/{id}/regenerate-previews` | ✅ | 重新生成预览图 |

### 认证（新增）
| Method | Path | 认证 | 说明 |
|--------|------|:--:|------|
| POST | `/api/auth/register` | ✗ | 邮箱注册 → JWT |
| POST | `/api/auth/login` | ✗ | 邮箱登录 → JWT |
| POST | `/api/auth/password-login` | ✗ | 密码登录 → admin JWT |
| GET | `/api/auth/me` | ✅ | 当前用户 + 余额 + 角色 |

### 支付（新增）
| Method | Path | 认证 | 说明 |
|--------|------|:--:|------|
| GET | `/api/credits/prices` | ✅ | 套餐列表 |
| POST | `/api/credits/checkout` | ✅ | 创建 Stripe Session → URL |
| POST | `/api/stripe/webhook` | ✗ | Stripe 回调（Stripe 签名验证） |
| GET | `/api/credits/history` | ✅ | 点数流水 |

### 管理后台（新增 · admin only）
| Method | Path | 认证 | 说明 |
|--------|------|:--:|------|
| GET | `/api/admin/stats` | ✅🔒 | 概览统计（总用户/售出/消耗/今日） |
| GET | `/api/admin/users` | ✅🔒 | 所有用户列表 |
| GET | `/api/admin/transactions` | ✅🔒 | 全站流水记录 |
| POST | `/api/admin/users/{id}/add-credits` | ✅🔒 | 手动充值 |

### 其他
| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/health` | 健康检查 |

## 付费逻辑

**扣费点**：`POST /tasks/{id}/confirm-scripts` — 用户看到预览图后确认生成时

**扣费规则**：每平台 3 点，`credits_consumed` 记录已扣点数，回退后重来不重复扣

**点数包**：

| | 入门 | 标准 | 专业 |
|------|:--:|:--:|:--:|
| 点数 | 9 点 | 30 点 | 90 点 |
| 视频数 | 3 | 10 | 30 |
| 售价 | ¥69 | ¥199 | ¥499 |
| 画质 | 1080P | 1080P | 720P |

**HTTP 402**：点数不足时返回 402，前端弹 `InsufficientModal` 引导充值。

**登录双模式**：
- **Quick（密码）**：输入 `ACCESS_PASSWORD` → 设 `tvs_auth` cookie + 后端 `/api/auth/password-login` 拿 admin JWT → `tvs_authed` cookie
- **邮箱登录**：`/api/auth/login` → JWT 存 localStorage → 所有 API 请求带 `Authorization: Bearer <token>`
- **邮箱注册**：`/api/auth/register` → 自动登录

**管理员**：
- 密码登录者自动获得 `role=admin`，侧栏出现 `⚙ Admin` 入口
- `/admin` 页面：概览统计 + 用户列表（含手动充值）+ 全站流水
- 普通注册用户 `role=user`，无法访问 `/admin`（API 层 403）

## 管线阶段流转
```
pending → fetching → ref_image → recommend_wait → script_gen → script_review → video_gen → done
                                                                                     ↘ failed
```

### 阶段说明
| 阶段 | 说明 | 用户交互 |
|------|------|------|
| `pending` | 初始 | — |
| `fetching` | 抓取产品 + AI 分析 + 推荐 | 自动 |
| `recommend_wait` | AI 推荐待确认 | 确认/调整推荐 |
| `script_gen` | 生成分镜脚本 | 自动 |
| `script_review` | 脚本审核编辑 | 编辑/确认 |
| `video_gen` | Seedance 生成视频 | 自动（扣点已完成） |
| `done` | 完成 | 查看/下载 |
| `failed` | 失败 | 查看错误，可 rollback |

## 注意事项
- 从项目根目录启动 uvicorn（`uvicorn backend.main:app`），否则 `from .pipeline.runner import ...` 会失败
- Next.js middleware 保留 `ACCESS_PASSWORD` cookie + `tvs_authed` cookie 双门，JWT 认证在 API 层执行
- 存储全用 JSON 文件（`output/` 目录），暂不用数据库——与现有 `FileTaskStore` 模式一致
- Stripe webhook 本地测试用 `stripe listen --forward-to localhost:8000/api/stripe/webhook`
- admin 用户启动时自动创建（`admin@tvs.internal`，密码 = `ACCESS_PASSWORD`），初始 999 点
- 前端 API 调用必须走 `/api/backend/...` 代理路径，不能直连 `/api/auth/...`（会被 Next.js 拦截）
- 密码登录用户和邮箱登录用户共享同一 JWT 机制，区别在于如何获取 token

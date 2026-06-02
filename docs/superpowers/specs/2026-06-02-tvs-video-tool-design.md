# TVS Video Tool — 设计规格

> 跨境电商 AI 带货视频生成 Web 应用

## 产品定位

Web SaaS，用户粘贴产品链接 → 半自动确认式工作流 → 生成多平台带货视频。

**MVP 目标**：单人可用，本地跑通全流程。架构预留给后续多用户扩展。

## 核心工作流

```
粘贴链接 → [Stage1:产品分析] → [Stage2:参考图] → [Stage3:选风格] → [Stage4:脚本分镜] → [Stage5:分镜预览] → [Stage6:出视频] → 下载
                                  ↖ 用户可上传产品图
```

**Stage 2 双路径**：用户上传产品实拍图 → 直接用；没上传 → AI 自动生成白底商品图。

交互流程：Stage 1 跑完立即展示产品分析结果，同时让用户决定：上传参考图 / 跳过（AI 生成）。Stage 3-6 保持半自动确认。

## 支持平台

- TikTok / TikTok Shop（9:16, 15-60s）
- Amazon 主图视频（16:9, 30-60s）
- YouTube Shorts（9:16, 15-60s）
- Instagram Reels（9:16, 15-90s）

## 技术栈

| 层 | 技术 | 理由 |
|---|------|------|
| 前端 | Next.js (React) + Tailwind CSS | 用户有 React 经验；半自动向导适合组件化 |
| 后端 | Python FastAPI | AI 管线天然 Python 生态（Seedance SDK、图片处理） |
| 通信 | REST + 轮询（MVP）；预留 WebSocket | 轮询够用，架构可升级 |
| 存储 | 内存 dict（MVP）→ 预留 PostgreSQL | 零依赖起步，TaskStore 抽象类便于后续替换 |
| 产物 | 文件系统 `output/{task_id}/` | 视频/图片文件不适合存数据库 |

## API 设计

```
POST   /api/tasks                        — 创建任务（含可选的产品链接）
POST   /api/tasks/{task_id}/ref-image    — 上传产品参考图（multipart）
GET    /api/tasks/{task_id}              — 查询进度+当前阶段输出
POST   /api/tasks/{task_id}/style        — 提交风格选择
POST   /api/tasks/{task_id}/storyboard   — 确认分镜
GET    /api/tasks/{task_id}/video/{plat} — 下载视频
```

## 前端路由 & 组件

```
/                          — 首页：粘贴链接 + 选平台 + 上传参考图（可选）
/task/[id]                 — 任务进度页（主交互页）
  ├── PipelineProgress     — 顶部 6 阶段进度条
  ├── ProductAnalysis      — Stage 1 产品信息展示
  ├── RefImageUpload       — Stage 2 参考图：展示 AI 生成图 / 用户上传图
  ├── StylePicker          — Stage 3 风格三选一
  ├── StoryboardGallery    — Stage 5 分镜预览画廊
  └── VideoResult          — Stage 6 视频下载
```

## 后端 Pipeline

```
backend/
├── main.py                 — FastAPI app + 路由注册
├── task_manager.py         — TaskStore 抽象类 + InMemoryTaskStore
├── pipeline/
│   ├── stage1_fetch.py     — URL 抓取 → 产品结构化信息
│   ├── stage2_image.py     — 产品参考图生成（调 AI 图片 API）
│   ├── stage3_style.py     — 风格匹配（5 维度 × 3 候选）
│   ├── stage4_script.py    — 分平台脚本 + 分镜表
│   ├── stage5_preview.py   — 分镜预览图（调 AI 图片 API + 参考图）
│   └── stage6_video.py     — Seedance 2.0 视频生成 + 下载
└── output/{task_id}/       — 产物目录
```

## 任务状态机

```
pending → fetching → ref_image → style_wait → script_gen → preview_wait → video_gen → done
                       ↓              ↓                        ↓
                   (有上传直用    (等待用户选风格)        (等待用户确认分镜)
                    无上传AI生成)
```

- `style_wait` 和 `preview_wait` 是需要用户交互的阻塞状态
- 其他状态自动流转

## 分步演进路线

| 阶段 | 内容 |
|------|------|
| **MVP（当前）** | 纯管线、无数据库、无用户系统、本地运行 |
| **V2** | 加 PostgreSQL、用户注册登录、任务历史列表 |
| **V3** | 部署上线、异步任务队列（Celery/Redis）、多语言 |

## 不做的事情

- 用户注册/登录/权限
- 支付/计费
- 视频编辑/时间轴拖拽
- 素材库管理
- 移动端适配（MVP 只做桌面端）

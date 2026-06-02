# TVS Video Tool 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建一个 Web 应用，用户粘贴产品链接 → 半自动确认式 6 阶段管线 → 输出多平台带货视频。

**架构：** Next.js 前端 + Python FastAPI 后端。前端负责用户交互和进度展示，后端负责 AI 管线（产品抓取、图片生成、风格匹配、脚本分镜、视频生成）。REST API + 轮询通信，内存状态管理，文件系统存储产物。

**技术栈：** Next.js (App Router) + Tailwind CSS + FastAPI + Seedance 2.0 API

---

## 文件结构

```
tvs-video-tool/
├── frontend/                  # Next.js App Router
│   ├── app/
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页：链接输入 + 图片上传 + 平台选择
│   │   └── task/[id]/
│   │       └── page.tsx       # 任务进度页（主交互页）
│   ├── components/
│   │   ├── PipelineProgress.tsx   # 6 阶段进度条
│   │   ├── ProductAnalysis.tsx    # Stage 1 产品信息卡片
│   │   ├── RefImageStage.tsx      # Stage 2 参考图展示/上传
│   │   ├── StylePicker.tsx        # Stage 3 风格三选一
│   │   ├── StoryboardGallery.tsx  # Stage 5 分镜预览画廊
│   │   ├── VideoResult.tsx        # Stage 6 视频下载
│   │   └── TaskStage.tsx          # 阶段路由组件
│   ├── lib/
│   │   └── api.ts             # API 调用封装
│   └── package.json
├── backend/
│   ├── main.py                # FastAPI app + 路由
│   ├── task_manager.py        # TaskStore + InMemoryTaskStore
│   ├── pipeline/
│   │   ├── __init__.py
│   │   ├── stage1_fetch.py    # URL 抓取 → 产品信息
│   │   ├── stage2_image.py    # 参考图：AI 生成
│   │   ├── stage3_style.py    # 风格匹配推荐
│   │   ├── stage4_script.py   # 脚本 + 分镜
│   │   ├── stage5_preview.py  # 分镜预览图
│   │   └── stage6_video.py    # Seedance 视频生成
│   ├── output/                # 产物目录（gitignore）
│   └── requirements.txt
└── .gitignore
```

---

### 任务 1：项目脚手架

**文件：**
- 创建：`frontend/` 目录（Next.js）
- 创建：`backend/` 目录（FastAPI）
- 创建：`.gitignore`

- [ ] **步骤 1：创建 Next.js 前端**

```bash
cd /Users/jojo/tvs-video-tool
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*" --use-npm
```

- [ ] **步骤 2：创建 FastAPI 后端目录**

```bash
mkdir -p /Users/jojo/tvs-video-tool/backend/pipeline
mkdir -p /Users/jojo/tvs-video-tool/backend/output
```

- [ ] **步骤 3：编写 .gitignore**

```bash
cat > /Users/jojo/tvs-video-tool/.gitignore << 'GITIGNORE'
node_modules/
.next/
__pycache__/
*.pyc
.env
backend/output/
venv/
GITIGNORE
```

- [ ] **步骤 4：编写后端 requirements.txt**

```bash
cat > /Users/jojo/tvs-video-tool/backend/requirements.txt << 'REQS'
fastapi==0.115.0
uvicorn[standard]==0.30.6
httpx==0.27.2
python-multipart==0.0.9
aiofiles==24.1.0
REQS
```

- [ ] **步骤 5：安装后端依赖**

```bash
cd /Users/jojo/tvs-video-tool/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

- [ ] **步骤 6：Commit**

```bash
cd /Users/jojo/tvs-video-tool
git add -A
git commit -m "scaffold: Next.js frontend + FastAPI backend 项目结构"
```

---

### 任务 2：TaskStore 任务管理器

**文件：**
- 创建：`backend/task_manager.py`
- 创建：`backend/models.py`

- [ ] **步骤 1：编写数据模型**

```python
# backend/models.py
from enum import Enum
from typing import Optional
from pydantic import BaseModel

class TaskStage(str, Enum):
    PENDING = "pending"
    FETCHING = "fetching"
    REF_IMAGE = "ref_image"
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
    scene: str
    voiceover: str
    subtitle: str

class TaskState(BaseModel):
    task_id: str
    product_url: str
    platforms: list[Platform]
    stage: TaskStage = TaskStage.PENDING
    product_info: Optional[dict] = None
    ref_image_url: Optional[str] = None
    uploaded_ref_image: Optional[str] = None  # 本地文件路径
    style_options: Optional[list[dict]] = None
    selected_style: Optional[StyleChoice] = None
    scripts: Optional[dict[str, list[ShotItem]]] = None  # platform → shots
    preview_images: Optional[dict[str, list[str]]] = None  # platform → image paths
    video_urls: Optional[dict[str, str]] = None  # platform → video url
    error: Optional[str] = None
```

- [ ] **步骤 2：编写 TaskStore**

```python
# backend/task_manager.py
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
```

- [ ] **步骤 3：编写 FastAPI main.py（骨架）**

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .task_manager import InMemoryTaskStore

app = FastAPI(title="TVS Video Tool API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

store = InMemoryTaskStore()

@app.get("/api/health")
def health():
    return {"status": "ok"}
```

- [ ] **步骤 4：验证后端启动**

```bash
cd backend && source venv/bin/activate && uvicorn main:app --port 8000 &
sleep 2 && curl http://localhost:8000/api/health
# 预期：{"status":"ok"}
kill %1
```

- [ ] **步骤 5：Commit**

```bash
git add -A && git commit -m "feat: TaskStore 任务管理器 + FastAPI 骨架"
```

---

### 任务 3：创建任务 API + 首页

**文件：**
- 创建：`backend/routes.py`
- 修改：`backend/main.py`
- 修改：`frontend/app/page.tsx`
- 创建：`frontend/lib/api.ts`

- [ ] **步骤 1：编写后端创建任务和查询接口**

```python
# backend/routes.py
from fastapi import APIRouter, UploadFile, File, Form
from .models import TaskState, TaskStage, Platform, CreateTaskRequest
from .task_manager import InMemoryTaskStore

router = APIRouter(prefix="/api")
store: InMemoryTaskStore = None  # 由 main.py 注入

def init_routes(s: InMemoryTaskStore):
    global store
    store = s

@router.post("/tasks")
async def create_task(url: str = Form(...), platforms: str = Form("tiktok,amazon,youtube,instagram")):
    platform_list = [Platform(p.strip()) for p in platforms.split(",")]
    task = TaskState(
        task_id="",
        product_url=url,
        platforms=platform_list,
        stage=TaskStage.PENDING
    )
    task = store.create(task)
    # 启动后台管线（后续任务实现）
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
```

- [ ] **步骤 2：更新 main.py 注册路由**

```python
# backend/main.py (在已有内容后追加)
from .routes import router, init_routes
init_routes(store)
app.include_router(router)
```

- [ ] **步骤 3：编写前端 API 封装**

```typescript
// frontend/lib/api.ts
const BASE = "http://localhost:8000/api";

export async function createTask(url: string, platforms: string[], image?: File) {
  const form = new FormData();
  form.append("url", url);
  form.append("platforms", platforms.join(","));
  if (image) form.append("file", image);

  const res = await fetch(`${BASE}/tasks`, { method: "POST", body: form });
  return res.json();
}

export async function getTask(taskId: string) {
  const res = await fetch(`${BASE}/tasks/${taskId}`);
  return res.json();
}

export async function uploadRefImage(taskId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/tasks/${taskId}/ref-image`, {
    method: "POST", body: form,
  });
  return res.json();
}

export async function submitStyle(taskId: string, style: Record<string, string>) {
  const res = await fetch(`${BASE}/tasks/${taskId}/style`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(style),
  });
  return res.json();
}

export async function confirmStoryboard(taskId: string) {
  const res = await fetch(`${BASE}/tasks/${taskId}/storyboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved: true }),
  });
  return res.json();
}
```

- [ ] **步骤 4：编写首页**

```typescript
// frontend/app/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/lib/api";

const PLATFORMS = [
  { key: "tiktok", label: "TikTok" },
  { key: "amazon", label: "Amazon" },
  { key: "youtube", label: "YouTube Shorts" },
  { key: "instagram", label: "Instagram Reels" },
];

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [platforms, setPlatforms] = useState(["tiktok", "amazon", "youtube", "instagram"]);
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const togglePlatform = (key: string) => {
    setPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (!url) return;
    setLoading(true);
    const { task_id } = await createTask(url, platforms, image || undefined);
    router.push(`/task/${task_id}`);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-6">
        <h1 className="text-3xl font-bold text-center">TVS Video Tool</h1>
        <p className="text-zinc-400 text-center">粘贴产品链接，生成多平台带货视频</p>

        <input
          className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500"
          placeholder="产品链接 (Amazon / Shopify / ...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => togglePlatform(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                platforms.includes(p.key)
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700">
          <label className="text-sm text-zinc-400">产品参考图（可选，不传则 AI 自动生成）</label>
          <input
            type="file"
            accept="image/*"
            className="mt-2 text-sm text-zinc-300"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !url}
          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold text-lg transition"
        >
          {loading ? "创建中..." : "开始生成视频"}
        </button>
      </div>
    </main>
  );
}
```

- [ ] **步骤 5：验证前后端连通**

```bash
# 终端 1
cd backend && source venv/bin/activate && uvicorn main:app --port 8000 --reload

# 终端 2
cd frontend && npm run dev

# 终端 3
curl -X POST http://localhost:8000/api/tasks -F "url=https://example.com/product" -F "platforms=tiktok,amazon"
# 预期：{"task_id":"xxx","stage":"pending"}
```

- [ ] **步骤 6：Commit**

```bash
git add -A && git commit -m "feat: 创建任务 API + 后端路由 + 首页 UI"
```

---

### 任务 4：管线 Stage 1 — 产品抓取分析

**文件：**
- 创建：`backend/pipeline/stage1_fetch.py`
- 修改：`backend/main.py`

- [ ] **步骤 1：编写产品抓取逻辑**

```python
# backend/pipeline/stage1_fetch.py
import httpx
import re

async def fetch_product_info(url: str) -> dict:
    """抓取产品页面，提取结构化信息。优先用 baoyu-url-to-markdown 方式，
    对 Amazon 链接尝试直接解析。MVP 阶段先用正则+httpx，后续可接 Defuddle/baoyu-fetch。"""
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                              "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            })
            html = resp.text
    except Exception as e:
        return {"error": f"抓取失败: {str(e)}", "raw_html": ""}

    # 提取标题
    title = ""
    title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE)
    if title_match:
        title = title_match.group(1).strip()

    # 提取 meta description
    desc = ""
    desc_match = re.search(r'<meta[^>]*name="description"[^>]*content="([^"]*)"', html, re.IGNORECASE)
    if desc_match:
        desc = desc_match.group(1)

    # 提取价格（Amazon 模式）
    price = ""
    price_match = re.search(r'\$\d+\.?\d*', html)
    if price_match:
        price = price_match.group(0)

    # 提取图片
    images = []
    img_matches = re.findall(r'<img[^>]*src="([^"]*)"', html)
    images = [src for src in img_matches[:10] if src.startswith("http") and not src.endswith(".svg")]

    # 识别品类关键词
    category_keywords = []
    body_text = re.sub(r'<[^>]+>', ' ', html[:50000])
    cate_patterns = ["electronics", "home", "kitchen", "sports", "beauty", "fashion",
                     "toys", "automotive", "health", "office", "pet", "garden",
                     "手机", "电脑", "家具", "厨房", "运动", "美妆", "服装", "玩具"]
    for kw in cate_patterns:
        if kw.lower() in body_text.lower():
            category_keywords.append(kw)

    return {
        "title": title,
        "description": desc[:500],
        "price": price,
        "images": images[:5],
        "category_hints": category_keywords[:5],
        "url": url,
    }
```

- [ ] **步骤 2：在 main.py 中装配 Stage 1 到管线**

在 `backend/main.py` 和路由中增加后台任务调用。创建 `backend/pipeline/runner.py`：

```python
# backend/pipeline/runner.py
import asyncio
from ..task_manager import InMemoryTaskStore
from ..models import TaskStage
from .stage1_fetch import fetch_product_info

async def run_pipeline(task_id: str, store: InMemoryTaskStore):
    task = store.get(task_id)
    try:
        # Stage 1: 产品抓取
        task = store.update(task_id, stage=TaskStage.FETCHING)
        product_info = await fetch_product_info(task.product_url)
        task = store.update(task_id, product_info=product_info, stage=TaskStage.REF_IMAGE)

        # Stage 2-6 后续任务实现

    except Exception as e:
        store.update(task_id, stage=TaskStage.FAILED, error=str(e))
```

- [ ] **步骤 3：修改路由，创建任务后启动后台管线**

在 `backend/routes.py` 的 `create_task` 末尾加入：

```python
import asyncio
from .pipeline.runner import run_pipeline

# 在 return 之前：
asyncio.create_task(run_pipeline(task.task_id, store))
```

- [ ] **步骤 4：手动测试 Stage 1**

```bash
cd backend && source venv/bin/activate
python3 -c "
import asyncio
from pipeline.stage1_fetch import fetch_product_info
result = asyncio.run(fetch_product_info('https://www.amazon.com/dp/B0FXGX9KYJ'))
print(result.get('title','FAIL'))
"
# 预期：打印产品标题
```

- [ ] **步骤 5：Commit**

```bash
git add -A && git commit -m "feat: Stage 1 产品抓取分析 + 管线执行器"
```

---

### 任务 5：管线 Stage 2 + Stage 3 — 参考图 + 风格匹配

**文件：**
- 创建：`backend/pipeline/stage2_image.py`
- 创建：`backend/pipeline/stage3_style.py`
- 修改：`backend/pipeline/runner.py`

- [ ] **步骤 1：Stage 2 参考图生成**

```python
# backend/pipeline/stage2_image.py
async def generate_ref_image(task: dict) -> str:
    """如果有用户上传的图直接用；否则调 AI 生图生成白底商品图。
    MVP 阶段返回占位 URL，后续接 baoyu-imagine / fal-image API。"""
    if task.get("uploaded_ref_image"):
        return task["uploaded_ref_image"]

    product = task.get("product_info", {})
    title = product.get("title", "product")
    # 构造生图 prompt（后续接真实 API）
    prompt = (
        f"Commercial product photography, photorealistic, clean white background. "
        f"{title}. Centered hero shot, 45-degree angle, soft studio lighting. "
        f"Product only, no text, no logos, 1:1 square, 8K detail."
    )
    # MVP: 返回 prompt 字符串，标记待接 API
    return f"__AI_GEN__:{prompt}"
```

- [ ] **步骤 2：Stage 3 风格匹配**

```python
# backend/pipeline/stage3_style.py
STYLE_LIBRARY = {
    "visual_style": [
        {"id": "clean_minimal", "label": "简约干净", "desc": "白色/浅灰背景，产品为主"},
        {"id": "lifestyle_warm", "label": "生活温馨", "desc": "暖色调家居场景，真实感"},
        {"id": "tech_futuristic", "label": "科技未来", "desc": "深色背景，光影动感"},
    ],
    "camera": [
        {"id": "smooth_cinematic", "label": "电影感平滑", "desc": "稳定运镜，浅景深"},
        {"id": "dynamic_handheld", "label": "动感手持", "desc": "轻微晃动，临场感"},
        {"id": "macro_detail", "label": "微距细节", "desc": "极近距离，材质特写"},
    ],
    "lighting": [
        {"id": "soft_studio", "label": "柔光棚拍", "desc": "均匀柔和，无阴影"},
        {"id": "natural_window", "label": "自然窗光", "desc": "单侧自然光，有立体感"},
        {"id": "dramatic_rim", "label": "戏剧轮廓光", "desc": "暗背景+边缘光，高端感"},
    ],
    "angle": [
        {"id": "eye_level", "label": "平视", "desc": "与人眼齐平，自然视角"},
        {"id": "top_down", "label": "俯拍", "desc": "从上往下，适合桌面产品"},
        {"id": "low_hero", "label": "仰拍英雄", "desc": "低角度，产品显得高大"},
    ],
    "human": [
        {"id": "no_human", "label": "无人物", "desc": "纯产品展示"},
        {"id": "hands_only", "label": "手部出镜", "desc": "只露手操作产品"},
        {"id": "full_person", "label": "人物出镜", "desc": "模特使用产品"},
    ],
}

async def generate_style_options(product_info: dict) -> list[dict]:
    """根据产品品类返回 3 组风格组合。后续可接品类映射表做智能推荐。"""
    category = product_info.get("category_hints", [])
    # 简易规则：科技类产品推荐科技风格
    is_tech = any(kw in str(category).lower() for kw in ["electronics", "tech", "手机", "电脑"])

    option_a = {
        "id": "a", "label": "简约商务",
        "visual_style": "clean_minimal",
        "camera": "smooth_cinematic",
        "lighting": "soft_studio",
        "angle": "eye_level",
        "human": "hands_only",
        "description": "干净专业，适合 Amazon 主图和 TikTok 开场"
    }
    option_b = {
        "id": "b", "label": "生活场景",
        "visual_style": "lifestyle_warm",
        "camera": "dynamic_handheld",
        "lighting": "natural_window",
        "angle": "top_down",
        "human": "full_person",
        "description": "温馨真实，适合 TikTok/Reels 种草"
    }
    option_c = {
        "id": "c", "label": "科技感" if is_tech else "高端质感",
        "visual_style": "tech_futuristic" if is_tech else "clean_minimal",
        "camera": "macro_detail" if is_tech else "smooth_cinematic",
        "lighting": "dramatic_rim",
        "angle": "low_hero",
        "human": "no_human",
        "description": "强调产品质感和高级感，适合 YouTube Shorts"
    }
    return [option_a, option_b, option_c]
```

- [ ] **步骤 3：更新 runner.py 串联 Stage 2 + Stage 3**

在 `run_pipeline` 中 Stage 1 之后追加：

```python
from .stage2_image import generate_ref_image
from .stage3_style import generate_style_options

# 在 product_info 更新之后：
task = store.update(task_id, stage=TaskStage.REF_IMAGE)
ref_image = await generate_ref_image(store.get(task_id).model_dump())
task = store.update(task_id, ref_image_url=ref_image)

task = store.update(task_id, stage=TaskStage.STYLE_WAIT)
style_options = await generate_style_options(task.product_info)
task = store.update(task_id, style_options=style_options)
# 管线在此暂停，等待用户选择风格（通过 POST /api/tasks/{id}/style 触发继续）
```

- [ ] **步骤 4：添加风格选择 API**

在 `backend/routes.py` 增加：

```python
@router.post("/tasks/{task_id}/style")
async def select_style(task_id: str, style_data: dict):
    task = store.get(task_id)
    if not task: return {"error": "task not found"}, 404
    task = store.update(task_id, selected_style=style_data, stage=TaskStage.SCRIPT_GEN)
    # 继续管线
    import asyncio
    from .pipeline.runner import continue_pipeline
    asyncio.create_task(continue_pipeline(task_id, store))
    return {"task_id": task_id, "stage": task.stage.value}
```

- [ ] **步骤 5：Commit**

```bash
git add -A && git commit -m "feat: Stage 2 参考图 + Stage 3 风格匹配 + 风格选择 API"
```

---

### 任务 6：管线 Stage 4 + Stage 5 — 脚本分镜 + 预览图

**文件：**
- 创建：`backend/pipeline/stage4_script.py`
- 创建：`backend/pipeline/stage5_preview.py`
- 修改：`backend/pipeline/runner.py`
- 修改：`backend/routes.py`

- [ ] **步骤 1：Stage 4 脚本 + 分镜生成**

```python
# backend/pipeline/stage4_script.py
PLATFORM_CONFIG = {
    "tiktok": {"ratio": "9:16", "duration": 30, "tone": "年轻快节奏", "hook_seconds": 3},
    "amazon": {"ratio": "16:9", "duration": 45, "tone": "专业产品展示", "hook_seconds": 5},
    "youtube": {"ratio": "9:16", "duration": 45, "tone": "信息量丰富", "hook_seconds": 3},
    "instagram": {"ratio": "9:16", "duration": 30, "tone": "视觉驱动", "hook_seconds": 2},
}

DEFAULT_SHOT_TEMPLATE = [
    {"shot_type": "wide", "angle": "eye_level", "lighting": "soft_studio", "camera_move": "static",
     "scene": "产品完整展示，品牌感开场", "voiceover": "Introducing the all-new {product_name}.", "subtitle": "全新 {product_name}"},
    {"shot_type": "medium", "angle": "45_degree", "lighting": "natural_window", "camera_move": "slow_push_in",
     "scene": "产品核心卖点特写，突出差异化功能", "voiceover": "With {feature_1}, experience the difference.", "subtitle": "{feature_1}"},
    {"shot_type": "close_up", "angle": "top_down", "lighting": "soft_studio", "camera_move": "static",
     "scene": "关键细节微距展示，材质和工艺", "voiceover": "Built with premium materials that last.", "subtitle": "高品质材质"},
    {"shot_type": "medium", "angle": "eye_level", "lighting": "natural_window", "camera_move": "dolly",
     "scene": "使用场景展示，真人操作或环境融入", "voiceover": "Perfect for your everyday life.", "subtitle": "融入你的生活"},
    {"shot_type": "wide", "angle": "low_hero", "lighting": "dramatic_rim", "camera_move": "slow_pull_out",
     "scene": "产品+CTA，品牌收尾，行动号召", "voiceover": "Get yours today. Link in bio.", "subtitle": "立即购买 ↓"},
]

async def generate_script(product_info: dict, platform: str, style: dict) -> list[dict]:
    """生成单个平台的脚本分镜。MVP 用模板+填充，后续接 LLM 生成。"""
    cfg = PLATFORM_CONFIG.get(platform, PLATFORM_CONFIG["tiktok"])
    title = product_info.get("title", "this product")
    shots = []
    for i, tpl in enumerate(DEFAULT_SHOT_TEMPLATE):
        shot = {
            "number": i + 1,
            "duration": round(cfg["duration"] / len(DEFAULT_SHOT_TEMPLATE), 1),
            "shot_type": tpl["shot_type"],
            "angle": style.get("angle", tpl["angle"]),
            "lighting": style.get("lighting", tpl["lighting"]),
            "camera_move": tpl["camera_move"],
            "scene": tpl["scene"].replace("{product_name}", title).replace("{feature_1}", product_info.get("description", "amazing features")[:50]),
            "voiceover": tpl["voiceover"].replace("{product_name}", title).replace("{feature_1}", product_info.get("description", "amazing features")[:50]),
            "subtitle": tpl["subtitle"].replace("{product_name}", title).replace("{feature_1}", product_info.get("description", "")[:30]),
        }
        shots.append(shot)
    return shots

async def generate_all_scripts(product_info: dict, platforms: list[str], style: dict) -> dict[str, list[dict]]:
    scripts = {}
    for plat in platforms:
        scripts[plat] = await generate_script(product_info, plat, style)
    return scripts
```

- [ ] **步骤 2：Stage 5 分镜预览图**

```python
# backend/pipeline/stage5_preview.py
async def generate_preview_images(task: dict, platform: str) -> list[str]:
    """为每个分镜生成预览图。MVP 返回构造的 prompt 列表，后续接 baoyu-imagine API。
    使用产品参考图作为 reference_image 保证一致性。"""
    scripts = task.get("scripts", {}).get(platform, [])
    style = task.get("selected_style", {})
    ref_image = task.get("ref_image_url", "")

    previews = []
    for shot in scripts:
        prompt = (
            f"{style.get('visual_style', 'clean')} product photography, photorealistic. "
            f"{shot['scene']}. "
            f"{shot['shot_type']}, {shot['angle']} angle, {shot['lighting']} lighting. "
            f"9:16 vertical, product advertising quality."
        )
        # MVP: 写 prompt 到文件，后续批量调 API
        previews.append(prompt)

    return previews  # 后续改为图片 URL/path 列表
```

- [ ] **步骤 3：更新 runner.py 的 continue_pipeline**

```python
# backend/pipeline/runner.py
from .stage4_script import generate_all_scripts
from .stage5_preview import generate_preview_images

async def continue_pipeline(task_id: str, store: InMemoryTaskStore):
    task = store.get(task_id)
    try:
        # Stage 4: 脚本分镜
        task = store.update(task_id, stage=TaskStage.SCRIPT_GEN)
        platforms = [p.value for p in task.platforms]
        scripts = await generate_all_scripts(task.product_info, platforms, task.selected_style)
        task = store.update(task_id, scripts=scripts)
        task = store.update(task_id, stage=TaskStage.PREVIEW_WAIT)

        # Stage 5 的分镜预览在用户确认后执行
        # 等待 POST /api/tasks/{id}/storyboard 触发

    except Exception as e:
        store.update(task_id, stage=TaskStage.FAILED, error=str(e))

async def run_stage5_and_6(task_id: str, store: InMemoryTaskStore):
    task = store.get(task_id)
    try:
        # Stage 5: 分镜预览图
        task = store.update(task_id, stage=TaskStage.PREVIEW_WAIT)
        previews = {}
        for plat in [p.value for p in task.platforms]:
            previews[plat] = await generate_preview_images(task.model_dump(), plat)
        task = store.update(task_id, preview_images=previews)

        # Stage 6: 视频生成（任务 7 实现）
        task = store.update(task_id, stage=TaskStage.VIDEO_GEN)
        # ...

    except Exception as e:
        store.update(task_id, stage=TaskStage.FAILED, error=str(e))
```

- [ ] **步骤 4：添加分镜确认 API**

在 `backend/routes.py` 增加：

```python
@router.post("/tasks/{task_id}/storyboard")
async def confirm_storyboard(task_id: str, data: dict):
    task = store.get(task_id)
    if not task: return {"error": "task not found"}, 404
    import asyncio
    from .pipeline.runner import run_stage5_and_6
    asyncio.create_task(run_stage5_and_6(task_id, store))
    return {"task_id": task_id, "stage": task.stage.value}
```

- [ ] **步骤 5：Commit**

```bash
git add -A && git commit -m "feat: Stage 4 脚本分镜 + Stage 5 预览图 + 分镜确认 API"
```

---

### 任务 7：管线 Stage 6 — Seedance 视频生成

**文件：**
- 创建：`backend/pipeline/stage6_video.py`
- 修改：`backend/pipeline/runner.py`

- [ ] **步骤 1：编写 Seedance API 调用**

```python
# backend/pipeline/stage6_video.py
import httpx
import os

SEEDANCE_API = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks"
SEEDANCE_MODEL = "doubao-seedance-2-0-260128"

async def generate_video(
    task: dict,
    platform: str,
    api_key: str | None = None
) -> str:
    """调用 Seedance 2.0 生成视频。返回视频下载 URL。"""
    key = api_key or os.getenv("SEEDANCE_API_KEY", "")
    if not key:
        return f"__MOCK_VIDEO__:{platform}"

    scripts = task.get("scripts", {}).get(platform, [])
    style = task.get("selected_style", {})
    ref_image = task.get("ref_image_url", "")

    # 构造合并 prompt
    shots_text = "；".join([
        f"{s['duration']}秒：{s['scene']}。字幕：{s['subtitle']}"
        for s in scripts
    ])

    style_prefix = f"{style.get('visual_style', 'clean')} product video, {style.get('camera', 'smooth')} camera, {style.get('lighting', 'soft')} lighting, photorealistic"
    merged_prompt = f"全程{style_prefix}。{shots_text}"

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                SEEDANCE_API,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "model": SEEDANCE_MODEL,
                    "content": [
                        {"type": "text", "text": merged_prompt},
                        {"type": "image_url", "image_url": {"url": ref_image}, "role": "reference_image"}
                        if not ref_image.startswith("__") else {},
                    ],
                    "generate_audio": True,
                    "ratio": "9:16" if platform != "amazon" else "16:9",
                    "duration": sum(s["duration"] for s in scripts),
                    "watermark": False,
                }
            )
            data = resp.json()
            return data.get("data", {}).get("video_url", f"__PENDING__:{data.get('task_id')}")
    except Exception as e:
        return f"__ERROR__:{str(e)}"

async def generate_all_videos(task: dict, platforms: list[str]) -> dict[str, str]:
    videos = {}
    for plat in platforms:
        videos[plat] = await generate_video(task, plat)
    return videos
```

- [ ] **步骤 2：更新 runner.py 完成 Stage 6**

在 `run_stage5_and_6` 的 Stage 5 之后：

```python
from .stage6_video import generate_all_videos

# Stage 6: 视频生成
task = store.update(task_id, stage=TaskStage.VIDEO_GEN)
videos = await generate_all_videos(task.model_dump(), [p.value for p in task.platforms])
task = store.update(task_id, video_urls=videos, stage=TaskStage.DONE)
```

- [ ] **步骤 3：添加视频下载 API**

在 `backend/routes.py` 增加：

```python
@router.get("/tasks/{task_id}/video/{platform}")
async def get_video(task_id: str, platform: str):
    task = store.get(task_id)
    if not task or not task.video_urls:
        return {"error": "video not ready"}, 404
    url = task.video_urls.get(platform)
    if not url:
        return {"error": f"no video for {platform}"}, 404
    return {"video_url": url}
```

- [ ] **步骤 4：Commit**

```bash
git add -A && git commit -m "feat: Stage 6 Seedance 视频生成 + 下载 API"
```

---

### 任务 8：任务进度页 — 前端核心交互

**文件：**
- 创建：`frontend/app/task/[id]/page.tsx`
- 创建：`frontend/components/TaskStage.tsx`
- 创建：`frontend/components/PipelineProgress.tsx`
- 创建：`frontend/components/ProductAnalysis.tsx`
- 创建：`frontend/components/RefImageStage.tsx`
- 创建：`frontend/components/StylePicker.tsx`
- 创建：`frontend/components/StoryboardGallery.tsx`
- 创建：`frontend/components/VideoResult.tsx`

- [ ] **步骤 1：PipelineProgress 组件**

```typescript
// frontend/components/PipelineProgress.tsx
const STAGES = [
  { key: "fetching", label: "产品分析", icon: "🔍" },
  { key: "ref_image", label: "参考图", icon: "📸" },
  { key: "style_wait", label: "选择风格", icon: "🎨" },
  { key: "script_gen", label: "脚本分镜", icon: "📝" },
  { key: "preview_wait", label: "分镜预览", icon: "🖼️" },
  { key: "video_gen", label: "视频生成", icon: "🎬" },
  { key: "done", label: "完成", icon: "✅" },
];

export default function PipelineProgress({ stage }: { stage: string }) {
  const currentIdx = STAGES.findIndex((s) => s.key === stage);
  return (
    <div className="flex items-center gap-2 py-4">
      {STAGES.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
              i <= currentIdx ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {s.icon}
          </div>
          {i < STAGES.length - 1 && (
            <div
              className={`w-8 h-0.5 transition ${
                i < currentIdx ? "bg-blue-600" : "bg-zinc-800"
              }`}
            />
          )}
        </div>
      ))}
      <span className="ml-3 text-sm text-zinc-400">
        {STAGES[currentIdx]?.label || "等待中"}
      </span>
    </div>
  );
}
```

- [ ] **步骤 2：ProductAnalysis 组件**

```typescript
// frontend/components/ProductAnalysis.tsx
export default function ProductAnalysis({ info }: { info: Record<string, any> | null }) {
  if (!info) return <div className="text-zinc-500 animate-pulse">正在分析产品...</div>;
  return (
    <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-700 space-y-3">
      <h3 className="text-lg font-bold">{info.title || "产品分析结果"}</h3>
      {info.price && <p className="text-2xl font-bold text-green-400">{info.price}</p>}
      {info.description && <p className="text-zinc-400 text-sm">{info.description}</p>}
      {info.category_hints?.length > 0 && (
        <div className="flex gap-2 mt-2">
          {info.category_hints.map((c: string) => (
            <span key={c} className="px-2 py-1 rounded bg-zinc-800 text-xs text-zinc-300">{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **步骤 3：StylePicker 组件**

```typescript
// frontend/components/StylePicker.tsx
export default function StylePicker({
  options,
  onSelect,
}: {
  options: Record<string, any>[];
  onSelect: (style: Record<string, any>) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">选择视频风格</h3>
      <div className="grid grid-cols-3 gap-4">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt)}
            className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-blue-500 text-left transition"
          >
            <h4 className="font-bold text-blue-400">{opt.label}</h4>
            <p className="text-sm text-zinc-400 mt-2">{opt.description}</p>
            <div className="mt-3 space-y-1 text-xs text-zinc-500">
              <div>视觉：{opt.visual_style}</div>
              <div>运镜：{opt.camera}</div>
              <div>灯光：{opt.lighting}</div>
              <div>角度：{opt.angle}</div>
              <div>人物：{opt.human}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **步骤 4：StoryboardGallery 组件**

```typescript
// frontend/components/StoryboardGallery.tsx
export default function StoryboardGallery({
  scripts,
  previews,
  platform,
  onConfirm,
}: {
  scripts: Record<string, any[]>;
  previews: Record<string, string[]>;
  platform: string;
  onConfirm: () => void;
}) {
  const shots = scripts[platform] || [];
  const previewImgs = previews[platform] || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">分镜预览 — {platform}</h3>
      <div className="grid grid-cols-2 gap-4">
        {shots.map((shot, i) => (
          <div key={i} className="p-4 rounded-xl bg-zinc-900 border border-zinc-700">
            <div className="aspect-[9/16] bg-zinc-800 rounded-lg mb-3 flex items-center justify-center text-zinc-500">
              {previewImgs[i] ? (
                <img src={previewImgs[i]} alt={`Shot ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
              ) : (
                `分镜 ${i + 1}`
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">{shot.subtitle}</p>
            <p className="text-xs text-zinc-500">{shot.duration}s · {shot.shot_type}</p>
          </div>
        ))}
      </div>
      <button
        onClick={onConfirm}
        className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold transition"
      >
        确认分镜，开始生成视频
      </button>
    </div>
  );
}
```

- [ ] **步骤 5：VideoResult 组件**

```typescript
// frontend/components/VideoResult.tsx
export default function VideoResult({ videos }: { videos: Record<string, string> }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-green-400">✅ 视频生成完成</h3>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(videos).map(([platform, url]) => (
          <a
            key={platform}
            href={url.startsWith("http") ? url : "#"}
            download
            className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-blue-500 transition text-center"
          >
            <div className="text-2xl mb-2">
              {platform === "tiktok" ? "🎵" : platform === "amazon" ? "📦" : platform === "youtube" ? "▶️" : "📱"}
            </div>
            <div className="font-bold capitalize">{platform}</div>
            <div className="text-xs text-zinc-500 mt-1">点击下载</div>
          </a>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **步骤 6：TaskStage 路由组件**

```typescript
// frontend/components/TaskStage.tsx
import ProductAnalysis from "./ProductAnalysis";
import RefImageStage from "./RefImageStage";
import StylePicker from "./StylePicker";
import StoryboardGallery from "./StoryboardGallery";
import VideoResult from "./VideoResult";

export default function TaskStage({
  task,
  onSelectStyle,
  onConfirmStoryboard,
}: {
  task: any;
  onSelectStyle: (s: any) => void;
  onConfirmStoryboard: () => void;
}) {
  const { stage, product_info, style_options, scripts, preview_images, video_urls } = task;

  switch (stage) {
    case "fetching":
      return <ProductAnalysis info={null} />;
    case "ref_image":
      return (
        <div className="space-y-4">
          <ProductAnalysis info={product_info} />
          <RefImageStage refImageUrl={task.ref_image_url} uploadedPath={task.uploaded_ref_image} />
        </div>
      );
    case "style_wait":
      return style_options ? (
        <StylePicker options={style_options} onSelect={onSelectStyle} />
      ) : (
        <div className="text-zinc-400">正在生成风格选项...</div>
      );
    case "script_gen":
      return <div className="text-zinc-400 animate-pulse">正在生成脚本和分镜...</div>;
    case "preview_wait":
      return scripts ? (
        <StoryboardGallery
          scripts={scripts}
          previews={preview_images || {}}
          platform="tiktok"
          onConfirm={onConfirmStoryboard}
        />
      ) : (
        <div className="text-zinc-400">正在生成分镜预览...</div>
      );
    case "video_gen":
      return <div className="text-zinc-400 animate-pulse">🎬 Seedance 正在生成视频，预计 2-5 分钟...</div>;
    case "done":
      return video_urls ? <VideoResult videos={video_urls} /> : <div className="text-zinc-400">完成</div>;
    case "failed":
      return <div className="text-red-400">❌ 任务失败：{task.error}</div>;
    default:
      return <div className="text-zinc-400 animate-pulse">正在初始化...</div>;
  }
}
```

- [ ] **步骤 7：任务进度页**

```typescript
// frontend/app/task/[id]/page.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getTask, submitStyle, confirmStoryboard } from "@/lib/api";
import PipelineProgress from "@/components/PipelineProgress";
import TaskStage from "@/components/TaskStage";

export default function TaskPage() {
  const params = useParams();
  const taskId = params.id as string;
  const [task, setTask] = useState<any>(null);

  const poll = useCallback(async () => {
    const data = await getTask(taskId);
    setTask(data);
    if (data.stage === "done" || data.stage === "failed") return;
    // 继续轮询（非阻塞状态）
    if (!["style_wait", "preview_wait"].includes(data.stage)) {
      setTimeout(poll, 2000);
    }
  }, [taskId]);

  useEffect(() => {
    poll();
  }, [poll]);

  const handleStyleSelect = async (style: Record<string, any>) => {
    await submitStyle(taskId, style);
    setTask((prev: any) => ({ ...prev, stage: "script_gen" }));
    setTimeout(poll, 1000);
  };

  const handleStoryboardConfirm = async () => {
    await confirmStoryboard(taskId);
    setTask((prev: any) => ({ ...prev, stage: "video_gen" }));
    setTimeout(poll, 1000);
  };

  if (!task) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400 animate-pulse">加载中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <PipelineProgress stage={task.stage} />
        <TaskStage
          task={task}
          onSelectStyle={handleStyleSelect}
          onConfirmStoryboard={handleStoryboardConfirm}
        />
      </div>
    </main>
  );
}
```

- [ ] **步骤 8：RefImageStage 组件**

```typescript
// frontend/components/RefImageStage.tsx
export default function RefImageStage({
  refImageUrl,
  uploadedPath,
}: {
  refImageUrl: string | null;
  uploadedPath: string | null;
}) {
  const isUploaded = uploadedPath && !uploadedPath.startsWith("__AI_GEN__");
  return (
    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700">
      <h4 className="text-sm font-bold mb-2">产品参考图</h4>
      {isUploaded ? (
        <div className="text-green-400 text-sm">✅ 使用你上传的产品图</div>
      ) : refImageUrl?.startsWith("__AI_GEN__:") ? (
        <div className="text-blue-400 text-sm">🤖 AI 正在生成白底商品图...<br /><span className="text-zinc-500 text-xs">{refImageUrl.replace("__AI_GEN__:", "")}</span></div>
      ) : refImageUrl ? (
        <img src={refImageUrl} alt="Reference" className="w-48 h-48 object-cover rounded-lg" />
      ) : (
        <div className="text-zinc-500 animate-pulse">等待参考图...</div>
      )}
    </div>
  );
}
```

- [ ] **步骤 9：验证前端页面**

```bash
cd frontend && npm run dev
# 打开 http://localhost:3000
# 粘贴测试链接，选择平台，点击开始
# 预期：跳转到 /task/xxx 并看到 PipelineProgress + 当前 Stage 内容
```

- [ ] **步骤 10：Commit**

```bash
git add -A && git commit -m "feat: 任务进度页 + 全部前端组件（PipelineProgress / StylePicker / StoryboardGallery / VideoResult）"
```

---

### 任务 9：端到端串联 + 错误处理

**文件：**
- 修改：`backend/pipeline/runner.py`

- [ ] **步骤 1：完善 runner.py 错误处理与日志**

```python
# backend/pipeline/runner.py 完整版
import asyncio
import logging
from ..task_manager import InMemoryTaskStore
from ..models import TaskStage
from .stage1_fetch import fetch_product_info
from .stage2_image import generate_ref_image
from .stage3_style import generate_style_options
from .stage4_script import generate_all_scripts
from .stage5_preview import generate_preview_images
from .stage6_video import generate_all_videos

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_pipeline(task_id: str, store: InMemoryTaskStore):
    """Stage 1-3：从创建任务到等待风格选择"""
    try:
        task = store.get(task_id)
        logger.info(f"[{task_id}] Stage 1: Fetching product info from {task.product_url}")
        store.update(task_id, stage=TaskStage.FETCHING)
        product_info = await fetch_product_info(task.product_url)
        if product_info.get("error"):
            raise Exception(product_info["error"])
        store.update(task_id, product_info=product_info, stage=TaskStage.REF_IMAGE)

        logger.info(f"[{task_id}] Stage 2: Generating reference image")
        task_dict = store.get(task_id).model_dump()
        ref_image = await generate_ref_image(task_dict)
        store.update(task_id, ref_image_url=ref_image)

        logger.info(f"[{task_id}] Stage 3: Generating style options")
        style_options = await generate_style_options(product_info)
        store.update(task_id, style_options=style_options, stage=TaskStage.STYLE_WAIT)

    except Exception as e:
        logger.error(f"[{task_id}] Pipeline error: {e}")
        store.update(task_id, stage=TaskStage.FAILED, error=str(e)[:500])


async def continue_pipeline(task_id: str, store: InMemoryTaskStore):
    """Stage 4：风格确认后 → 生成脚本分镜"""
    try:
        task = store.get(task_id)
        logger.info(f"[{task_id}] Stage 4: Generating scripts")
        store.update(task_id, stage=TaskStage.SCRIPT_GEN)
        platforms = [p.value for p in task.platforms]
        scripts = await generate_all_scripts(task.product_info, platforms, task.selected_style.model_dump())
        store.update(task_id, scripts=scripts, stage=TaskStage.PREVIEW_WAIT)

    except Exception as e:
        logger.error(f"[{task_id}] Pipeline error at script gen: {e}")
        store.update(task_id, stage=TaskStage.FAILED, error=str(e)[:500])


async def run_stage5_and_6(task_id: str, store: InMemoryTaskStore):
    """Stage 5-6：分镜确认后 → 预览图 + 视频"""
    try:
        task = store.get(task_id)
        task_dict = task.model_dump()
        platforms = [p.value for p in task.platforms]

        logger.info(f"[{task_id}] Stage 5: Generating preview images")
        previews = {}
        for plat in platforms:
            previews[plat] = await generate_preview_images(task_dict, plat)
        store.update(task_id, preview_images=previews)

        logger.info(f"[{task_id}] Stage 6: Generating videos via Seedance")
        store.update(task_id, stage=TaskStage.VIDEO_GEN)
        videos = await generate_all_videos(task_dict, platforms)
        store.update(task_id, video_urls=videos, stage=TaskStage.DONE)
        logger.info(f"[{task_id}] Pipeline complete!")

    except Exception as e:
        logger.error(f"[{task_id}] Pipeline error at video gen: {e}")
        store.update(task_id, stage=TaskStage.FAILED, error=str(e)[:500])
```

- [ ] **步骤 2：验证端到端流程**

```bash
# 启动后端
cd backend && source venv/bin/activate && uvicorn main:app --port 8000 &
# 启动前端
cd frontend && npm run dev &
# 测试创建任务
curl -X POST http://localhost:8000/api/tasks -F "url=https://www.amazon.com/dp/B0FXGX9KYJ" -F "platforms=tiktok,amazon"
# 拿到 task_id，打开 http://localhost:3000/task/{task_id}
# 预期：看到 Stage 1→2→3 自动推进，到 style_wait 停止等待选择
```

- [ ] **步骤 3：Commit**

```bash
git add -A && git commit -m "feat: 端到端管线串联 + 错误处理 + 日志"
```

---

### 任务 10：最后的清理和文档

**文件：**
- 创建：`CLAUDE.md`（项目级）
- 创建：`README.md`

- [ ] **步骤 1：编写项目 CLAUDE.md**

```markdown
# CLAUDE.md — TVS Video Tool

## 项目
跨境电商 AI 带货视频生成 Web 应用。

## 技术栈
- 前端：Next.js (App Router) + Tailwind CSS
- 后端：Python FastAPI
- 视频生成：Seedance 2.0 API

## 启动
```bash
# 后端
cd backend && source venv/bin/activate && uvicorn main:app --port 8000 --reload

# 前端
cd frontend && npm run dev
```

## 项目结构
- `frontend/` — Next.js 前端
- `backend/` — FastAPI 后端 + AI 管线
- `backend/pipeline/` — 6 Stage 管线（stage1_fetch → stage6_video）
```

- [ ] **步骤 2：编写 README.md**

```markdown
# TVS Video Tool

粘贴产品链接 → 选风格 → 确认分镜 → AI 生成多平台带货视频。

## 支持平台
- TikTok / TikTok Shop
- Amazon 主图视频
- YouTube Shorts
- Instagram Reels

## 快速开始
1. `cd backend && pip install -r requirements.txt && uvicorn main:app --port 8000`
2. `cd frontend && npm install && npm run dev`
3. 打开 http://localhost:3000
```

- [ ] **步骤 3：最终提交**

```bash
git add -A && git commit -m "docs: CLAUDE.md + README.md"
```

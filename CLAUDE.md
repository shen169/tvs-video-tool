# CLAUDE.md — TVS Video Tool

## 项目
跨境电商 AI 带货视频生成 Web 应用。粘贴产品链接 → AI 分析 → 选风格 → 确认分镜 → Seedance 出片。

## 技术栈
- 前端：Next.js (App Router) + Tailwind CSS
- 后端：Python FastAPI
- 视频：Seedance 2.0

## 启动
```bash
# 后端（必须从项目根目录启动，否则相对导入会失败）
cd backend && source venv/bin/activate && cd .. && uvicorn backend.main:app --port 8000 --reload

# 前端
cd frontend && npm run dev
```

## 环境变量
- `SEEDANCE_API_KEY` — 设置后调用 Seedance 2.0 真实 API；不设置则返回 mock 视频 URL

## 项目结构
- `frontend/` — Next.js 前端（首页 + 任务进度页）
- `backend/` — FastAPI 后端 + AI 管线
- `backend/pipeline/` — 6 Stage 管线
  - `stage1_fetch.py` — 产品页面抓取与结构化提取
  - `stage2_image.py` — 参考图生成
  - `stage3_style.py` — 风格选项匹配
  - `stage4_script.py` — 分平台脚本分镜生成
  - `stage5_preview.py` — 分镜预览图 prompt 生成
  - `stage6_video.py` — Seedance 2.0 视频生成（mock/真实）
  - `runner.py` — 管线编排器

## API 端点
| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/tasks` | 创建任务（url + platforms） |
| GET | `/api/tasks/{id}` | 查询任务状态 |
| POST | `/api/tasks/{id}/ref-image` | 上传自定义参考图 |
| POST | `/api/tasks/{id}/style` | 选择视频风格 |
| POST | `/api/tasks/{id}/storyboard` | 确认分镜，触发生成 |
| GET | `/api/health` | 健康检查 |

## 管线阶段流转
```
pending → fetching → ref_image → style_wait → script_gen → preview_wait → video_gen → done
                                                                         ↘ failed
```

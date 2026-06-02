# TVS Video Tool

粘贴产品链接 → 选风格 → 确认分镜 → AI 生成多平台带货视频。

## 支持平台
- TikTok / TikTok Shop
- Amazon 主图视频
- YouTube Shorts
- Instagram Reels

## 快速开始
```bash
# 1. 后端
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cd .. && uvicorn backend.main:app --port 8000 --reload

# 2. 前端
cd frontend && npm install && npm run dev

# 3. 打开 http://localhost:3000
```

## 管线流程
1. **抓取分析** — 输入产品链接，自动抓取标题、描述、价格、图片
2. **风格推荐** — AI 分析品类，推荐 3 套视频风格组合（5 维度）
3. **脚本分镜** — 按平台生成 5 镜分镜脚本（景别、运镜、旁白、字幕）
4. **预览确认** — 分镜预览图确认画面构图
5. **视频生成** — 调用 Seedance 2.0 一键出片
6. **结果展示** — 各平台视频下载/预览

## 视频风格维度
| 维度 | 选项 |
|------|------|
| 视觉风格 | 简约干净 / 生活温馨 / 科技未来 |
| 运镜方式 | 电影感平滑 / 动感手持 / 微距细节 |
| 灯光方案 | 柔光棚拍 / 自然窗光 / 戏剧轮廓光 |
| 拍摄角度 | 平视 / 俯拍 / 仰拍英雄 |
| 人物方案 | 无人物 / 手部出镜 / 人物出镜 |

## 环境变量
| 变量 | 说明 |
|------|------|
| `SEEDANCE_API_KEY` | Seedance 2.0 API 密钥（不设置则返回 mock 视频 URL） |

## 技术栈
- 前端：Next.js 15 + React 18 + Tailwind CSS 4
- 后端：Python 3.12 + FastAPI + httpx
- 视频生成：Seedance 2.0 (doubao-seedance-2-0-260128)

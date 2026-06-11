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

# 自动创建 admin 用户（用于密码登录）
ADMIN_EMAIL = "admin@tvs.internal"
ADMIN_PASSWORD = os.getenv("ACCESS_PASSWORD", "tvs2024")
if not user_store.get_by_email(ADMIN_EMAIL):
    user_store.create(ADMIN_EMAIL, ADMIN_PASSWORD)
    # 赠 999 点给 admin（密码用户共享此账户）
    admin = user_store.get_by_email(ADMIN_EMAIL)
    user_store.add_credits(admin.id, 999)

# 注入 auth / webhook / routes
init_auth(user_store)
init_webhook(user_store, credit_store)

from .routes import router, init_routes, init_payment_stores
init_routes(store)
init_payment_stores(user_store, credit_store)
app.include_router(router)

# ── 认证路由 ──
from fastapi import APIRouter as _APIRouter, Depends as _Depends, HTTPException as _HTTPException
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


@auth_router.post("/password-login")
async def password_login(body: _LoginBody):
    """密码登录 — 用 ACCESS_PASSWORD 验证，返回 admin 用户 JWT。"""
    access_pwd = os.getenv("ACCESS_PASSWORD", "tvs2024")
    if body.password != access_pwd:
        raise _HTTPException(401, detail="Invalid password")
    user = user_store.get_by_email(ADMIN_EMAIL)
    if not user:
        raise _HTTPException(500, detail="Admin user not found")
    token = create_token(user)
    return {"token": token, "user": {"id": user.id, "email": user.email, "credits": user.credits}}


@auth_router.get("/me")
async def me(user=_Depends(get_current_user)):
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
async def credit_history(user=_Depends(get_current_user)):
    txs = credit_store.get_by_user(user.id, limit=50)
    return [tx.model_dump() for tx in txs]


app.include_router(credits_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}

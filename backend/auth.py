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

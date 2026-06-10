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

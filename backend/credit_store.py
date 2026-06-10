"""点数流水存储（JSON 文件持久化 + 线程安全）."""

import json
import os
import uuid
import threading
from datetime import datetime, timezone
from .models import CreditTransaction, TransactionType


class CreditStore:
    def __init__(self, storage_dir: str = "output/credits"):
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        self._transactions: dict[str, CreditTransaction] = {}
        self._by_user: dict[str, list[str]] = {}
        self._seen_stripe: set[str] = set()  # stripe_session_id 去重
        self._lock = threading.Lock()
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

    def add(self, user_id: str, amount: int, type_: TransactionType | str,
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
        with self._lock:
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

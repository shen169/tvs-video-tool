"""Stripe Webhook — 验签 + 充值."""

import os
import stripe
from fastapi import APIRouter, Request, HTTPException
from .user_store import UserStore
from .credit_store import CreditStore
import logging

logger = logging.getLogger(__name__)

_user_store: UserStore | None = None
_credit_store: CreditStore | None = None
router = APIRouter(prefix="/api/stripe")


def init_webhook(user_store: UserStore, credit_store: CreditStore):
    global _user_store, _credit_store
    _user_store = user_store
    _credit_store = credit_store


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """处理 Stripe 回调事件。"""
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if webhook_secret:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            raise HTTPException(400, detail=f"Webhook validation failed: {e}")
    else:
        # 本地测试：跳过验签
        import json
        event = json.loads(payload)

    if event["type"] != "checkout.session.completed":
        return {"status": "ignored", "type": event["type"]}

    session = event["data"]["object"]
    session_id = session.get("id", "")
    metadata = session.get("metadata", {})
    user_id = metadata.get("user_id", "")
    credits_str = metadata.get("credits", "0")

    if not user_id or not credits_str:
        logger.error(f"Webhook missing metadata: {session_id}")
        return {"status": "error", "detail": "missing metadata"}

    credits = int(credits_str)

    # 原子 check-and-add：拿锁后重新检查去重，防止竞态双充
    # 注意：_credit_store.add() 内部有锁，但 is_stripe_duplicate() 无锁
    # 解决方案：先 add（内部锁 + 写入 _seen_stripe），再读回确认
    # 但 add 在重复时不会阻塞——改用 credit_store 的锁显式保护
    user = _user_store.get(user_id)
    if not user:
        logger.error(f"Webhook user not found: {user_id}")
        return {"status": "error", "detail": "user not found"}

    with _credit_store._lock:
        if session_id in _credit_store._seen_stripe:
            logger.info(f"Duplicate webhook ignored: {session_id}")
            return {"status": "duplicate", "session_id": session_id}
        _credit_store._seen_stripe.add(session_id)

    _user_store.add_credits(user_id, credits)
    _credit_store.add(
        user_id=user_id,
        amount=credits,
        type_="topup",
        stripe_session_id=session_id,
    )

    logger.info(f"Webhook: user={user.email} +{credits} credits (session={session_id})")
    return {"status": "ok", "credits_added": credits}

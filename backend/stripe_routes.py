"""Stripe Checkout 端点."""

import os
import stripe
from fastapi import APIRouter, Depends, HTTPException
from .auth import get_current_user
from .models import User
from .config import PRICING_PLANS, STRIPE_CURRENCY

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
router = APIRouter(prefix="/api/credits")


@router.get("/prices")
async def get_prices(user: User = Depends(get_current_user)):
    """返回可用套餐列表。"""
    return {
        "plans": PRICING_PLANS,
        "currency": STRIPE_CURRENCY,
        "balance": user.credits,
    }


@router.post("/checkout")
async def create_checkout(data: dict, user: User = Depends(get_current_user)):
    """创建 Stripe Checkout Session，返回支付 URL。"""
    plan_id = data.get("plan_id", "")
    plan = next((p for p in PRICING_PLANS if p["id"] == plan_id), None)
    if not plan:
        raise HTTPException(400, detail=f"Unknown plan: {plan_id}")

    success_url = data.get("success_url", f"{os.getenv('BASE_URL', 'http://localhost:3000')}/credits?success=true")
    cancel_url = data.get("cancel_url", f"{os.getenv('BASE_URL', 'http://localhost:3000')}/credits?canceled=true")

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": STRIPE_CURRENCY,
                    "product_data": {
                        "name": plan["name"],
                        "description": f"生成 {plan['videos']} 个视频 · {plan['credits']} 点 · {plan['quality']}",
                    },
                    "unit_amount": plan["price_cents"],
                },
                "quantity": 1,
            }],
            metadata={
                "user_id": user.id,
                "credits": str(plan["credits"]),
                "plan_id": plan["id"],
            },
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return {"url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(500, detail=f"Stripe error: {e.user_message or str(e)}")

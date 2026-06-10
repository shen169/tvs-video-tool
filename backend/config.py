"""点数套餐配置 + 系统常量."""

PRICING_PLANS = [
    {
        "id": "plan_9",
        "name": "入门 · 9 点",
        "credits": 9,
        "videos": 3,
        "price_cents": 6900,   # ¥69
        "quality": "1080p",
    },
    {
        "id": "plan_30",
        "name": "标准 · 30 点",
        "credits": 30,
        "videos": 10,
        "price_cents": 19900,  # ¥199
        "quality": "1080p",
    },
    {
        "id": "plan_90",
        "name": "专业 · 90 点",
        "credits": 90,
        "videos": 30,
        "price_cents": 49900,  # ¥499
        "quality": "720p",
    },
]

# 每平台视频扣点数
CREDITS_PER_PLATFORM = 3

# Stripe 货币
STRIPE_CURRENCY = "cny"

# JWT 过期时间（天）
JWT_EXPIRE_DAYS = 30

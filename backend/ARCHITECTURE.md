# Backend Architecture

React/Vite → FastAPI `/api/v1` → service layer → SQLAlchemy ORM → SQLite locally / PostgreSQL in production.

Routes handle HTTP concerns. Services own business rules. Models own persistence. Schemas own validation/serialization. Authentication and authorization are centralized dependencies.

Affiliate lifecycle:
Application → Review → Approval → Affiliate ID → Referral Code → Referral Link → Tracking → Lead → Counselling → Enrollment → Commission → Validation → Payout → Analytics.

Extension points are intentionally kept for Redis/Celery, CRM, WhatsApp, email, payment providers, aggregated analytics, campaigns, coupons, affiliate tiers, bonuses and fraud detection.

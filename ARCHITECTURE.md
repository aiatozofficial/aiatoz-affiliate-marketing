# AI A to Z Affiliate Platform — Full-Stack Architecture

## Layers

React/Vite public entry point
→ REST API (`/api/v1`)
→ FastAPI route layer
→ service/business layer
→ SQLAlchemy ORM
→ SQLite locally / PostgreSQL in production

## Core lifecycle

Visitor → Affiliate Application → Admin Review → Approval → Affiliate Account → Affiliate ID → Referral Code → Referral Link → Tracking → Lead → Counselling → Enrollment → Commission → Validation → Approval → Payout → Performance Analytics

## Design principles

- Presentation and business logic are separated.
- Commission/payout rules are backend-owned and configurable.
- Financial values use Decimal/NUMERIC and historical snapshots.
- Affiliate ownership is derived from authentication, not client-supplied IDs.
- Critical events and administrative changes are auditable.
- Database migrations use Alembic.
- SQLite/PostgreSQL differences are confined to configuration/driver concerns.
- APIs are versioned and suitable for independent frontend/backend deployment.
- Extension points exist for CRM, WhatsApp, email, payments, Redis/workers, campaign expansion, tiers, coupons, fraud detection and aggregated analytics.

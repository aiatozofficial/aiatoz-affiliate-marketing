# Database Architecture

Local development uses SQLite through `DATABASE_URL=sqlite:///./affiliate.db`. Production uses PostgreSQL through `postgresql+psycopg://...`. SQLAlchemy is the portability boundary; business services never branch on the database engine.

Core chain: Affiliate → Referral → Lead → Counselling → Enrollment → Commission → Payout.

Financial records use NUMERIC/Decimal snapshots so historical commissions remain traceable even if course prices or commission rules change.

Alembic is the only production schema migration mechanism.

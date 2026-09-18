# AI A to Z Affiliate Platform Backend

Production-oriented FastAPI backend for the AI A to Z Affiliate Platform.

## Local setup

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic revision --autogenerate -m "initial affiliate schema"
alembic upgrade head
python -m scripts.seed_demo
uvicorn app.main:app --reload
```

API: http://localhost:8000
Docs: http://localhost:8000/docs

## SQLite → PostgreSQL

Keep the application code unchanged. Set `DATABASE_URL` to a PostgreSQL psycopg URL in production and run `alembic upgrade head`.

## Seed credentials

Development seed reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from environment settings. Change these before using the seed outside local development.

## Tests

```bash
pytest -q
```

## Production principles

- no plaintext passwords
- JWT authentication and role-based access control
- server-side validation
- Decimal/Numeric financial values
- auditability and immutable financial history patterns
- database constraints and indexes
- pagination
- stateless application design
- environment-based configuration
- no secrets committed

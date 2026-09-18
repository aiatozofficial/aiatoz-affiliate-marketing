import time, uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.logging import configure_logging, logger
from .core.exceptions import register_exception_handlers
from .api.v1.router import api_router
from .api.v1.referrals import redirect as referral_redirect
from .core.database import Base, engine
# import models so tables are registered (ensures PasswordResetToken is created)
from .models import models as _models  # noqa: F401
configure_logging(settings.log_level)
# ensure password_reset_tokens table exists (for sqlite dev without alembic)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    logger.warning("create_all failed: %s", e)
app=FastAPI(title="AI A to Z Affiliate Platform API",version="1.0.0",description="Scalable affiliate management API for AI A to Z.")
app.add_middleware(CORSMiddleware,allow_origins=settings.cors_list,allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
@app.middleware("http")
async def request_context(request:Request,call_next):
    rid=str(uuid.uuid4()); start=time.perf_counter(); response=await call_next(request); response.headers["X-Request-ID"]=rid; response.headers["X-Process-Time-Ms"]=str(round((time.perf_counter()-start)*1000,2)); return response
register_exception_handlers(app)
app.include_router(api_router)
app.add_api_route("/r/{code}", referral_redirect, methods=["GET"], include_in_schema=False)
@app.get("/health",tags=["Health"])
def health(): return {"status":"ok"}
@app.get("/readiness",tags=["Health"])
def readiness(): return {"status":"ready"}

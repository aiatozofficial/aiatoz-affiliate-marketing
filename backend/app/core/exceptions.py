from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from .logging import logger

class BusinessError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details=None):
        self.code, self.message, self.status_code, self.details = code, message, status_code, details

def register_exception_handlers(app):
    @app.exception_handler(BusinessError)
    async def business_error(_: Request, exc: BusinessError):
        return JSONResponse(status_code=exc.status_code, content={"success": False, "error": {"code": exc.code, "message": exc.message, "details": exc.details or {}}})
    @app.exception_handler(IntegrityError)
    async def integrity_error(_: Request, exc: IntegrityError):
        logger.warning("database_integrity_error", extra={"error": str(exc.orig)})
        return JSONResponse(status_code=409, content={"success": False, "error": {"code": "CONFLICT", "message": "The requested record conflicts with existing data.", "details": {}}})
    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error(request: Request, exc: SQLAlchemyError):
        logger.exception("database_error", extra={"path": request.url.path})
        return JSONResponse(status_code=503, content={"success": False, "error": {"code": "DATABASE_UNAVAILABLE", "message": "The service is temporarily unavailable. Please try again in a moment.", "details": {}}})
    @app.exception_handler(StarletteHTTPException)
    async def http_error(_: Request, exc: StarletteHTTPException):
        # Normalise FastAPI/Starlette HTTP errors (404, 405, ...) to the same
        # structured shape the frontend understands.
        message = exc.detail if isinstance(exc.detail, str) and exc.detail else "Request failed."
        return JSONResponse(status_code=exc.status_code, content={"success": False, "error": {"code": "HTTP_ERROR", "message": message, "details": {"status_code": exc.status_code}}})
    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, exc: Exception):
        # Last-resort guard: never leak a bare {"detail": ...} 500 or traceback
        # to clients (e.g. during sign in / sign up). Always structured JSON.
        logger.exception("unhandled_error", extra={"path": request.url.path})
        return JSONResponse(status_code=500, content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": "Something went wrong on our side. Please try again in a moment.", "details": {}}})

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
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

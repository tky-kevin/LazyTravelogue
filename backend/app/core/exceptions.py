from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from app.core.logging import logger
import traceback

async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "message": str(exc)},
    )

async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(f"HTTP exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

def setup_exception_handlers(app):
    app.add_exception_handler(Exception, global_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)

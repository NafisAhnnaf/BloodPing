import sys
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db_pool, db_pool
from app.middlewares.auth_middleware import JWTAuthMiddleware
from app.routers import (
    user_router,
    donor_router,
    recipient_router,
    admin_router,
    request_router,
    match_router,
    session_router,
    leaderboard_router,
    notifications_router,
)


import importlib.util

# Dynamically load compare_schema only if present locally (development environment)
schema_script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../database/compare_schema.py'))
verify_schema = None

if os.path.isfile(schema_script_path):
    try:
        spec = importlib.util.spec_from_file_location("compare_schema", schema_script_path)
        if spec and spec.loader:
            compare_schema = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(compare_schema)
            verify_schema = getattr(compare_schema, "main", None)
    except Exception as e:
        pass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up BloodPing API...")
    init_db_pool()
    
    # Audit database schema validity against definition files in local development
    if verify_schema and not os.getenv("VERCEL"):
        logger.info("Verifying database schema...")
        try:
            verify_schema()
        except SystemExit:
            logger.warning("Database schema verification exited with SystemExit. Continuing startup.")
        except Exception as e:
            logger.warning(f"Database schema verification warning: {e}")
        
    yield
    if db_pool is not None:
        db_pool.closeall()
        logger.info("Database connection pool closed.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for BloodPing using a Fat Database architecture.",
    version="1.0.0",
    lifespan=lifespan,
)

# JWT Authentication Middleware
app.add_middleware(JWTAuthMiddleware)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(user_router.router)
app.include_router(donor_router.router)
app.include_router(recipient_router.router)
app.include_router(admin_router.router)
app.include_router(request_router.router)
app.include_router(match_router.router)
app.include_router(session_router.router)
app.include_router(leaderboard_router.router)
app.include_router(notifications_router.router)


@app.get("/")
def root():
    return {"message": f"Welcome to the {settings.PROJECT_NAME}"}

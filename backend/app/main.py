import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db_pool, db_pool

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up BloodPing API...")
    init_db_pool()
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

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": f"Welcome to the {settings.PROJECT_NAME}"}

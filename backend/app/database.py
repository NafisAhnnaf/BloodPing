import psycopg2
from psycopg2 import pool
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# Global variable for the connection pool
db_pool = None

def init_db_pool():
    """Initialize the ThreadedConnectionPool for psycopg2."""
    global db_pool
    try:
        db_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=settings.DATABASE_URL
        )
        if db_pool:
            logger.info("Database connection pool created successfully")
    except Exception as e:
        logger.error(f"Error creating connection pool: {e}")
        raise e

def get_db_connection():
    """
    FastAPI Dependency to get a database connection from the pool.
    Yields a connection that should be used for DB operations.
    Returns it to the pool when done.
    """
    if db_pool is None:
        raise Exception("Database connection pool is not initialized.")
    
    conn = db_pool.getconn()
    try:
        yield conn
    finally:
        db_pool.putconn(conn)

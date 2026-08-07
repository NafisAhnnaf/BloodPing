import logging
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException, status
from contextlib import contextmanager
from app.config import settings

logger = logging.getLogger(__name__)

# Global variable for the connection pool
db_pool: pool.ThreadedConnectionPool | None = None


def init_db_pool() -> None:
    """Initialize the ThreadedConnectionPool for psycopg2 and verify the connection."""
    global db_pool
    
    # Enforce session connection (port 5432 is session/direct, port 6543 is transaction in Supabase)
    if ":6543" in settings.DATABASE_URL:
        raise ValueError(
            "Database URL specifies port 6543 (transaction pooling). "
            "A session connection (typically port 5432) is required."
        )

    try:
        db_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=settings.DATABASE_URL,
            cursor_factory=RealDictCursor,  # Returns rows as dictionary objects
        )
        if db_pool:
            logger.info("Database connection pool created successfully.")
            
            # Execute database connection check on startup
            conn = db_pool.getconn()
            try:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1;")
                    cursor.fetchone()
                logger.info("Database connection check passed: SELECT 1 succeeded.")
            except Exception as conn_err:
                logger.critical(f"Database connection check failed on startup: {conn_err}")
                raise conn_err
            finally:
                db_pool.putconn(conn)
    except Exception as e:
        logger.error(f"Error creating connection pool: {e}")
        raise e


@contextmanager
def get_db_connection():
    """FastAPI Dependency to yield a database connection from the pool.

    Automatically handles connection cleanup and rollback on failure.
    """
    if db_pool is None:
        logger.critical("Attempted DB access before pool initialization.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection pool is not initialized.",
        )

    conn = db_pool.getconn()
    try:
        yield conn
    except Exception as e:
        conn.rollback()
        logger.error(f"Transaction failed and was rolled back: {e}")
        raise e
    finally:
        db_pool.putconn(conn)

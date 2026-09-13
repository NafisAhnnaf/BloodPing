import logging
import atexit
import psycopg2
from psycopg2 import pool, extensions
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
        # Close existing pool if re-initializing (e.g. during live reload)
        if db_pool is not None:
            close_db_pool()

        db_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=settings.DB_POOL_MIN_CONN,
            maxconn=settings.DB_POOL_MAX_CONN,
            dsn=settings.DATABASE_URL,
            cursor_factory=RealDictCursor,  # Returns rows as dictionary objects
        )
        if db_pool:
            logger.info(
                f"Database connection pool created successfully (minconn={settings.DB_POOL_MIN_CONN}, maxconn={settings.DB_POOL_MAX_CONN})."
            )
            
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


def close_db_pool() -> None:
    """Close all connections in the pool and reset db_pool."""
    global db_pool
    if db_pool is not None:
        try:
            db_pool.closeall()
            logger.info("Database connection pool closed successfully.")
        except Exception as e:
            logger.warning(f"Error closing database pool: {e}")
        finally:
            db_pool = None


# Automatically clean up pooled connections on process exit
atexit.register(close_db_pool)


@contextmanager
def get_db_connection():
    """FastAPI Dependency to yield a database connection from the pool.

    Automatically handles connection cleanup and rollback on uncommitted transactions or failure.
    """
    if db_pool is None:
        logger.critical("Attempted DB access before pool initialization.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection pool is not initialized.",
        )

    try:
        conn = db_pool.getconn()
    except Exception as e:
        logger.error(f"Failed to acquire DB connection from pool: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection pool exhausted. Please retry in a moment.",
        )

    try:
        yield conn
    except Exception as e:
        if conn and not conn.closed:
            try:
                conn.rollback()
            except Exception:
                pass
        logger.error(f"Transaction failed and was rolled back: {e}")
        raise e
    finally:
        if conn and not conn.closed:
            # Rollback any uncommitted transaction (e.g. from read-only SELECT queries or aborted blocks)
            # so the connection is returned in IDLE state to prevent "idle in transaction" connection leaks.
            try:
                txn_status = conn.get_transaction_status()
                if txn_status in (
                    extensions.TRANSACTION_STATUS_INTRANS,
                    extensions.TRANSACTION_STATUS_INERROR,
                ):
                    conn.rollback()
            except Exception as rollback_err:
                logger.warning(f"Error resetting connection transaction status: {rollback_err}")
        try:
            db_pool.putconn(conn)
        except Exception as put_err:
            logger.warning(f"Error returning connection to pool: {put_err}")

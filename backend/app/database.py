from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from fastapi import Request
import os
import time
from sqlalchemy import create_engine, event
# Load environment variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured.")

engine = create_engine(
    DATABASE_URL,
    pool_size=30,
    max_overflow=0,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
)
@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    connection_record.info["checkout_time"] = time.perf_counter()


@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_connection, connection_record):
    checkout_time = connection_record.info.pop("checkout_time", None)

    if checkout_time is not None:
        checkout_duration_ms = (
            time.perf_counter() - checkout_time
        ) * 1000
        pool = engine.pool
        print(
            f"[DB CONNECTION PERF] "
            f"checkout_duration={checkout_duration_ms:.2f}ms "
            f"checked_out={pool.checkedout()} "
            f"overflow={pool.overflow()}"
        )
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()
def get_db(request: Request):
    db = SessionLocal()
    session_start = time.perf_counter()

    pool = engine.pool

    print(
        f"[DB SESSION PERF] "
        f"opened "
        f"checked_out={pool.checkedout()} "
        f"overflow={pool.overflow()}"
    )

    try:
        yield db

    finally:
        cleanup_start = time.perf_counter()
        search_route_end = getattr(
            request.state,
            "search_route_end",
            None,
        )

        if search_route_end is not None:
            post_route_ms = (
                cleanup_start - search_route_end
            ) * 1000

            print(
                f"[POST ROUTE PERF] "
                f"path={request.url.path} "
                f"post_route={post_route_ms:.2f}ms"
            )

        after_yield_ms = (
            cleanup_start - session_start
        ) * 1000

        print(
            f"[DB SESSION PERF] "
            f"after_yield={after_yield_ms:.2f}ms"
        )

        db_close_start = time.perf_counter()

        db.close()

        db_close_ms = (
            time.perf_counter() - db_close_start
        ) * 1000

        session_lifetime_ms = (
            time.perf_counter() - session_start
        ) * 1000

        pool = engine.pool

        print(
            f"[DB SESSION PERF] "
            f"lifetime={session_lifetime_ms:.2f}ms "
            f"db_close={db_close_ms:.2f}ms "
            f"checked_out={pool.checkedout()} "
            f"overflow={pool.overflow()}"
        )
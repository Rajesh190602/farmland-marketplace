import sys
from pathlib import Path

# Add the backend directory to Python's import path.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import SessionLocal
from app.utils.listing_expiry import sync_all_published_listings


def main():
    db = SessionLocal()

    try:
        changed = sync_all_published_listings(db)
        print(
            f"Listing expiry processing completed. "
            f"Changes made: {changed}"
        )
        return 0
    except Exception as exc:
        db.rollback()
        print(f"Listing expiry processing failed: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
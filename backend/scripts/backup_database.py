from pathlib import Path
from datetime import datetime, timedelta
import os
import shutil
import subprocess
import sys

from dotenv import load_dotenv


# =========================================================
# Configuration
# =========================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKUP_DIR = PROJECT_ROOT / "backups"

BACKUP_DIR.mkdir(parents=True, exist_ok=True)

# Retention policy
DAILY_BACKUPS_TO_KEEP = 7
WEEKLY_BACKUPS_TO_KEEP = 4
MONTHLY_BACKUPS_TO_KEEP = 3


# =========================================================
# Environment
# =========================================================

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL is not configured.")
    sys.exit(1)


# =========================================================
# PostgreSQL tools
# =========================================================

PG_DUMP = shutil.which("pg_dump")
PG_RESTORE = shutil.which("pg_restore")

postgres_bin = Path(r"C:\Program Files\PostgreSQL\18\bin")

if not PG_DUMP:
    possible_pg_dump = postgres_bin / "pg_dump.exe"

    if possible_pg_dump.exists():
        PG_DUMP = str(possible_pg_dump)

if not PG_RESTORE:
    possible_pg_restore = postgres_bin / "pg_restore.exe"

    if possible_pg_restore.exists():
        PG_RESTORE = str(possible_pg_restore)

if not PG_DUMP:
    print("ERROR: pg_dump.exe was not found.")
    sys.exit(1)

if not PG_RESTORE:
    print("ERROR: pg_restore.exe was not found.")
    sys.exit(1)


# =========================================================
# Create backup
# =========================================================

timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

backup_file = BACKUP_DIR / f"farmland_{timestamp}.dump"

print("=" * 60)
print("FARMLAND MARKETPLACE DATABASE BACKUP")
print("=" * 60)

print(f"Backup directory: {BACKUP_DIR}")
print(f"Backup file:      {backup_file}")
print()
print("Starting pg_dump...")


command = [
    PG_DUMP,
    "--format=custom",
    "--verbose",
    "--file",
    str(backup_file),
    DATABASE_URL,
]

try:
    result = subprocess.run(
        command,
        check=False,
        text=True,
    )

except Exception as exc:
    print(f"ERROR: Failed to start pg_dump: {exc}")
    sys.exit(1)


if result.returncode != 0:
    print("ERROR: Database backup failed.")

    if backup_file.exists():
        backup_file.unlink()

    sys.exit(result.returncode)


# =========================================================
# Basic file validation
# =========================================================

if not backup_file.exists():
    print("ERROR: pg_dump completed but backup file was not created.")
    sys.exit(1)

backup_size = backup_file.stat().st_size

if backup_size == 0:
    print("ERROR: Backup file is empty.")
    backup_file.unlink()
    sys.exit(1)

print()
print(f"Backup created: {backup_size:,} bytes")


# =========================================================
# Integrity verification
# =========================================================

print()
print("Verifying backup integrity with pg_restore --list...")

verify_command = [
    PG_RESTORE,
    "--list",
    str(backup_file),
]

try:
    verify_result = subprocess.run(
        verify_command,
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )

except Exception as exc:
    print(f"ERROR: Failed to verify backup: {exc}")

    backup_file.unlink()
    sys.exit(1)


if verify_result.returncode != 0:
    print("ERROR: Backup integrity verification failed.")

    if verify_result.stderr:
        print(verify_result.stderr)

    backup_file.unlink()
    sys.exit(1)


print("Backup integrity: OK")


# =========================================================
# Retention helpers
# =========================================================

def backup_files():
    """Return valid-looking Farmland Marketplace dump files."""
    return sorted(
        BACKUP_DIR.glob("farmland_*.dump"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )


def delete_backup(path: Path):
    """Delete one backup safely."""
    try:
        path.unlink()
        print(f"Deleted old backup: {path.name}")
    except OSError as exc:
        print(f"WARNING: Could not delete {path.name}: {exc}")


# =========================================================
# Retention policy
# =========================================================

print()
print("Applying backup retention policy...")

all_backups = backup_files()

# Never delete the backup that was just created.
protected_backup = backup_file.resolve()

# ---------------------------------------------------------
# Safety rule:
# Always keep at least one backup.
# ---------------------------------------------------------

if len(all_backups) <= 1:
    print("Retention: only one backup exists. Nothing to delete.")
else:

    # -----------------------------------------------------
    # Keep the newest N backups as daily recovery points.
    # -----------------------------------------------------

    keep_paths = set()

    for path in all_backups[:DAILY_BACKUPS_TO_KEEP]:
        keep_paths.add(path.resolve())

    # -----------------------------------------------------
    # Weekly recovery points
    #
    # For backups older than the daily window, retain the
    # newest backup from each distinct ISO calendar week.
    # -----------------------------------------------------

    weekly_candidates = {}

    for path in all_backups[DAILY_BACKUPS_TO_KEEP:]:
        if path.resolve() == protected_backup:
            continue

        modified = datetime.fromtimestamp(path.stat().st_mtime)

        year, week, _ = modified.isocalendar()

        week_key = (year, week)

        if week_key not in weekly_candidates:
            weekly_candidates[week_key] = path

    weekly_paths = sorted(
        weekly_candidates.values(),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )

    for path in weekly_paths[:WEEKLY_BACKUPS_TO_KEEP]:
        keep_paths.add(path.resolve())

    # -----------------------------------------------------
    # Monthly recovery points
    #
    # For backups not already retained, keep the newest
    # backup from each distinct month.
    # -----------------------------------------------------

    monthly_candidates = {}

    for path in all_backups:
        if path.resolve() in keep_paths:
            continue

        modified = datetime.fromtimestamp(path.stat().st_mtime)

        month_key = (modified.year, modified.month)

        if month_key not in monthly_candidates:
            monthly_candidates[month_key] = path

    monthly_paths = sorted(
        monthly_candidates.values(),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )

    for path in monthly_paths[:MONTHLY_BACKUPS_TO_KEEP]:
        keep_paths.add(path.resolve())

    # -----------------------------------------------------
    # Delete everything not selected for retention.
    # -----------------------------------------------------

    deleted_count = 0

    for path in all_backups:
        resolved = path.resolve()

        if resolved == protected_backup:
            continue

        if resolved not in keep_paths:
            delete_backup(path)
            deleted_count += 1

    print(f"Retention cleanup complete. Deleted: {deleted_count}")


# =========================================================
# Final summary
# =========================================================

remaining_backups = backup_files()

print()
print("=" * 60)
print("BACKUP COMPLETED SUCCESSFULLY")
print("=" * 60)
print(f"Backups currently retained: {len(remaining_backups)}")
print()

for path in remaining_backups:
    size = path.stat().st_size

    print(
        f"{path.name}  "
        f"({size:,} bytes)"
    )

print()
from pathlib import Path
from datetime import datetime
import os
import shutil
import subprocess
import sys
import time

from dotenv import load_dotenv


# =========================================================
# Configuration
# =========================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Load environment before reading environment variables.
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL is not configured.")
    sys.exit(1)


# =========================================================
# Backup directories
# =========================================================

BACKUP_DIR = PROJECT_ROOT / "backups"

ONEDRIVE_DIR = os.getenv("OneDrive")

if ONEDRIVE_DIR:
    OFFSITE_BACKUP_DIR = (
        Path(ONEDRIVE_DIR) / "FarmlandMarketplace-Backups"
    )
else:
    OFFSITE_BACKUP_DIR = None

BACKUP_DIR.mkdir(parents=True, exist_ok=True)

if OFFSITE_BACKUP_DIR:
    OFFSITE_BACKUP_DIR.mkdir(parents=True, exist_ok=True)


# =========================================================
# Retention policy
# =========================================================

DAILY_BACKUPS_TO_KEEP = 7
WEEKLY_BACKUPS_TO_KEEP = 4
MONTHLY_BACKUPS_TO_KEEP = 3


# =========================================================
# Backup lock
# =========================================================

LOCK_FILE = BACKUP_DIR / "backup.lock"


def acquire_lock():
    """
    Prevent overlapping backup processes.

    Uses an atomic file creation operation so two backup
    processes cannot both start at the same time.
    """

    try:
        fd = os.open(
            str(LOCK_FILE),
            os.O_CREAT | os.O_EXCL | os.O_WRONLY
        )

        with os.fdopen(fd, "w", encoding="utf-8") as lock:
            lock.write(
                f"Backup started at "
                f"{datetime.now().isoformat()}\n"
            )
            lock.write(
                f"PID: {os.getpid()}\n"
            )

        return True

    except FileExistsError:
        print(
            "ERROR: Another backup process is already running."
        )
        print(f"Lock file: {LOCK_FILE}")
        return False


def release_lock():
    """Remove the backup lock safely."""

    try:
        if LOCK_FILE.exists():
            LOCK_FILE.unlink()
    except OSError as exc:
        print(
            f"WARNING: Could not remove backup lock: {exc}"
        )


# =========================================================
# PostgreSQL tools
# =========================================================

PG_DUMP = shutil.which("pg_dump")
PG_RESTORE = shutil.which("pg_restore")

postgres_bin = Path(
    r"C:\Program Files\PostgreSQL\18\bin"
)

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
# Backup helper functions
# =========================================================

def backup_files():
    """Return Farmland Marketplace dump files."""

    return sorted(
        BACKUP_DIR.glob("farmland_*.dump"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )


def delete_backup(path: Path):
    """Delete one backup safely."""

    try:
        if path.exists():
            path.unlink()

        print(
            f"Deleted old backup: {path.name}"
        )

    except OSError as exc:
        print(
            f"WARNING: Could not delete "
            f"{path.name}: {exc}"
        )


def validate_backup(path: Path):
    """
    Validate a PostgreSQL custom-format backup using
    pg_restore --list.
    """

    verify_command = [
        PG_RESTORE,
        "--list",
        str(path),
    ]

    try:
        verify_result = subprocess.run(
            verify_command,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
            timeout=120,
        )

    except subprocess.TimeoutExpired:
        print(
            "ERROR: Backup integrity verification timed out."
        )
        return False

    except Exception as exc:
        print(
            f"ERROR: Failed to verify backup: {exc}"
        )
        return False

    if verify_result.returncode != 0:

        print(
            "ERROR: Backup integrity verification failed."
        )

        if verify_result.stderr:
            print(verify_result.stderr)

        return False

    return True


def copy_to_onedrive(
    backup_file: Path,
    backup_size: int,
):
    """
    Copy a validated backup to the OneDrive backup folder
    and verify that the copied file has the same size.
    """

    if not OFFSITE_BACKUP_DIR:
        print()
        print(
            "WARNING: OneDrive environment variable "
            "is not available."
        )
        print("Off-site backup was skipped.")
        return False

    print()
    print("Copying validated backup to OneDrive...")

    offsite_backup_file = (
        OFFSITE_BACKUP_DIR / backup_file.name
    )

    try:
        shutil.copy2(
            backup_file,
            offsite_backup_file,
        )

    except Exception as exc:
        print(
            f"WARNING: Failed to copy backup to OneDrive: "
            f"{exc}"
        )
        print("Local backup remains available.")
        return False

    if not offsite_backup_file.exists():
        print(
            "WARNING: OneDrive backup file was not created."
        )
        return False

    offsite_size = offsite_backup_file.stat().st_size

    if offsite_size != backup_size:
        print(
            "WARNING: OneDrive backup size does not "
            "match local backup "
            f"({offsite_size:,} vs "
            f"{backup_size:,} bytes)."
        )
        return False

    print(
        f"OneDrive backup created: "
        f"{offsite_backup_file}"
    )

    print(
        f"OneDrive backup verified: "
        f"{offsite_size:,} bytes"
    )

    return True


# =========================================================
# Main backup
# =========================================================

def main():

    if not acquire_lock():
        return 2

    backup_file = None
    temporary_backup_file = None

    try:

        timestamp = datetime.now().strftime(
            "%Y-%m-%d_%H-%M-%S"
        )

        backup_file = (
            BACKUP_DIR /
            f"farmland_{timestamp}.dump"
        )

        temporary_backup_file = (
            BACKUP_DIR /
            f"farmland_{timestamp}.dump.part"
        )

        print("=" * 60)
        print("FARMLAND MARKETPLACE DATABASE BACKUP")
        print("=" * 60)

        print(
            f"Backup directory: {BACKUP_DIR}"
        )

        print(
            f"Temporary file:   "
            f"{temporary_backup_file}"
        )

        print(
            f"Final file:       {backup_file}"
        )

        if OFFSITE_BACKUP_DIR:
            print(
                f"OneDrive directory: "
                f"{OFFSITE_BACKUP_DIR}"
            )

        print()
        print("Starting pg_dump...")

        command = [
            PG_DUMP,
            "--format=custom",
            "--verbose",
            "--file",
            str(temporary_backup_file),
            DATABASE_URL,
        ]

        try:
            result = subprocess.run(
                command,
                check=False,
                text=True,
                capture_output=True,
                timeout=300,
            )

        except subprocess.TimeoutExpired:
            print(
                "ERROR: pg_dump timed out after "
                "300 seconds."
            )

            if temporary_backup_file.exists():
                temporary_backup_file.unlink()

            return 1

        except Exception as exc:
            print(
                f"ERROR: Failed to start pg_dump: {exc}"
            )

            if temporary_backup_file.exists():
                temporary_backup_file.unlink()

            return 1

        # Display pg_dump output in the scheduler log.
        if result.stdout:
            print(result.stdout)

        if result.stderr:
            print(result.stderr)

        if result.returncode != 0:

            print(
                "ERROR: Database backup failed."
            )

            if temporary_backup_file.exists():
                temporary_backup_file.unlink()

            print(
                f"pg_dump exit code: "
                f"{result.returncode}"
            )

            return result.returncode or 1

        # =================================================
        # Temporary file validation
        # =================================================

        if not temporary_backup_file.exists():

            print(
                "ERROR: pg_dump completed but "
                "temporary backup was not created."
            )

            return 1

        backup_size = (
            temporary_backup_file.stat().st_size
        )

        if backup_size == 0:

            print(
                "ERROR: Temporary backup file is empty."
            )

            temporary_backup_file.unlink()

            return 1

        print()
        print(
            f"Temporary backup created: "
            f"{backup_size:,} bytes"
        )

        # =================================================
        # Integrity verification
        # =================================================

        print()
        print(
            "Verifying backup integrity "
            "with pg_restore --list..."
        )

        if not validate_backup(
            temporary_backup_file
        ):

            print(
                "ERROR: Temporary backup failed "
                "integrity verification."
            )

            if temporary_backup_file.exists():
                temporary_backup_file.unlink()

            return 1

        print(
            "Backup integrity: OK"
        )

        # =================================================
        # Promote temporary file to final backup
        # =================================================

        print()
        print(
            "Promoting validated backup "
            "to final .dump file..."
        )

        temporary_backup_file.replace(
            backup_file
        )

        print(
            f"Backup created: "
            f"{backup_file}"
        )

        print(
            f"Backup size: "
            f"{backup_size:,} bytes"
        )

        # =================================================
        # OneDrive backup
        # =================================================

        onedrive_success = copy_to_onedrive(
            backup_file,
            backup_size,
        )

        # =================================================
        # Retention policy
        # =================================================

        print()
        print(
            "Applying backup retention policy..."
        )

        all_backups = backup_files()

        protected_backup = backup_file.resolve()

        if len(all_backups) <= 1:

            print(
                "Retention: only one backup exists. "
                "Nothing to delete."
            )

        else:

            keep_paths = set()

            # ---------------------------------------------
            # Daily backups
            # ---------------------------------------------

            for path in all_backups[
                :DAILY_BACKUPS_TO_KEEP
            ]:
                keep_paths.add(
                    path.resolve()
                )

            # ---------------------------------------------
            # Weekly backups
            # ---------------------------------------------

            weekly_candidates = {}

            for path in all_backups[
                DAILY_BACKUPS_TO_KEEP:
            ]:

                if path.resolve() == protected_backup:
                    continue

                modified = datetime.fromtimestamp(
                    path.stat().st_mtime
                )

                year, week, _ = (
                    modified.isocalendar()
                )

                week_key = (
                    year,
                    week,
                )

                if (
                    week_key
                    not in weekly_candidates
                ):
                    weekly_candidates[
                        week_key
                    ] = path

            weekly_paths = sorted(
                weekly_candidates.values(),
                key=lambda path:
                    path.stat().st_mtime,
                reverse=True,
            )

            for path in weekly_paths[
                :WEEKLY_BACKUPS_TO_KEEP
            ]:
                keep_paths.add(
                    path.resolve()
                )

            # ---------------------------------------------
            # Monthly backups
            # ---------------------------------------------

            monthly_candidates = {}

            for path in all_backups:

                if path.resolve() in keep_paths:
                    continue

                modified = datetime.fromtimestamp(
                    path.stat().st_mtime
                )

                month_key = (
                    modified.year,
                    modified.month,
                )

                if (
                    month_key
                    not in monthly_candidates
                ):
                    monthly_candidates[
                        month_key
                    ] = path

            monthly_paths = sorted(
                monthly_candidates.values(),
                key=lambda path:
                    path.stat().st_mtime,
                reverse=True,
            )

            for path in monthly_paths[
                :MONTHLY_BACKUPS_TO_KEEP
            ]:
                keep_paths.add(
                    path.resolve()
                )

            # ---------------------------------------------
            # Delete old backups
            # ---------------------------------------------

            deleted_count = 0

            for path in all_backups:

                resolved = path.resolve()

                if resolved == protected_backup:
                    continue

                if resolved not in keep_paths:

                    delete_backup(path)

                    deleted_count += 1

            print(
                f"Retention cleanup complete. "
                f"Deleted: {deleted_count}"
            )

        # =================================================
        # Final summary
        # =================================================

        remaining_backups = backup_files()

        print()
        print("=" * 60)

        if onedrive_success:
            print(
                "BACKUP COMPLETED SUCCESSFULLY"
            )
        else:
            print(
                "DATABASE BACKUP COMPLETED"
            )
            print(
                "WARNING: OneDrive copy was not verified."
            )

        print("=" * 60)

        print(
            f"Backups currently retained: "
            f"{len(remaining_backups)}"
        )

        print()

        for path in remaining_backups:

            size = path.stat().st_size

            print(
                f"{path.name} "
                f"({size:,} bytes)"
            )

        print()

        # The database backup itself is successful even
        # if OneDrive is temporarily unavailable.
        return 0

    except Exception as exc:

        print()
        print(
            f"ERROR: Unexpected backup failure: {exc}"
        )

        if (
            temporary_backup_file
            and temporary_backup_file.exists()
        ):
            try:
                temporary_backup_file.unlink()
            except OSError:
                pass

        return 1

    finally:

        release_lock()


if __name__ == "__main__":
    sys.exit(main())
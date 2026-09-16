\# Backup \& Recovery



\## 1. Purpose



This document defines the backup, restore, recovery, and data-protection procedure for the Farmland Marketplace application.



The application uses:



\- FastAPI backend

\- PostgreSQL database hosted on Neon

\- Cloudinary for uploaded images and files

\- Vercel for frontend hosting

\- Render for backend hosting



\---



\## 2. Database Backup Strategy



The PostgreSQL database is backed up using PostgreSQL `pg\_dump`.



Backup script:



`backend/scripts/backup\_database.py`



The script:



1\. Reads the production `DATABASE\_URL`.

2\. Creates a PostgreSQL custom-format `.dump` backup.

3\. Validates that the backup file is not empty.

4\. Runs `pg\_restore --list` to verify backup integrity.

5\. Applies the configured retention policy.

6\. Never deletes the backup created during the current execution.



Backup directory:



`backups/`



The `backups/` directory is excluded from Git using `.gitignore`.



\---



\## 3. Backup Retention



The automated backup script uses the following retention policy:



\- Keep the newest 7 daily backups.

\- Keep the newest backup from each older ISO week, up to 4 weekly backups.

\- Keep the newest backup from each older month, up to 3 monthly backups.

\- Always retain at least one valid backup.



This prevents unlimited growth of local backup storage while maintaining recent recovery points.



\---



\## 4. Backup File Format



Backups use PostgreSQL custom format:



`.dump`



Example:



`farmland\_2026-09-16\_13-59-26.dump`



The backup can be inspected using:



```powershell

pg\_restore --list "backups\\farmland\_YYYY-MM-DD\_HH-MM-SS.dump"


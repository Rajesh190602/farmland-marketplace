# Backup and Recovery

## 1. Purpose

This document defines the backup, restore, recovery, media-storage, and environment/secret-separation procedures for the Farmland Marketplace application.

The goal is to provide a repeatable recovery process instead of relying on manually created database dumps.

---

## 2. Database

The application uses PostgreSQL hosted on Neon.

The application obtains the database connection string from the `DATABASE_URL` environment variable.

Database credentials must never be committed to Git or written into backup logs.

---

## 3. Backup Format

Database backups are created using PostgreSQL `pg_dump`.

Backup format:

```text
Custom PostgreSQL dump (.dump)
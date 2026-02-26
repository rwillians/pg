# @rwillians/pg

Managed PostgreSQL made easy (or try to).

> [!WARNING]
> This project is in early development and not yet ready for production use.

## Features

- [x] **WAL Archiving**: Continuous backup of Write-Ahead Logs (WAL) into any S3-compatible object storage.
- [ ] **Automatic Backups**: Weekly full Base Backup, daily incremental Base Backup.
- [ ] **Custom Retention Period**: Configure how long you want to keep your Base Backups.
- [ ] **Point-in-Time Recovery**: Restore your database to any point in time (within your retention period).
- [ ] **TLS Certificates**: Automatically manage TLS certificates for secure connections.

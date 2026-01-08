#!/bin/bash

# KalsoHR Backup Script
# This script backs up the database and uploads directory

# Configuration
BACKUP_DIR="/home/kalsohr/backups"
DB_NAME="kalsohr_db"
DB_USER="sowmi"
DB_PASS="Jobs@1487"
DATE=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7

# Create backup directories
mkdir -p $BACKUP_DIR/db
mkdir -p $BACKUP_DIR/uploads

# Backup database
echo "Starting database backup..."
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/db/kalsohr_db_$DATE.sql.gz

if [ $? -eq 0 ]; then
    echo "Database backup completed: kalsohr_db_$DATE.sql.gz"
else
    echo "Database backup failed!"
    exit 1
fi

# Backup uploads directory
echo "Starting uploads backup..."
tar -czf $BACKUP_DIR/uploads/uploads_$DATE.tar.gz -C /home/kalsohr/apps/kalsohr/kalsohrapi uploads/

if [ $? -eq 0 ]; then
    echo "Uploads backup completed: uploads_$DATE.tar.gz"
else
    echo "Uploads backup failed!"
    exit 1
fi

# Delete backups older than retention period
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find $BACKUP_DIR/db -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR/uploads -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "===================================="
echo "Backup completed successfully: $DATE"
echo "Database backup: $BACKUP_DIR/db/kalsohr_db_$DATE.sql.gz"
echo "Uploads backup: $BACKUP_DIR/uploads/uploads_$DATE.tar.gz"
echo "===================================="

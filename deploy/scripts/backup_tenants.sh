#!/bin/bash
# ==============================================================================
# 7A School ERP — Automated Multi-Tenant MySQL Daily Backup Script
# Iterates through all tenant databases, creates gzipped SQL dumps,
# and purges backups older than 30 days.
# ==============================================================================

BACKUP_DIR="/var/backups/7a_school_erp/mysql"
DATE=$(date +"%Y%m%d_%H%M%S")
MYSQL_USER="root"
MYSQL_PASS="YourSecureRootPassword"

mkdir -p "$BACKUP_DIR/$DATE"

echo "[$DATE] Starting automated database backup..."

# 1. Backup Control Plane Database
echo "Backing up Control Plane DB: saas_control_db..."
mysqldump -u "$MYSQL_USER" -p"$MYSQL_PASS" --single-transaction --routines --triggers "saas_control_db" | gzip > "$BACKUP_DIR/$DATE/saas_control_db.sql.gz"

# 2. Get list of all tenant databases
TENANT_DBS=$(mysql -u "$MYSQL_USER" -p"$MYSQL_PASS" -e "SHOW DATABASES LIKE 'tenant_%_db';" -s --skip-column-names)

for DB in $TENANT_DBS; do
    echo "Backing up Tenant DB: $DB..."
    mysqldump -u "$MYSQL_USER" -p"$MYSQL_PASS" --single-transaction --routines --triggers "$DB" | gzip > "$BACKUP_DIR/$DATE/$DB.sql.gz"
done

echo "[$DATE] All databases successfully dumped to: $BACKUP_DIR/$DATE"

# 3. Purge backups older than 30 days
find "$BACKUP_DIR" -type d -mtime +30 -exec rm -rf {} +
echo "[$DATE] Cleaned up backups older than 30 days."

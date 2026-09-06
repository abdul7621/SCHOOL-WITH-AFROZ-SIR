#!/bin/bash
# ==============================================================================
# 7A SCHOOL ERP — HARDENED PRODUCTION DATABASE BACKUP SCRIPT
# Location: /usr/local/bin/backup-school-erp.sh
# Security: Zero Plaintext Passwords in Cron / Process Table
# ==============================================================================
set -o pipefail

BACKUP_DIR="/var/backups/school_erp"
LOG_FILE="/var/log/school_erp_backup.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_TAG=$(date +"%Y-%m-%d")
BACKUP_FILE="$BACKUP_DIR/school_erp_all_dbs_${TIMESTAMP}.sql.gz"
CNF_FILE="/etc/mysql/backup.cnf"

# Ensure directories exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S UTC')] $1" | tee -a "$LOG_FILE"
}

log "======================================================="
log "▶ STARTING AUTOMATED DATABASE BACKUP"

# 1. Determine credentials safely
DB_USER=$(grep -E '^CONTROL_DB_USER=' /var/www/school-erp/backend/.env 2>/dev/null | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
DB_PASS=$(grep -E '^CONTROL_DB_PASSWORD=' /var/www/school-erp/backend/.env 2>/dev/null | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
export MYSQL_PWD="$DB_PASS"

# Determine working connection method
if [ -f "$CNF_FILE" ]; then
    DUMP_AUTH="--defaults-extra-file=$CNF_FILE --databases saas_control_db tenant_sample_db"
elif mysqldump -u root --single-transaction --quick --databases saas_control_db tenant_sample_db > /dev/null 2>&1; then
    DUMP_AUTH="-u root --databases saas_control_db tenant_sample_db"
elif [ -n "$DB_USER" ] && mysqldump -h 127.0.0.1 -u "$DB_USER" --single-transaction --quick --databases saas_control_db tenant_sample_db > /dev/null 2>&1; then
    DUMP_AUTH="-h 127.0.0.1 -u $DB_USER --databases saas_control_db tenant_sample_db"
else
    DUMP_AUTH="-u root --databases saas_control_db tenant_sample_db"
fi

# 2. Execute mysqldump with single-transaction consistency
log "Backing up MySQL databases with auth: $DUMP_AUTH..."
if mysqldump $DUMP_AUTH --single-transaction --quick 2>> "$LOG_FILE" | gzip > "$BACKUP_FILE"; then
    unset MYSQL_PWD
    log "✅ mysqldump completed successfully."
else
    unset MYSQL_PWD
    log "❌ ERROR: mysqldump execution failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# 3. Verify Backup Archive Integrity (gzip test)
log "Verifying backup archive integrity..."
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "✅ INTEGRITY VERIFIED: $BACKUP_FILE ($FILE_SIZE) is valid and uncorrupted."
else
    log "❌ CORRUPTION DETECTED: $BACKUP_FILE failed gzip test!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# 4. Retention Policy: Prune backups older than 30 days
log "Applying 30-day retention policy..."
DELETED_COUNT=$(find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 | wc -l)
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -exec rm -f {} \;
log "Pruned $DELETED_COUNT archived backups older than 30 days."

log "🎉 BACKUP CYCLE COMPLETED SUCCESSFULLY."
log "======================================================="
exit 0

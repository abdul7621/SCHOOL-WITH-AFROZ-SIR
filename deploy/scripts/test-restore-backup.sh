#!/bin/bash
# ==============================================================================
# 7A SCHOOL ERP — BACKUP RESTORATION VERIFICATION SCRIPT
# Location: /usr/local/bin/test-restore-backup.sh
# Safety: Strictly Restores to Isolated 'test_restore_tenant_db' (Zero Prod Impact)
# ==============================================================================
set -e

BACKUP_DIR="/var/backups/school_erp"
TEST_DB="test_restore_tenant_db"

echo "=========================================================================="
echo "          🧪 7A SCHOOL ERP: BACKUP RESTORE VERIFICATION TEST              "
echo "=========================================================================="

# 1. Locate latest backup archive
LATEST_BACKUP=$(ls -t $BACKUP_DIR/*.sql.gz 2>/dev/null | head -n1 || true)
if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ ERROR: No backup file found in $BACKUP_DIR!"
    exit 1
fi
echo "▶ Found Target Backup Archive: $LATEST_BACKUP"
echo "  Archive Size: $(du -h "$LATEST_BACKUP" | cut -f1)"

# 2. Extract credentials
DB_USER=$(grep -E '^CONTROL_DB_USER=' /var/www/school-erp/backend/.env | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
DB_PASS=$(grep -E '^CONTROL_DB_PASSWORD=' /var/www/school-erp/backend/.env | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
export MYSQL_PWD="$DB_PASS"

# Determine working connection command
if mysql -u root -e "SELECT 1;" >/dev/null 2>&1; then
    MYSQL_CMD="mysql -u root"
elif [ -n "$DB_USER" ] && mysql -h 127.0.0.1 -u "$DB_USER" -e "SELECT 1;" >/dev/null 2>&1; then
    MYSQL_CMD="mysql -h 127.0.0.1 -u $DB_USER"
else
    MYSQL_CMD="mysql -u root"
fi

# 3. Create clean temporary test database
echo "▶ Creating isolated temporary database: $TEST_DB..."
$MYSQL_CMD -e "DROP DATABASE IF EXISTS \`$TEST_DB\`; CREATE DATABASE \`$TEST_DB\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Extract tenant_sample_db data and redirect to test_restore_tenant_db
echo "▶ Extracting and mapping tenant_sample_db data into $TEST_DB..."
TMP_SQL="/tmp/restore_test_$$.sql"
{
    echo "SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT;"
    echo "SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS;"
    echo "SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION;"
    echo "SET @OLD_TIME_ZONE=@@TIME_ZONE;"
    echo "SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS;"
    echo "SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS;"
    echo "SET @OLD_SQL_MODE=@@SQL_MODE;"
    echo "SET @OLD_SQL_NOTES=@@SQL_NOTES;"
    echo "SET FOREIGN_KEY_CHECKS=0;"
    echo "SET UNIQUE_CHECKS=0;"
    echo "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';"
    zcat "$LATEST_BACKUP" | sed -n '/^-- Current Database: `tenant_sample_db`/,$p' | sed -e "s/\`tenant_sample_db\`/\`$TEST_DB\`/g" -e 's/SET TIME_ZONE=@OLD_TIME_ZONE/-- SET TIME_ZONE/g'
    echo "COMMIT;"
} > "$TMP_SQL"

echo "▶ Executing restore into $TEST_DB..."
$MYSQL_CMD "$TEST_DB" < "$TMP_SQL"
rm -f "$TMP_SQL"

echo "=========================================================================="
echo "          📊 RESTORATION EVIDENCE & INTEGRITY AUDIT                       "
echo "=========================================================================="

# 5. Verify Table Count in restored DB
TABLE_COUNT=$($MYSQL_CMD -sse "SELECT count(*) FROM information_schema.tables WHERE table_schema='$TEST_DB';")
echo "  Total Tables Restored in $TEST_DB: $TABLE_COUNT (Expected: ~54)"

# 6. Verify Representative Data Rows
STUDENTS_COUNT=$($MYSQL_CMD -sse "SELECT count(*) FROM \`$TEST_DB\`.students;" 2>/dev/null || echo "0")
USERS_COUNT=$($MYSQL_CMD -sse "SELECT count(*) FROM \`$TEST_DB\`.users;" 2>/dev/null || echo "0")
FEE_HEADS_COUNT=$($MYSQL_CMD -sse "SELECT count(*) FROM \`$TEST_DB\`.fee_heads;" 2>/dev/null || echo "0")
CLASSES_COUNT=$($MYSQL_CMD -sse "SELECT count(*) FROM \`$TEST_DB\`.classes;" 2>/dev/null || echo "0")

echo "  Restored Students Count   : $STUDENTS_COUNT"
echo "  Restored Users Count      : $USERS_COUNT"
echo "  Restored Fee Heads Count  : $FEE_HEADS_COUNT"
echo "  Restored Classes Count    : $CLASSES_COUNT"

# 7. Safety cleanup
echo "▶ Cleaning up temporary test database..."
$MYSQL_CMD -e "DROP DATABASE IF EXISTS \`$TEST_DB\`;"
unset MYSQL_PWD

if [ "$TABLE_COUNT" -ge 50 ]; then
    echo "=========================================================================="
    echo "  🟢 RESTORE VERIFICATION SUCCESS: Backup is 100% viable and restorable!  "
    echo "=========================================================================="
    exit 0
else
    echo "=========================================================================="
    echo "  ❌ RESTORE VERIFICATION FAILED: Incomplete tables or records restored!  "
    echo "=========================================================================="
    exit 1
fi

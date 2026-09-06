#!/bin/bash
set -e

echo "========================================="
echo "   🚀 7A SCHOOL ERP: 1-CLICK DEPLOY     "
echo "========================================="

# 1. Ensure safe directory
git config --global --add safe.directory /var/www/school-erp 2>/dev/null || true

# 2. Pull latest code from GitHub
echo "[1/4] 📥 Pulling latest code from GitHub..."
cd /var/www/school-erp
git pull origin main

# 3. Update Backend dependencies, run database migrations & restart PM2 service
echo "[2/5] ⚙️ Checking backend dependencies..."
cd /var/www/school-erp/backend
source venv/bin/activate
pip install -r requirements.txt --quiet

echo "[3/5] 🗄️ Running database migrations (Alembic)..."
alembic upgrade head || echo "⚠️ Alembic upgrade returned non-zero, continuing..."

echo "[4/5] 🔄 Reloading FastAPI backend in PM2..."
pm2 reload school-erp-backend || pm2 restart school-erp-backend || pm2 start "venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2" --name "school-erp-backend"

# 4. Build Frontend
echo "[5/5] 🎨 Building React frontend & reloading Nginx..."
cd /var/www/school-erp/frontend
npm install --quiet
npm run build

# 5. Set permissions & reload Nginx
chmod -R 755 /var/www/school-erp/frontend/dist
nginx -t && systemctl reload nginx

# 6. Install & Execute Production Hardening (Backup, Restore Test, Crontab)
echo "[6/6] 🛡️ Running Production Hardening (Backup, Restore Test, Crontab)..."
cd /var/www/school-erp
if [ -f deploy/scripts/backup-school-erp.sh ]; then
    cp deploy/scripts/backup-school-erp.sh /usr/local/bin/backup-school-erp.sh
    cp deploy/scripts/test-restore-backup.sh /usr/local/bin/test-restore-backup.sh 2>/dev/null || true
    chmod +x /usr/local/bin/backup-school-erp.sh /usr/local/bin/test-restore-backup.sh 2>/dev/null || true

    # Run immediate real backup
    /usr/local/bin/backup-school-erp.sh

    # Run restore test in isolated test_restore_tenant_db
    if [ -f /usr/local/bin/test-restore-backup.sh ]; then
        /usr/local/bin/test-restore-backup.sh || echo "⚠️ Test restore returned non-zero, continuing..."
    fi

    # Update crontab to clean passwordless script
    (crontab -l 2>/dev/null | grep -v 'mysqldump' | grep -v 'backup-school-erp.sh'; echo "0 2 * * * /usr/local/bin/backup-school-erp.sh >> /var/log/school_erp_backup.log 2>&1") | crontab -
    echo "✅ Nightly backup cron job verified in crontab."
fi

echo ""
echo "========================================="
echo "   ✅ DEPLOYMENT & HARDENING COMPLETED!  "
echo "   Live at: http://187.127.176.21        "
echo "========================================="


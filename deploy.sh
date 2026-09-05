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

# 3. Update Backend dependencies & restart PM2 service
echo "[2/4] ⚙️ Checking backend dependencies & restarting PM2..."
cd /var/www/school-erp/backend
source venv/bin/activate
pip install -r requirements.txt --quiet
pm2 restart school-erp-backend || pm2 start "venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2" --name "school-erp-backend"

# 4. Build Frontend
echo "[3/4] 🎨 Building React frontend..."
cd /var/www/school-erp/frontend
npm install --quiet
npm run build

# 5. Set permissions & reload Nginx
echo "[4/4] 🌐 Verifying & reloading Nginx..."
chmod -R 755 /var/www/school-erp/frontend/dist
nginx -t && systemctl reload nginx

echo ""
echo "========================================="
echo "   ✅ DEPLOYMENT COMPLETED SUCCESSFULLY! "
echo "   Live at: http://187.127.176.21        "
echo "========================================="

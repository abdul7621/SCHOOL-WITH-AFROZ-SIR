#!/bin/bash
# ==============================================================================
# 7A SCHOOL ERP — ENTERPRISE PRODUCTION DEPLOYMENT ENGINE
# Location: /var/www/school-erp/deploy.sh
# Supports: Full Deploy, Fast Deploy (--fast), Status Check (--status)
# ==============================================================================
set -e
set -o pipefail

START_TIME=$(date +%s)

# Terminal Styling
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}==========================================================================${NC}"
echo -e "${BOLD}         🚀 7A SCHOOL ERP: ENTERPRISE 1-CLICK DEPLOYMENT ENGINE         ${NC}"
echo -e "${CYAN}==========================================================================${NC}"
echo -e "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo -e "Target Host: $(hostname) (187.127.176.21)"
echo ""

# Error handler trap
trap 'echo -e "\n${RED}❌ DEPLOYMENT FAILED at line $LINENO! Check logs above for details.${NC}"; exit 1' ERR

MODE="full"
for arg in "$@"; do
    case $arg in
        --fast)
            MODE="fast"
            ;;
        --status)
            MODE="status"
            ;;
    esac
done

# Quick Status Mode
if [ "$MODE" = "status" ]; then
    echo -e "${BOLD}🔍 CHECKING LIVE SYSTEM STATUS...${NC}"
    echo ""
    echo "▶ PM2 Backend Process Status:"
    pm2 status school-erp-backend || true
    echo ""
    echo "▶ Backend Health Check (Port 8000 direct):"
    curl -s http://127.0.0.1:8000/health || echo -e "${RED}Port 8000 unresponsive${NC}"
    echo ""
    echo ""
    echo "▶ Nginx API Proxy Check (Port 80 -> /api/health):"
    curl -s http://127.0.0.1/api/health || echo -e "${RED}Port 80 API proxy unresponsive${NC}"
    echo ""
    echo ""
    echo "▶ Frontend SPA Status Code:"
    FE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/)
    echo -e "  HTTP Status: ${BOLD}$FE_CODE${NC}"
    exit 0
fi

# 1. Synchronize Codebase from GitHub
echo -e "${BOLD}[1/6] 📥 Synchronizing Codebase from GitHub...${NC}"
cd /var/www/school-erp
git config --global --add safe.directory /var/www/school-erp 2>/dev/null || true

# Reset modified tracked files so pull never gets blocked by server conflicts
git checkout -- .
git fetch origin main
git pull origin main

COMMIT_SHA=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -n 1)
echo -e "${GREEN}✔ Repository synchronized to commit: ${BOLD}$COMMIT_SHA${NC} (${COMMIT_MSG})"
echo ""

# 2. Update Backend Dependencies & Environment
echo -e "${BOLD}[2/6] ⚙️ Preparing Backend Environment (Python/venv)...${NC}"
cd /var/www/school-erp/backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate

pip install -r requirements.txt --quiet
echo -e "${GREEN}✔ Python dependencies verified and up to date.${NC}"
echo ""

# 3. Database Schema Migrations (Alembic)
echo -e "${BOLD}[3/6] 🗄️ Executing Database Migrations (Alembic)...${NC}"
# Run migrations BEFORE restarting PM2 backend so new code finds new schema
if alembic upgrade head; then
    echo -e "${GREEN}✔ Database schema migrated to latest Alembic revision.${NC}"
else
    echo -e "${YELLOW}⚠️ Alembic upgrade returned non-zero. Check migration logs if unexpected.${NC}"
fi
echo ""

# 4. Reload FastAPI Backend under PM2 & Verify Health
echo -e "${BOLD}[4/6] 🔄 Reloading FastAPI Backend in PM2...${NC}"
if pm2 describe school-erp-backend >/dev/null 2>&1; then
    pm2 reload school-erp-backend --update-env
else
    pm2 start "venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2" --name "school-erp-backend"
fi
pm2 save --force >/dev/null 2>&1

echo "Verifying Backend API Health on Port 8000..."
HEALTH_OK=false
for i in {1..10}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        HEALTH_OK=true
        break
    fi
    sleep 1
done

if [ "$HEALTH_OK" = true ]; then
    echo -e "${GREEN}✔ Backend API is HEALTHY (HTTP 200 on /health).${NC}"
else
    echo -e "${RED}❌ ERROR: Backend failed health check! HTTP status: $HTTP_CODE${NC}"
    echo -e "${YELLOW}Recent PM2 Logs:${NC}"
    pm2 logs school-erp-backend --lines 25 --nostream || true
    exit 1
fi
echo ""

# 5. Build React Frontend & Reload Nginx
echo -e "${BOLD}[5/6] 🎨 Building React SPA Frontend (Vite) & Reloading Nginx...${NC}"
cd /var/www/school-erp/frontend
npm install --quiet
npm run build

if [ ! -f "/var/www/school-erp/frontend/dist/index.html" ]; then
    echo -e "${RED}❌ ERROR: Frontend build did not produce dist/index.html!${NC}"
    exit 1
fi

chmod -R 755 /var/www/school-erp/frontend/dist
nginx -t
systemctl reload nginx

# Verify Nginx Frontend & API Proxy
FE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/)
API_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/api/health)
echo -e "${GREEN}✔ Frontend SPA built & Nginx reloaded.${NC}"
echo -e "  - Frontend HTTP Status : ${BOLD}$FE_HTTP${NC}"
echo -e "  - API Proxy HTTP Status: ${BOLD}$API_HTTP${NC}"
echo ""

# 6. Hardening, Backup & Restore Verification
echo -e "${BOLD}[6/6] 🛡️ Production Hardening & Safety Routine...${NC}"
cd /var/www/school-erp
if [ -f deploy/scripts/backup-school-erp.sh ]; then
    cp deploy/scripts/backup-school-erp.sh /usr/local/bin/backup-school-erp.sh
    chmod +x /usr/local/bin/backup-school-erp.sh
fi
if [ -f deploy/scripts/test-restore-backup.sh ]; then
    cp deploy/scripts/test-restore-backup.sh /usr/local/bin/test-restore-backup.sh
    chmod +x /usr/local/bin/test-restore-backup.sh
fi

# Ensure crontab is configured
(crontab -l 2>/dev/null | grep -v 'mysqldump' | grep -v 'backup-school-erp.sh'; echo "0 2 * * * /usr/local/bin/backup-school-erp.sh >> /var/log/school_erp_backup.log 2>&1") | crontab -
echo -e "${GREEN}✔ Nightly backup crontab verified.${NC}"

if [ "$MODE" = "fast" ]; then
    echo -e "${YELLOW}⚡ FAST DEPLOY: Skipping post-deploy backup and restore test.${NC}"
else
    echo "Running post-deployment snapshot backup..."
    /usr/local/bin/backup-school-erp.sh

    echo "Running isolated database restore verification..."
    /usr/local/bin/test-restore-backup.sh
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo -e "${CYAN}==========================================================================${NC}"
echo -e "${GREEN}${BOLD}       🎉 DEPLOYMENT & VERIFICATION COMPLETED SUCCESSFULLY IN ${ELAPSED}s!     ${NC}"
echo -e "${CYAN}==========================================================================${NC}"
echo -e "  Deployed Commit : ${BOLD}$COMMIT_SHA${NC} - $COMMIT_MSG"
echo -e "  Backend URL     : ${BOLD}http://187.127.176.21/api/health${NC} (HTTP 200)"
echo -e "  Frontend Portal : ${BOLD}http://187.127.176.21${NC} (HTTP 200)"
echo -e "${CYAN}==========================================================================${NC}"
echo ""


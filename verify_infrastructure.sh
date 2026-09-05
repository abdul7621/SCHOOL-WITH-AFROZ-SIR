#!/bin/bash
# ==============================================================================
# 7A SCHOOL ERP — INFRASTRUCTURE REALITY CHECK SCRIPT
# Server: Hostinger Ubuntu VPS (187.127.176.21)
# Verifies all 20 infrastructure checkpoints against approved architecture
# ==============================================================================

echo "=========================================================================="
echo "          🔍 7A SCHOOL ERP: INFRASTRUCTURE REALITY CHECK                 "
echo "=========================================================================="
echo "Date: $(date -u)"
echo "Host: $(hostname -f 2>/dev/null || hostname)"
echo ""

# ------------------------------------------------------------------------------
# 1. ACTUAL OS
# ------------------------------------------------------------------------------
echo ">>> [1/20] ACTUAL OS"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "OS: $PRETTY_NAME"
    echo "Kernel: $(uname -r)"
    echo "Arch: $(uname -m)"
else
    uname -a
fi
echo ""

# ------------------------------------------------------------------------------
# 2. ACTUAL PYTHON VERSION
# ------------------------------------------------------------------------------
echo ">>> [2/20] ACTUAL PYTHON VERSION"
echo "System Python: $(python3 --version 2>&1 || echo 'Not installed')"
if [ -f /var/www/school-erp/backend/venv/bin/python ]; then
    echo "Backend venv Python: $(/var/www/school-erp/backend/venv/bin/python --version 2>&1)"
else
    echo "Backend venv Python: venv not found at /var/www/school-erp/backend/venv"
fi
echo ""

# ------------------------------------------------------------------------------
# 3. ACTUAL FASTAPI PROCESS
# ------------------------------------------------------------------------------
echo ">>> [3/20] ACTUAL FASTAPI PROCESS"
if command -v pm2 &>/dev/null; then
    echo "PM2 Status:"
    pm2 status school-erp-backend || pm2 list
else
    echo "PM2: not found in PATH"
fi
echo "Uvicorn Processes:"
ps aux | grep -E '[u]vicorn|[g]unicorn' || echo "No uvicorn/gunicorn process found"
echo "Listening on Port 8000:"
ss -tulpn | grep 8000 || netstat -tulpn 2>/dev/null | grep 8000 || echo "Port 8000 not listening"
echo ""

# ------------------------------------------------------------------------------
# 4. ACTUAL DATABASE ENGINE (CRITICAL CHECK: MySQL vs PostgreSQL)
# ------------------------------------------------------------------------------
echo ">>> [4/20] ACTUAL DATABASE ENGINE (CRITICAL ARCHITECTURE CHECK)"
MYSQL_RUNNING=false
POSTGRES_RUNNING=false

if systemctl is-active --quiet mysql 2>/dev/null || systemctl is-active --quiet mysqld 2>/dev/null || pgrep -x "mysqld" &>/dev/null; then
    MYSQL_RUNNING=true
fi

if systemctl is-active --quiet postgresql 2>/dev/null || pgrep -x "postgres" &>/dev/null; then
    POSTGRES_RUNNING=true
fi

echo "MySQL Daemon Status:      $([ "$MYSQL_RUNNING" = true ] && echo '🟢 ACTIVE (RUNNING)' || echo '🔴 INACTIVE / NOT RUNNING')"
echo "PostgreSQL Daemon Status: $([ "$POSTGRES_RUNNING" = true ] && echo '⚠️ ACTIVE (RUNNING)' || echo '🟢 INACTIVE / NOT INSTALLED')"

echo "Database Ports in Listen State:"
ss -tulpn | grep -E '3306|5432' || netstat -tulpn 2>/dev/null | grep -E '3306|5432' || echo "Neither 3306 nor 5432 listening"
echo ""

# ------------------------------------------------------------------------------
# 5. ACTUAL DATABASE VERSION
# ------------------------------------------------------------------------------
echo ">>> [5/20] ACTUAL DATABASE VERSION"
if command -v mysql &>/dev/null; then
    echo "MySQL CLI Client: $(mysql --version)"
    echo "MySQL Server Engine: $(mysql -u root -e 'SELECT VERSION(), @@version_comment;' 2>&1 || echo 'Cannot query without credentials')"
fi
if command -v psql &>/dev/null; then
    echo "PostgreSQL Version: $(psql --version 2>&1)"
else
    echo "PostgreSQL CLI: Not installed on system"
fi
echo ""

# ------------------------------------------------------------------------------
# 6. ACTUAL REDIS
# ------------------------------------------------------------------------------
echo ">>> [6/20] ACTUAL REDIS"
if systemctl is-active --quiet redis 2>/dev/null || systemctl is-active --quiet redis-server 2>/dev/null || pgrep -x "redis-server" &>/dev/null; then
    echo "Redis Status: 🟢 ACTIVE (RUNNING)"
    echo "Redis CLI Ping: $(redis-cli ping 2>&1 || echo 'Ping failed')"
    echo "Redis Version: $(redis-server --version 2>&1 || echo 'Unknown')"
else
    echo "Redis Status: 🔴 INACTIVE / NOT INSTALLED"
fi
echo ""

# ------------------------------------------------------------------------------
# 7. ACTUAL CELERY WORKER
# ------------------------------------------------------------------------------
echo ">>> [7/20] ACTUAL CELERY WORKER"
CELERY_RUNNING=$(ps aux | grep -E '[c]elery worker' | wc -l)
if [ "$CELERY_RUNNING" -gt 0 ]; then
    echo "Celery Worker: 🟢 ACTIVE ($CELERY_RUNNING processes found)"
    ps aux | grep -E '[c]elery worker'
else
    echo "Celery Worker: ⚪ NOT RUNNING (Scheduled tasks running synchronously or background thread)"
fi
echo ""

# ------------------------------------------------------------------------------
# 8. ACTUAL NGINX
# ------------------------------------------------------------------------------
echo ">>> [8/20] ACTUAL NGINX"
if command -v nginx &>/dev/null; then
    echo "Nginx Version: $(nginx -v 2>&1)"
    echo "Nginx Service: $(systemctl is-active nginx)"
    echo "Nginx Config Test: $(nginx -t 2>&1)"
else
    echo "Nginx: Not installed"
fi
echo ""

# ------------------------------------------------------------------------------
# 9. ACTUAL SSL
# ------------------------------------------------------------------------------
echo ">>> [9/20] ACTUAL SSL"
if command -v certbot &>/dev/null; then
    echo "Certbot Version: $(certbot --version 2>&1)"
    certbot certificates 2>&1 || echo "No certbot certificates found"
else
    echo "Certbot: Not installed"
fi
echo "Port 443 (HTTPS) Listening Status:"
ss -tulpn | grep 443 || netstat -tulpn 2>/dev/null | grep 443 || echo "Port 443 not currently listening"
echo ""

# ------------------------------------------------------------------------------
# 10. ACTUAL FRONTEND BUILD
# ------------------------------------------------------------------------------
echo ">>> [10/20] ACTUAL FRONTEND BUILD"
if [ -d /var/www/school-erp/frontend/dist ]; then
    echo "Frontend Dist Directory: /var/www/school-erp/frontend/dist (EXISTS)"
    ls -lh /var/www/school-erp/frontend/dist
    echo "Index.html size: $(wc -c < /var/www/school-erp/frontend/dist/index.html 2>/dev/null || echo '0') bytes"
    echo "Assets count: $(ls /var/www/school-erp/frontend/dist/assets 2>/dev/null | wc -l) files"
else
    echo "Frontend Dist Directory: NOT FOUND at /var/www/school-erp/frontend/dist"
fi
echo ""

# ------------------------------------------------------------------------------
# 11. ACTUAL BACKEND API HEALTH
# ------------------------------------------------------------------------------
echo ">>> [11/20] ACTUAL BACKEND API HEALTH"
echo "Local curl to http://127.0.0.1:8000/health:"
curl -s -m 5 -w "\nHTTP Code: %{http_code}\n" http://127.0.0.1:8000/health || echo "Failed to connect to 127.0.0.1:8000"
echo "Public curl via Nginx to http://127.0.0.1/api/v1/auth/login (testing proxy):"
curl -s -m 5 -X POST http://127.0.0.1/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: sample" \
  -d '{"username_or_phone":"test","password":"test"}' \
  -w "\nHTTP Code: %{http_code}\n" || echo "Failed to connect via Nginx"
echo ""

# ------------------------------------------------------------------------------
# 12. ACTUAL DATABASE CONNECTION (TESTED VIA BACKEND RUNTIME)
# ------------------------------------------------------------------------------
echo ">>> [12/20] ACTUAL DATABASE CONNECTION (VIA BACKEND)"
if [ -f /var/www/school-erp/backend/venv/bin/python ]; then
    /var/www/school-erp/backend/venv/bin/python - << 'EOF'
import asyncio
import sys
sys.path.insert(0, '/var/www/school-erp/backend')
try:
    from app.core.config import settings
    from app.core.database import control_async_engine
    from sqlalchemy import text

    async def test_conn():
        print(f"Connecting to Control DB: {settings.CONTROL_DB_NAME} at {settings.CONTROL_DB_HOST}:{settings.CONTROL_DB_PORT} as {settings.CONTROL_DB_USER}...")
        async with control_async_engine.connect() as conn:
            result = await conn.execute(text("SELECT 1 AS alive, VERSION() AS db_ver;"))
            row = result.mappings().first()
            print(f"🟢 Database Connection SUCCESS! Alive: {row['alive']}, Server Version: {row['db_ver']}")

    asyncio.run(test_conn())
except Exception as e:
    print(f"🔴 Database Connection FAILED: {e}")
EOF
else
    echo "Python venv not found to test database connection"
fi
echo ""

# ------------------------------------------------------------------------------
# 13. ACTUAL MIGRATION STATE
# ------------------------------------------------------------------------------
echo ">>> [13/20] ACTUAL MIGRATION STATE"
if [ -d /var/www/school-erp/backend ]; then
    cd /var/www/school-erp/backend
    if [ -f venv/bin/alembic ]; then
        echo "Alembic Migration Current Head:"
        venv/bin/alembic current 2>&1 || echo "Alembic current check returned status"
    else
        echo "Alembic executable not found in venv"
    fi
fi
echo ""

# ------------------------------------------------------------------------------
# 14. ACTUAL TENANT DATABASES
# ------------------------------------------------------------------------------
echo ">>> [14/20] ACTUAL TENANT DATABASES IN MYSQL"
if command -v mysql &>/dev/null; then
    mysql -u root -e "
    SELECT table_schema AS 'Database', 
           COUNT(*) AS 'Total Tables',
           ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
    FROM information_schema.tables 
    WHERE table_schema IN ('saas_control_db', 'tenant_sample_db', 'laravel_db')
       OR table_schema LIKE 'tenant_%'
    GROUP BY table_schema;
    " 2>&1 || echo "Could not list MySQL databases"
fi
echo ""

# ------------------------------------------------------------------------------
# 15. ACTUAL BACKUP CONFIGURATION
# ------------------------------------------------------------------------------
echo ">>> [15/20] ACTUAL BACKUP CONFIGURATION"
echo "Root Crontab:"
crontab -l 2>&1 || echo "No crontab for root"
echo "System Crontab (/etc/crontab & /etc/cron.d):"
grep -E 'backup|dump|mysql' /etc/crontab /etc/cron.d/* 2>/dev/null || echo "No backup cron jobs found in /etc/crontab or /etc/cron.d"
echo ""

# ------------------------------------------------------------------------------
# 16. ACTUAL BACKUP FILE CREATION
# ------------------------------------------------------------------------------
echo ">>> [16/20] ACTUAL BACKUP FILE CREATION"
if [ -d /var/backups ]; then
    echo "Listing /var/backups (recent 10 entries):"
    ls -lht /var/backups | head -n 10
fi
if [ -d /var/backups/school_erp ]; then
    echo "Listing /var/backups/school_erp:"
    ls -lht /var/backups/school_erp
else
    echo "/var/backups/school_erp directory does not exist yet"
fi
echo ""

# ------------------------------------------------------------------------------
# 17. ACTUAL RESTORE TEST
# ------------------------------------------------------------------------------
echo ">>> [17/20] ACTUAL RESTORE TEST STATUS"
echo "Restore Test: Automated point-in-time restore verification status: MANUAL / PENDING CLIENT PROVISIONING"
echo ""

# ------------------------------------------------------------------------------
# 18. ACTUAL DOMAIN / SUBDOMAIN ROUTING
# ------------------------------------------------------------------------------
echo ">>> [18/20] ACTUAL DOMAIN / SUBDOMAIN ROUTING IN NGINX"
if [ -d /etc/nginx/sites-enabled ]; then
    echo "Active Nginx Virtual Hosts:"
    grep -E 'server_name|listen|proxy_pass|root' /etc/nginx/sites-enabled/* 2>/dev/null
fi
echo ""

# ------------------------------------------------------------------------------
# 19. ACTUAL ENVIRONMENT VARIABLES
# ------------------------------------------------------------------------------
echo ">>> [19/20] ACTUAL ENVIRONMENT VARIABLES"
if [ -f /var/www/school-erp/backend/.env ]; then
    echo "Backend .env Keys present (Values Masked for Security):"
    sed -E 's/(=).*/=\*\*\*\*\*\*\*\*/' /var/www/school-erp/backend/.env
else
    echo "Backend .env file not found at /var/www/school-erp/backend/.env"
fi
echo ""

# ------------------------------------------------------------------------------
# 20. ACTUAL DEPLOYMENT COMMIT SHA
# ------------------------------------------------------------------------------
echo ">>> [20/20] ACTUAL DEPLOYMENT COMMIT SHA"
if [ -d /var/www/school-erp/.git ]; then
    cd /var/www/school-erp
    echo "Active Git Commit: $(git rev-parse HEAD)"
    echo "Last Commit Summary:"
    git log -1 --pretty=format:"Author: %an <%ae>%nDate:   %ad%nSubject: %s%n"
    echo ""
    echo "Git Remote Status:"
    git remote -v
    git status -s
fi

echo ""
echo "=========================================================================="
echo "          ✅ INFRASTRUCTURE REALITY CHECK EXECUTION COMPLETE             "
echo "=========================================================================="

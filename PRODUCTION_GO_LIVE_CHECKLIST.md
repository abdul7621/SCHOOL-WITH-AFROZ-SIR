# 7A SCHOOL ERP — PRODUCTION GO-LIVE & INFRASTRUCTURE RUNBOOK
**Server Host:** Hostinger Cloud VPS  
**IP Address:** `187.127.176.21`  
**Operating System:** Ubuntu 24.04 LTS (x86_64)  
**Production Stack:** Nginx 1.24, MySQL 8.0, Python 3.12 (FastAPI), Node.js 20 (Vite / React 18), PM2  
**Target Domain:** `schoolerp.7adigital.com` (or client custom domain)

---

## 1. Production Architecture Overview

```
                      [ Internet / User Browsers & Smartphones ]
                                         │
                                         ▼ (Port 80 / 443 HTTPS)
                             ┌───────────────────────┐
                             │    Nginx Web Server   │
                             └───────────┬───────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼ (Static Files)                                ▼ (Reverse Proxy /api)
     ┌───────────────────────┐                       ┌───────────────────────┐
     │  Vite React Frontend  │                       │    FastAPI Backend    │
     │ /var/www/school-erp/  │                       │   127.0.0.1:8000      │
     │ (1569 modules bundle) │                       │ (Managed by PM2 / Git)│
     └───────────────────────┘                       └───────────┬───────────┘
                                                                 │
                                                                 ▼ (Port 3306 / asyncmy)
                                                     ┌───────────────────────┐
                                                     │    MySQL 8.0 Database │
                                                     │(saas_control/tenants) │
                                                     └───────────────────────┘
```

---

## 2. Pre-Flight Infrastructure Checklist

| Component | Target Standard | Production Status | Verified Command / File |
| :--- | :--- | :---: | :--- |
| **Operating System** | Ubuntu 22.04 / 24.04 LTS | 🟢 PASS | `lsb_release -a` $\rightarrow$ Ubuntu 24.04 |
| **Web Server (Nginx)** | Reverse Proxy + Gzip + Cache Headers | 🟢 PASS | `/etc/nginx/sites-available/school-erp` |
| **Frontend Production Build** | Minified Vite bundle (Zero errors) | 🟢 PASS | Built in 3.88s (1569 modules) |
| **Backend Supervisor** | PM2 Daemon (auto-restart on crash) | 🟢 PASS | `pm2 status` $\rightarrow$ `school-erp-backend (online)` |
| **Database Engine** | MySQL 8.0 with utf8mb4 encoding | 🟢 PASS | `mysqladmin ping -h 127.0.0.1` |
| **Database Migrations** | Alembic migrations at head | 🟢 PASS | `alembic upgrade head` |
| **Firewall (UFW)** | Ports 22, 80, 443 open; 8000 & 3306 blocked | 🟢 PASS | `ufw status` |
| **SSL / TLS Certificate** | Let's Encrypt HTTPS auto-renewal | 🟡 PENDING | Awaiting client DNS A-record pointing |

---

## 3. Production Deployment Procedures

### 3.1. 1-Click Local-to-VPS Deployment (`deploy.bat`)
To deploy updates from the local developer workstation to the live Hostinger VPS:
```cmd
PS C:\Users\ADMIN\SCHOOL-WITH-AFROZ-SIR> .\deploy.bat
```
This automated batch pipeline:
1. Verifies local git status and pushes commits to GitHub (`origin main`).
2. Connects to `root@187.127.176.21` via SSH.
3. Executes `git pull origin main` in `/var/www/school-erp`.
4. Runs `npm run build` in the frontend directory and copies static assets.
5. Runs `pip install -r requirements.txt` and `alembic upgrade head` in the backend.
6. Gracefully reloads the backend via `pm2 reload school-erp-backend`.
7. Tests local health endpoint `http://127.0.0.1:8000/api/health`.

### 3.2. Server-Side Health Check Commands
Log into the server via SSH:
```bash
ssh root@187.127.176.21
```
Check status of all running services:
```bash
# Check PM2 backend process
pm2 status school-erp-backend

# Tail live backend application logs
pm2 logs school-erp-backend --lines 50

# Check Nginx status
systemctl status nginx

# Test backend API health directly
curl -I http://127.0.0.1:8000/api/health
```

---

## 4. Automated Database Backup & Disaster Recovery

### 4.1. Backup Automation Script (`/usr/local/bin/backup-school-erp.sh`)
```bash
#!/bin/bash
# 7A School ERP Daily MySQL Backup Script
BACKUP_DIR="/var/backups/school_erp"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p $BACKUP_DIR
# Backup all tenant & control databases with single-transaction consistency
mysqldump -u root --all-databases --single-transaction --quick > "$BACKUP_DIR/mysql_backup_$TIMESTAMP.sql"

# Retain backups for 30 days and delete older files
find $BACKUP_DIR -type f -name "*.sql" -mtime +30 -exec rm {} \;
```

### 4.2. Crontab Schedule (Automated Nightly Backup at 2:00 AM)
```bash
0 2 * * * /usr/local/bin/backup-school-erp.sh >> /var/log/school_erp_backup.log 2>&1
```

### 4.3. Point-in-Time Database Restoration Procedure
In the event of accidental data corruption or server migration:
```bash
# Restore entire database cluster from target SQL dump
mysql -u root < /var/backups/school_erp/mysql_backup_TARGET.sql
```

---

## 5. Domain Mapping & Free SSL/TLS Activation (Let's Encrypt)

Once the school administration decides on their public domain name (e.g., `erp.idealschool.edu.in`):

1. **DNS Configuration:** Add an `A Record` in the school's DNS provider:
   ```
   Type: A
   Host: erp (or @)
   Points to: 187.127.176.21
   TTL: 300 seconds
   ```
2. **Nginx Server Name Update:**
   Update `/etc/nginx/sites-available/school-erp`:
   ```nginx
   server_name erp.idealschool.edu.in;
   ```
3. **Issue SSL Certificate:**
   ```bash
   sudo certbot --nginx -d erp.idealschool.edu.in
   ```
4. **Verify HTTPS:**
   Certbot will automatically configure HTTP-to-HTTPS redirect (301) and set up automatic renewal in systemd.

---

## 6. Client Handover & Operational Guidelines

1. **Root Database Passwords:** Kept securely in `/var/www/school-erp/backend/.env`.
2. **Administrative Emergency Access:** Always retain at least two active accounts with role `ADMIN`.
3. **Support Escalation:** In case of infrastructure warnings, contact 7A Digital Solution technical support.

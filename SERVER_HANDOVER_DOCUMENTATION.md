# 📘 7A School ERP & Hostinger VPS — Server Handover & Developer Operations Manual

> **Document Type:** Production Infrastructure Handover & Operations Manual  
> **Server IP:** `187.127.176.21`  
> **Target Audience:** Incoming Backend/DevOps Developers, System Administrators, Project Leads  
> **Last Updated:** September 5, 2026  
> **Operating System:** Ubuntu 24.04 LTS (Noble Numbat)  

---

## 📑 Table of Contents
1. [Executive Infrastructure Overview](#1-executive-infrastructure-overview)
2. [Server Access & SSH Credentials](#2-server-access--ssh-credentials)
3. [Networking, Ports & Firewall (UFW)](#3-networking-ports--firewall-ufw)
4. [Installed Software Stack & Versions](#4-installed-software-stack--versions)
5. [Application Architecture & Routing](#5-application-architecture--routing)
6. [Nginx Configuration Architecture](#6-nginx-configuration-architecture)
7. [Directory Structure on Server](#7-directory-structure-on-server)
8. [Database Architecture & Credentials](#8-database-architecture--credentials)
9. [Pre-Seeded Roles & Administrative Access](#9-pre-seeded-roles--administrative-access)
10. [1-Click Deployment Workflow (Local to VPS)](#10-1-click-deployment-workflow-local-to-vps)
11. [Developer CLI Cheat Sheet & Operations](#11-developer-cli-cheat-sheet--operations)
12. [SSL / HTTPS Setup Guide (Domain Attachment)](#12-ssl--https-setup-guide-domain-attachment)
13. [Troubleshooting & Emergency FAQ](#13-troubleshooting--emergency-faq)

---

## 1. Executive Infrastructure Overview

The server at `187.127.176.21` is a Hostinger Cloud VPS running Ubuntu 24.04 LTS configured to host:
1. **Primary Project (Port 80)**: **7A Multi-Tenant School ERP**
   - **Frontend**: React 18 + Vite SPA served directly by Nginx from static production builds.
   - **Backend**: Python 3.12 + FastAPI asynchronously handled by Uvicorn and supervised by PM2.
   - **Database Model**: Multi-Tenant Hybrid architecture (Central Control Plane DB + Isolated Tenant DBs).
2. **Secondary Project (Port 8080)**: **Laravel Headless Commerce Engine**
   - **Web Root**: `/var/www/laravel-project/public`
   - **Runtime**: PHP 8.3-FPM via Unix domain socket (`/run/php/php8.3-fpm.sock`).
   - **Database**: MySQL database `laravel_db`.

---

## 2. Server Access & SSH Credentials

### Direct SSH Connection
```bash
# Connect as root:
ssh root@187.127.176.21
```
- **Server IP:** `187.127.176.21`
- **Username:** `root`
- **Password:** `Abdul@#762Abdul`
- **Port:** `22`

### SSH Key Setup (Optional for passwordless login)
- Local public key can be copied to VPS:
  `cat ~/.ssh/id_ed25519.pub | ssh root@187.127.176.21 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"`
- Developers can either login via the root password above or configure their public keys.

---

## 3. Networking, Ports & Firewall (UFW)

The Ubuntu Uncomplicated Firewall (`ufw`) is active with the following policy:

| Port | Protocol | Purpose | Status | Target Application |
| :--- | :--- | :--- | :--- | :--- |
| **22** | TCP | SSH Administration | ALLOWED | System Shell Access |
| **80** | TCP | HTTP Traffic | ALLOWED | School ERP (React Frontend + FastAPI Proxy) |
| **443** | TCP | HTTPS Traffic | ALLOWED | Reserved for SSL (Certbot Let's Encrypt) |
| **8080** | TCP | HTTP Alternate | ALLOWED | Laravel Project (PHP 8.3-FPM) |
| **8000** | TCP | Internal Loopback | **INTERNAL ONLY** | FastAPI Uvicorn (`127.0.0.1:8000`) |
| **3306** | TCP | Internal Loopback | **INTERNAL ONLY** | MySQL 8.0 Server (`127.0.0.1:3306`) |

```bash
# Check firewall status on VPS:
ufw status verbose
```

---

## 4. Installed Software Stack & Versions

All necessary runtimes and system packages are pre-installed and configured:

| Package | Version | Binary / Socket Path | Configuration Path |
| :--- | :--- | :--- | :--- |
| **Ubuntu Linux** | 24.04 LTS | `/bin/bash` | `/etc/os-release` |
| **Nginx** | 1.24.0 | `/usr/sbin/nginx` | `/etc/nginx/sites-available/default` |
| **Python** | 3.12.3 | `/var/www/school-erp/backend/venv/bin/python` | Virtualenv active at `/var/www/school-erp/backend/venv` |
| **Node.js** | v20.x LTS | `/usr/bin/node` | Global npm packages installed |
| **PM2** | 5.4.x | `/usr/local/bin/pm2` | Startup daemon enabled; `pm2 status` |
| **MySQL Server** | 8.0.x | `/usr/bin/mysql` | `/etc/mysql/mysql.conf.d/mysqld.cnf` |
| **PHP** | 8.3 | `/usr/bin/php8.3` | `/etc/php/8.3/fpm/php.ini` |
| **PHP-FPM** | 8.3-FPM | `/run/php/php8.3-fpm.sock` | `/etc/php/8.3/fpm/pool.d/www.conf` |
| **Composer** | 2.10.x | `/usr/local/bin/composer` | Global binary |
| **Git** | 2.43.x | `/usr/bin/git` | Global |

---

## 5. Application Architecture & Routing

```
[ Incoming Client Request: 187.127.176.21 ]
                 │
                 ▼
          ┌─────────────┐
          │    NGINX    │  (Port 80)
          └──────┬──────┘
                 │
        ┌────────┴───────────────────────────┐
        │                                    │
        ▼ (path: /api/*)                     ▼ (path: /*)
┌─────────────────────────┐        ┌──────────────────────────┐
│  Reverse Proxy to PM2   │        │  Vite React 18 SPA Dist  │
│  http://127.0.0.1:8000  │        │  /var/www/school-erp/    │
│  FastAPI + Uvicorn      │        │  frontend/dist/          │
└───────────┬─────────────┘        └──────────────────────────┘
            │
            ├────────────────────────────────┐
            ▼                                ▼
┌───────────────────────┐        ┌───────────────────────┐
│ Control Plane DB      │        │ Tenant School DB      │
│ `saas_control_db`     │        │ `tenant_sample_db`    │
│ (Tenants, Plans,      │        │ (Students, Fees,      │
│  SuperAdmin Auth)     │        │  Vouchers, Academic)  │
└───────────────────────┘        └───────────────────────┘
```

---

## 6. Nginx Configuration Architecture

File location on server: `/etc/nginx/sites-available/default`

```nginx
# ==========================================
# 1. School ERP (Port 80 - Default IP)
# ==========================================
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    root /var/www/school-erp/frontend/dist;
    index index.html;

    client_max_body_size 50M;

    # Frontend Single Page App Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend FastAPI Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Static Assets Cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}

# ==========================================
# 2. Laravel Project (Port 8080)
# ==========================================
server {
    listen 8080;
    listen [::]:8080;

    server_name _;

    root /var/www/laravel-project/public;
    index index.php index.html;

    client_max_body_size 50M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

---

## 7. Directory Structure on Server

```
/var/www/
├── school-erp/                      # Primary ERP Application Root
│   ├── .git/                        # Git tracking (origin -> abdul7621/SCHOOL-WITH-AFROZ-SIR)
│   ├── deploy.sh                    # Automated production rebuild script
│   ├── frontend/
│   │   ├── dist/                    # Compiled production build served by Nginx
│   │   ├── src/                     # React source components and pages
│   │   ├── .env.production          # VITE_API_URL=/api
│   │   ├── package.json
│   │   └── node_modules/
│   └── backend/
│       ├── venv/                    # Python 3.12 Virtual Environment
│       ├── app/                     # FastAPI core, routers, models, schemas
│       ├── database/                # Migrations & seed scripts
│       ├── requirements.txt         # Python dependencies
│       └── .env                     # Production database credentials & JWT keys
└── laravel-project/                 # Secondary Laravel Application Root (Port 8080)
    └── public/                      # Entry point for Laravel Nginx block
```

---

## 8. Database Architecture & Credentials

### Active Databases in MySQL:
1. **`saas_control_db`**:
   - Master SaaS Control Plane database.
   - Contains: `tenants` (registered schools), `subscriptions`, `plans`, and platform `superadmin_users`.
2. **`tenant_sample_db`**:
   - Isolated database for Model School (slug: `sample`).
   - Contains: `users`, `students` (45 pre-seeded demo students), `fee_structures`, `fee_vouchers`, `attendance_records`, `classes`, `sections`.
3. **`laravel_db`**:
   - Reserved database for the Laravel application.

### MySQL User Credentials:
- **Root User**: Socket authentication enabled for internal commands:
  ```bash
  mysql -u root
  ```
- **Laravel Dedicated User**:
  - Username: `laravel_user`
  - Password: `Laravel_Pass_2026!`
  - Privileges: Full privileges on `laravel_db.*` and `laravel_super_db.*`

### Backend `.env` on VPS (`/var/www/school-erp/backend/.env`):
```ini
ENVIRONMENT=production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
CONTROL_PLANE_DB=saas_control_db
JWT_SECRET=7A_Super_Secret_Production_Key_2026_ERP
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

---

## 9. Pre-Seeded Roles & Administrative Access

The application features full role isolation and navigation separation between SaaS Platform Operators and School Administrators:

### 👑 Platform Super Administrator
- **Login Email:** `superadmin@7aedu.com`
- **Password:** `AdminSecurePassword123!`
- **Role / Scope:** Platform SuperAdmin (Cross-school operator)
- **Target Dashboard:** `http://187.127.176.21/superadmin`
- **Capabilities:**
  - Create, suspend, or provision new school databases (Tenants).
  - Manage subscription packages, license limits, and platform billing.
  - Golden-themed SaaS Control Plane UI.

### 🏫 School Principal / Academic Administrator
- **Login Email:** `admin@sample.com`
- **Password:** `Admin123!`
- **Role / Scope:** School Principal (Tenant Database: `tenant_sample_db`)
- **Target Dashboard:** `http://187.127.176.21/`
- **Capabilities:**
  - Full academic administration: 45 enrolled students across grades.
  - Fee structure management, voucher generation, payment collection.
  - Daily student and staff attendance tracking.
  - Blue-themed Institutional School Management UI.

---

## 10. 1-Click Deployment Workflow (Local to VPS)

Developers do not need to manually SSH and execute rebuild commands every time code changes. A 1-click local-to-VPS deployment pipeline is configured.

### From Local Machine (`C:\Users\Admin\7A School ERP`):
Run either script from the project root:
```powershell
# Using Batch (recommended for Command Prompt / double-click):
.\deploy.bat

# OR Using PowerShell:
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

### What Happens Behind the Scenes:
1. **Local Phase**:
   - Detects all uncommitted files, commits them with an automated tag, and pushes directly to GitHub `origin/main`.
2. **Remote Trigger Phase**:
   - Executes remote SSH command on `root@187.127.176.21` to run `/var/www/school-erp/deploy.sh`.
3. **VPS Server Phase (`deploy.sh`)**:
   - Runs `git pull origin main`.
   - Activates virtualenv `/var/www/school-erp/backend/venv` and updates Python packages (`pip install -r requirements.txt`).
   - Runs backend database migrations.
   - Installs and compiles React Vite frontend (`npm install && npm run build`).
   - Restarts PM2 process `school-erp-backend`.
   - Tests and reloads Nginx (`nginx -t && systemctl reload nginx`).
4. **Completion**:
   - Displays live success status directly in the developer's local terminal.

---

## 11. Developer CLI Cheat Sheet & Operations

Quick reference commands when logged into `root@187.127.176.21`:

### PM2 Backend Management
```bash
# Check status of FastAPI backend:
pm2 status

# View live real-time backend logs:
pm2 logs school-erp-backend

# View error logs specifically:
tail -n 100 /root/.pm2/logs/school-erp-backend-error.log

# Restart backend process:
pm2 restart school-erp-backend

# Stop or Start backend:
pm2 stop school-erp-backend
pm2 start school-erp-backend
```

### Nginx Web Server Management
```bash
# Test configuration syntax:
nginx -t

# Reload Nginx without downtime:
systemctl reload nginx

# View live Nginx access and error logs:
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### MySQL Database Operations
```bash
# Enter MySQL console:
mysql -u root

# Show all databases:
mysql -e "SHOW DATABASES;"

# Backup Control Plane database:
mysqldump -u root saas_control_db > /root/saas_control_db_backup_$(date +%F).sql

# Backup Tenant database:
mysqldump -u root tenant_sample_db > /root/tenant_sample_db_backup_$(date +%F).sql

# Restore a database:
mysql -u root saas_control_db < /root/saas_control_db_backup.sql
```

### PHP 8.3-FPM (Laravel Project)
```bash
# Check PHP-FPM service:
systemctl status php8.3-fpm

# Restart PHP-FPM:
systemctl restart php8.3-fpm
```

---

## 12. SSL / HTTPS Setup Guide (Domain Attachment)

When ready to bind a live domain name (e.g. `erp.yourdomain.com` or `app.7aedu.com`) to the server:

1. **Point DNS Records**:
   - In your domain DNS manager, create an **A Record**:
     - `Type:` A
     - `Name:` `@` (or subdomain e.g. `erp`)
     - `Value / IP:` `187.127.176.21`
     - `TTL:` 300 (or Automatic)

2. **Update Nginx `server_name`**:
   Edit `/etc/nginx/sites-available/default`:
   ```nginx
   server_name erp.yourdomain.com;
   ```
   Test and reload: `nginx -t && systemctl reload nginx`.

3. **Install Certbot and Generate Free SSL**:
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d erp.yourdomain.com
   ```
   Certbot will automatically configure HTTPS redirects and auto-renewing SSL certificates.

---

## 13. Troubleshooting & Emergency FAQ

### Q1: Frontend displays a blank white screen or 404 on page reload?
- **Cause**: React Router requires Nginx to fallback to `index.html` for single-page routing.
- **Fix**: Verify `try_files $uri $uri/ /index.html;` exists inside the `location /` block in `/etc/nginx/sites-available/default`.

### Q2: API requests return 502 Bad Gateway?
- **Cause**: The FastAPI backend is not running on port 8000.
- **Fix**: Check `pm2 status`. If `school-erp-backend` is stopped or errored, run:
  ```bash
  pm2 logs school-erp-backend --lines 50
  pm2 restart school-erp-backend
  ```

### Q3: How to run manual backend migrations on the VPS?
- Run:
  ```bash
  cd /var/www/school-erp/backend
  source venv/bin/activate
  python -m app.database.migrate   # or alembic upgrade head
  ```

### Q4: How to recompile frontend assets on the VPS without full deploy?
- Run:
  ```bash
  cd /var/www/school-erp/frontend
  npm run build
  systemctl reload nginx
  ```

---

> **Support & Governance:**  
> This environment is engineered and maintained by the **7A Digital Solutions Engineering Team**. All automated pipelines and database scripts adhere to multi-tenant tenant-isolation security standards.

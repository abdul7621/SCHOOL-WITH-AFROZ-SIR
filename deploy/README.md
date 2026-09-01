# 7A School ERP — Turnkey Production Server Deployment Manual

This directory contains the production orchestration assets for deploying **7A School ERP** to a Hostinger VPS / CloudPanel instance.

---

## 📁 Directory Structure
```text
deploy/
├── nginx/
│   └── 7a_school_erp.conf     # Nginx reverse proxy for wildcard & custom domains
├── systemd/
│   ├── 7a_backend.service     # Gunicorn + Uvicorn Async FastAPI daemon
│   └── 7a_celery.service      # Celery background queue worker daemon
├── scripts/
│   ├── setup_vps.sh           # 1-Click VPS initial dependencies installer
│   └── backup_tenants.sh      # Automated multi-tenant daily database backup cron
└── README.md                  # This runbook
```

---

## 🚀 Step-by-Step Production Deployment

### Step 1: Initial VPS Setup
```bash
chmod +x deploy/scripts/setup_vps.sh
sudo ./deploy/scripts/setup_vps.sh
```

### Step 2: Backend Setup & Virtualenv
```bash
cd /var/www/7a-school-erp/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your MySQL root password, Redis URL, and JWT secret key
```

### Step 3: Frontend Build
```bash
cd /var/www/7a-school-erp/frontend
npm install
npm run build
```

### Step 4: Systemd Service Installation
```bash
sudo cp deploy/systemd/7a_backend.service /etc/systemd/system/
sudo cp deploy/systemd/7a_celery.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now 7a_backend.service
sudo systemctl enable --now 7a_celery.service
```

### Step 5: Nginx & SSL Setup
```bash
sudo cp deploy/nginx/7a_school_erp.conf /etc/nginx/sites-available/7a_school_erp.conf
sudo ln -s /etc/nginx/sites-available/7a_school_erp.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Issue Wildcard SSL for *.7aedu.com and Custom Domains:
sudo certbot --nginx -d 7aedu.com -d *.7aedu.com -d ume-school.com -d mmms-school.com
```

### Step 6: Automated Daily Backup Cron
```bash
sudo cp deploy/scripts/backup_tenants.sh /usr/local/bin/backup_tenants.sh
sudo chmod +x /usr/local/bin/backup_tenants.sh

# Add to root crontab (Runs daily at 2:00 AM)
sudo crontab -e
# Add line:
# 0 2 * * * /usr/local/bin/backup_tenants.sh >> /var/log/7a_backup.log 2>&1
```

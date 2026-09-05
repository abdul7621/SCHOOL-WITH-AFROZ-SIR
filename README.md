# 7A School ERP — Multi-Tenant SaaS Platform Engine (`7aedu.com`)

Production-grade, API-first **Multi-Tenant School ERP SaaS Platform** developed by **7A Digital Solution**.

> 📌 **Server & Deployment Handover Documentation**: For live Hostinger VPS infrastructure details (`187.127.176.21`), PM2, Nginx, MySQL databases, credentials, and 1-click deployment operations, see [SERVER_HANDOVER_DOCUMENTATION.md](SERVER_HANDOVER_DOCUMENTATION.md).

---

## 🏛️ Architectural Overview

* **Core Pattern**: Modular Monolith + API-First.
* **Tenancy Isolation**: Database-per-Tenant (`saas_control_db` + `tenant_<slug>_db`).
* **Connection Management**: Dynamic LRU Engine Pool Manager (Max 20 cached engines, lean 2-pool per tenant).
* **Domain Model**: Custom-Domain-First (`ume-school.com`, `mmms-school.com`, `admin.7aedu.com`, `sample.7aedu.com`).
* **Financial Integrity**: Zero destructive deletion on confirmed financial receipts; mandatory reversal vouchers with audit trail.
* **Storage**: Day-1 mandatory `StorageProvider` abstraction layer (Local NVMe on VPS $\rightarrow$ S3/R2 ready).
* **Stack**: FastAPI (Python 3.12+), SQLAlchemy 2.0 Async, MySQL 8.0, Redis 7.x, Celery, Nginx on CloudPanel.

---

## 📂 Project Structure

```text
7A School ERP/
├── backend/
│   ├── app/
│   │   ├── core/               # Configuration, Security, Dynamic DB Pool, Redis, Exceptions
│   │   ├── control_plane/      # SaaS Super Admin, Tenant Registry, Automated Provisioning
│   │   ├── middlewares/        # Dynamic Tenant Resolver, JWT Auth, Universal Audit
│   │   ├── modules/
│   │   │   ├── auth/           # Tenant User Login, Token Refresh, Profile
│   │   │   ├── users_rbac/     # Dynamic Roles, Permissions, UserRoles
│   │   │   ├── lookups/        # Dynamic Categories, Values, Student Statuses, Payment Modes
│   │   │   ├── settings/       # Dynamic School Configuration & Redis Caching
│   │   │   ├── development/    # Qualitative Criteria, Scales, Rules, Observations
│   │   │   └── audit/          # Immutable Tenant Action Logs
│   │   ├── shared/             # Base Models, Pagination, Storage Provider Abstraction
│   │   └── main.py             # FastAPI App Factory & Middleware Wiring
│   ├── scripts/
│   │   ├── init_control_db.py  # Control Plane Bootstrap & Super Admin Seed
│   │   └── provision_tenant.py # Automated CLI School Provisioning Tool
│   ├── tests/
│   │   ├── conftest.py         # Pytest fixtures & mock tenant tokens
│   │   └── test_tenant_isolation.py # Tenant isolation security test
│   ├── requirements.txt        # Production Python dependencies
│   └── .env.example            # Environment configuration template
└── README.md
```

---

## 🚀 Quick Start & Setup Guide

### 1. Environment Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / VPS
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

### 2. Initialize Control Database
```bash
python scripts/init_control_db.py
```

### 3. Provision Generic Sandbox Tenant (`sample.7aedu.com`)
```bash
python scripts/provision_tenant.py sample "Sample Model School" sample.7aedu.com admin@sample.7aedu.com 9876543210 SamplePass123!
```

### 4. Run Development Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

* **Swagger API Docs**: `http://127.0.0.1:8000/docs`
* **Health Check**: `http://127.0.0.1:8000/health`

### 5. Run Automated Tests
```bash
pytest tests/ -v
```

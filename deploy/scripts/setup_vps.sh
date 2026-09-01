#!/bin/bash
# ==============================================================================
# 7A School ERP — 1-Click Hostinger VPS / Ubuntu 22.04/24.04 Provisioner
# ==============================================================================
set -e

echo "=== Starting 7A School ERP VPS Environment Setup ==="

# 1. System Updates
sudo apt-get update -y && sudo apt-get upgrade -y

# 2. Install Essentials: Python 3.11/3.12, Node.js 20, MySQL, Redis, Nginx, Git, Certbot
sudo apt-get install -y python3-pip python3-venv python3-dev \
    mysql-server redis-server nginx git certbot python3-certbot-nginx \
    build-essential libssl-dev libffi-dev pkg-config default-libmysqlclient-dev

# 3. Node.js 20.x Setup
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Redis Configuration (Maxmemory 256MB LRU)
sudo sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sudo sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
sudo systemctl restart redis-server

# 5. MySQL Configuration (Max connections 150 for 4GB/8GB VPS)
sudo systemctl start mysql
sudo systemctl enable mysql

echo "=== VPS Dependencies and Services Configured Successfully ==="

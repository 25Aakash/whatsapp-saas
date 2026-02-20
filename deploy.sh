#!/bin/bash
# ============================================================
# WhatsApp SaaS — Production Deployment Script for EC2 (PM2)
# Run this on your Ubuntu EC2 instance
# ============================================================

set -euo pipefail

APP_DIR="/opt/whatsapp-saas"
DOMAIN="app.karssoft.com"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
NODE_VERSION="20"

echo "=========================================="
echo "  WhatsApp SaaS — Production Deployment"
echo "  (PM2 + Nginx + Let's Encrypt)"
echo "=========================================="

# ---- Step 1: System Prerequisites ----
echo ""
echo "[1/8] Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "  Node.js: $(node -v)"
echo "  npm: $(npm -v)"

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

echo "  PM2: $(pm2 -v)"

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt update && sudo apt install -y nginx
fi

# Install Certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    sudo apt install -y certbot python3-certbot-nginx
fi

# Check MongoDB
if ! command -v mongod &> /dev/null && ! systemctl is-active --quiet mongod 2>/dev/null; then
    echo "WARNING: MongoDB doesn't seem to be running. Make sure it's installed and started."
fi

# Check Redis
if ! command -v redis-cli &> /dev/null && ! systemctl is-active --quiet redis-server 2>/dev/null; then
    echo "WARNING: Redis doesn't seem to be running. Make sure it's installed and started."
fi

# ---- Step 2: Create app directory ----
echo ""
echo "[2/8] Setting up application directory..."

sudo mkdir -p ${APP_DIR}
sudo mkdir -p ${APP_DIR}/logs
sudo chown -R $USER:$USER ${APP_DIR}

if [ ! -f "${APP_DIR}/backend/package.json" ]; then
    echo ""
    echo "Project files not found at ${APP_DIR}/"
    echo "Copy your project files first:"
    echo ""
    echo "  # From your local machine (Windows):"
    echo "  scp -r * ubuntu@<ec2-ip>:${APP_DIR}/"
    echo ""
    echo "  # Or git clone:"
    echo "  git clone <your-repo-url> ${APP_DIR}"
    echo ""
    echo "Then run this script again."
    exit 0
fi

cd ${APP_DIR}

# ---- Step 3: Environment file ----
echo ""
echo "[3/8] Checking environment configuration..."

if [ ! -f "${APP_DIR}/backend/.env" ]; then
    if [ -f "${APP_DIR}/backend/.env.production" ]; then
        cp ${APP_DIR}/backend/.env.production ${APP_DIR}/backend/.env
        echo ""
        echo "================================================================"
        echo "  backend/.env was created from .env.production template."
        echo "  You MUST edit it with real values before continuing!"
        echo ""
        echo "    nano ${APP_DIR}/backend/.env"
        echo ""
        echo "  Generate secrets with:"
        echo "    JWT_SECRET:     node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
        echo "    ENCRYPTION_KEY: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        echo ""
        echo "  Fill in your Meta credentials:"
        echo "    META_APP_ID, META_APP_SECRET, WHATSAPP_APP_SECRET,"
        echo "    WHATSAPP_VERIFY_TOKEN"
        echo "================================================================"
        echo ""
        echo "After editing, run this script again."
        exit 0
    else
        echo "ERROR: No backend/.env file found."
        echo "Create one from .env.production or .env.example"
        exit 1
    fi
fi

# Verify critical env vars are not placeholders
source ${APP_DIR}/backend/.env
if [[ "${JWT_SECRET:-}" == *"CHANGE_ME"* ]] || [[ "${ENCRYPTION_KEY:-}" == *"CHANGE_ME"* ]]; then
    echo ""
    echo "ERROR: backend/.env still has placeholder values."
    echo "Edit the file and replace all CHANGE_ME values:"
    echo "  nano ${APP_DIR}/backend/.env"
    exit 1
fi

# ---- Step 4: Install dependencies ----
echo ""
echo "[4/8] Installing dependencies..."

cd ${APP_DIR}/backend
npm ci --production
echo "  Backend dependencies installed"

cd ${APP_DIR}/frontend
npm ci
echo "  Frontend dependencies installed"

# ---- Step 5: Build frontend ----
echo ""
echo "[5/8] Building frontend..."

cd ${APP_DIR}/frontend
NEXT_PUBLIC_API_URL="https://${DOMAIN}/api/v1" \
NEXT_PUBLIC_SOCKET_URL="https://${DOMAIN}" \
npm run build
echo "  Frontend built successfully"

# ---- Step 6: Configure Nginx ----
echo ""
echo "[6/8] Configuring Nginx for ${DOMAIN}..."

if [ -f "${APP_DIR}/nginx/${DOMAIN}.conf" ]; then
    sudo cp "${APP_DIR}/nginx/${DOMAIN}.conf" "${NGINX_CONF}"

    # Enable the site (remove old symlink if exists)
    sudo rm -f "/etc/nginx/sites-enabled/${DOMAIN}"
    sudo ln -s "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}"

    # Test Nginx config
    if sudo nginx -t 2>&1; then
        sudo systemctl reload nginx
        echo "  Nginx configured and reloaded"
    else
        echo "  ERROR: Nginx config test failed. Check the config file."
        exit 1
    fi
else
    echo "  WARNING: nginx/${DOMAIN}.conf not found. Skipping Nginx setup."
    echo "  You'll need to configure Nginx manually."
fi

# ---- Step 7: SSL Certificate ----
echo ""
echo "[7/8] Setting up SSL certificate..."

if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
    echo "  Obtaining SSL certificate for ${DOMAIN}..."
    echo "  Make sure DNS A record for ${DOMAIN} points to this server's IP!"
    echo ""
    sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@karssoft.com
    echo "  SSL certificate obtained!"
else
    echo "  SSL certificate already exists for ${DOMAIN}"
    # Ensure auto-renewal is set up
    sudo certbot renew --dry-run 2>/dev/null || echo "  (renew dry-run skipped)"
fi

# ---- Step 8: Start with PM2 ----
echo ""
echo "[8/8] Starting services with PM2..."

cd ${APP_DIR}

# Stop existing instances if running
pm2 delete wa-saas-backend 2>/dev/null || true
pm2 delete wa-saas-frontend 2>/dev/null || true

# Start using ecosystem config
pm2 start ecosystem.config.js

# Save PM2 process list so it restarts on reboot
pm2 save

# Set up PM2 startup script (survives reboots)
sudo env PATH=$PATH:$(which node) $(which pm2) startup systemd -u $USER --hp $HOME 2>/dev/null || true

echo ""
echo "Waiting for services to start..."
sleep 5

# ---- Verify ----
echo ""
echo "Verifying deployment..."

if curl -sf http://127.0.0.1:5000/api/v1/health > /dev/null 2>&1; then
    echo "  ✓ Backend API is running"
else
    echo "  ✗ Backend not responding yet (check: pm2 logs wa-saas-backend)"
fi

if curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; then
    echo "  ✓ Frontend is running"
else
    echo "  ✗ Frontend not responding yet (check: pm2 logs wa-saas-frontend)"
fi

if curl -sf "https://${DOMAIN}/api/v1/health" > /dev/null 2>&1; then
    echo "  ✓ HTTPS is working via Nginx"
else
    echo "  ✗ HTTPS not working yet (check: sudo tail -f /var/log/nginx/error.log)"
fi

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "  Frontend:  https://${DOMAIN}"
echo "  API:       https://${DOMAIN}/api/v1"
echo "  API Docs:  https://${DOMAIN}/api/docs"
echo "  Health:    https://${DOMAIN}/api/v1/health"
echo "  Webhook:   https://${DOMAIN}/api/v1/webhook"
echo ""
echo "  PM2 COMMANDS:"
echo "    pm2 status              — see running processes"
echo "    pm2 logs                — view all logs"
echo "    pm2 logs wa-saas-backend  — backend logs only"
echo "    pm2 restart all         — restart everything"
echo "    pm2 monit               — real-time monitoring"
echo ""
echo "  UPDATE META APP DASHBOARD:"
echo "    Webhook URL:        https://${DOMAIN}/api/v1/webhook"
echo "    Data Deletion URL:  https://${DOMAIN}/api/v1/data-deletion"
echo "    Privacy Policy:     https://${DOMAIN}/privacy"
echo "    Terms of Service:   https://${DOMAIN}/terms"
echo ""
echo "=========================================="

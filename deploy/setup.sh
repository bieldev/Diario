#!/bin/bash
# Script de instalação completa do Diário da Helena no VPS
# Uso: bash setup.sh IP_DO_VPS
# Exemplo: bash setup.sh 45.67.89.123
#
# O domínio será gerado automaticamente via sslip.io:
#   45.67.89.123 → 45-67-89-123.sslip.io (HTTPS grátis, sem domínio próprio)

set -e
IP=${1:?"Informe o IP do VPS: bash setup.sh 45.67.89.123"}
DOMAIN=$(echo $IP | tr '.' '-').sslip.io
APP_DIR="/opt/diario"
REPO_URL="https://github.com/bieldev/Diario.git"

echo "🚀 Iniciando instalação do Diário da Helena..."
echo "   IP: $IP"
echo "   Domínio: $DOMAIN"

# ─── Dependências ────────────────────────────────────────────────────────────
apt-get update -q
apt-get install -y git curl nginx ufw certbot python3-certbot-nginx

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# PM2
npm install -g pm2

# ─── Código ──────────────────────────────────────────────────────────────────
mkdir -p $APP_DIR/data $APP_DIR/logs
git clone $REPO_URL $APP_DIR

# Backend
cd $APP_DIR/backend
npm install --omit=dev

# Frontend
cd $APP_DIR/frontend
npm install
npm run build

# ─── Nginx (HTTP primeiro, para o Certbot funcionar) ─────────────────────────
sed "s/SEU_DOMINIO/$DOMAIN/g" $APP_DIR/deploy/nginx.conf > /etc/nginx/sites-available/helena
ln -sf /etc/nginx/sites-available/helena /etc/nginx/sites-enabled/helena
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ─── HTTPS via Let's Encrypt (sslip.io aceita normalmente) ───────────────────
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@sslip.io

# ─── PM2 ─────────────────────────────────────────────────────────────────────
sed -i "s/SEU_DOMINIO/$DOMAIN/g" $APP_DIR/deploy/ecosystem.config.cjs
cd $APP_DIR
pm2 start deploy/ecosystem.config.cjs --env production
pm2 save
pm2 startup | tail -1 | bash

# ─── Firewall ────────────────────────────────────────────────────────────────
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ─── Backup automático do banco (3h da manhã) ────────────────────────────────
(crontab -l 2>/dev/null; echo "0 3 * * * cp $APP_DIR/data/helena.db $APP_DIR/data/backup-\$(date +\%F).db") | crontab -

echo ""
echo "✅ Instalação concluída!"
echo "   App: https://$DOMAIN"
echo "   Logs: pm2 logs helena-backend"
echo "   Status: pm2 status"

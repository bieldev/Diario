#!/bin/bash
# Script de instalação completa do Diário da Helena no VPS
# Uso: bash setup.sh SEU_DOMINIO
# Exemplo: bash setup.sh helena.meudominio.com

set -e
DOMAIN=${1:?"Informe o domínio: bash setup.sh meudominio.com"}
APP_DIR="/opt/diario"
REPO_URL="COLOQUE_A_URL_DO_SEU_REPOSITORIO_GIT_AQUI"

echo "🚀 Iniciando instalação do Diário da Helena..."

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
cat > .env.production <<EOF
VITE_API_URL=https://$DOMAIN
EOF
npm install
npm run build

# ─── Nginx ───────────────────────────────────────────────────────────────────
sed "s/SEU_DOMINIO/$DOMAIN/g" $APP_DIR/deploy/nginx.conf > /etc/nginx/sites-available/helena
ln -sf /etc/nginx/sites-available/helena /etc/nginx/sites-enabled/helena
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ─── HTTPS ───────────────────────────────────────────────────────────────────
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m contato@$DOMAIN

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

# ─── Backup automático do banco ──────────────────────────────────────────────
(crontab -l 2>/dev/null; echo "0 3 * * * cp $APP_DIR/data/helena.db $APP_DIR/data/backup-\$(date +\%F).db") | crontab -

echo ""
echo "✅ Instalação concluída!"
echo "   App disponível em: https://$DOMAIN"
echo "   Logs: pm2 logs helena-backend"
echo "   Status: pm2 status"

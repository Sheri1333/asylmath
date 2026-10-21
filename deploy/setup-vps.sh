#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/asylmath"
REPO="https://github.com/Sheri1333/asylmath.git"
PUBLIC_ORIGIN="http://195.49.212.31:8080"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash deploy/setup-vps.sh"
  exit 1
fi

APP_USER="${SUDO_USER:-ubuntu}"

if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p /var/www
  git clone "$REPO" "$APP_DIR"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

ENV_FILE="$APP_DIR/server/.env"
if [ ! -f "$ENV_FILE" ]; then
  JWT="$(openssl rand -hex 32)"
  cat > "$ENV_FILE" <<EOF
HOST=127.0.0.1
PORT=3002
JWT_SECRET=$JWT
MONGODB_URI=mongodb://127.0.0.1:27017/asylmath
CORS_ORIGIN=$PUBLIC_ORIGIN
EOF
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

cat > /etc/sudoers.d/asylmath <<EOF
$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart asylmath-api, /usr/bin/systemctl reload nginx, /usr/sbin/nginx
EOF
chmod 440 /etc/sudoers.d/asylmath

cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/asylmath
ln -sfn /etc/nginx/sites-available/asylmath /etc/nginx/sites-enabled/asylmath
nginx -t
systemctl reload nginx

cp "$APP_DIR/deploy/asylmath-api.service" /etc/systemd/system/asylmath-api.service
cp "$APP_DIR/deploy/asylmath-watch.service" /etc/systemd/system/asylmath-watch.service
cp "$APP_DIR/deploy/asylmath-watch.timer" /etc/systemd/system/asylmath-watch.timer
systemctl daemon-reload
systemctl enable asylmath-api asylmath-watch.timer

sudo -u "$APP_USER" -H bash "$APP_DIR/deploy/deploy.sh"
systemctl enable --now asylmath-api
systemctl start asylmath-watch.timer

if command -v mongosh >/dev/null 2>&1; then
  COUNT="$(mongosh --quiet --eval 'db.getSiblingDB("asylmath").users.countDocuments()' || echo 0)"
  if [ "$COUNT" = "0" ]; then
    sudo -u "$APP_USER" -H bash -lc "cd $APP_DIR/server && npm run seed"
  fi
fi

ufw allow 8080/tcp || true
echo "==> ready: $PUBLIC_ORIGIN"

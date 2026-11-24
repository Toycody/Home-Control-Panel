#!/usr/bin/env bash
# Home Control Panel — install or update on a Debian 13 LXC. Run as root.
#
#   First install:  bash install.sh http://<HA-IP>:8123 [http://<KUMA-IP>:3001]
#   Update later:   bash /opt/home-control-panel/deploy/install.sh
#
# Safe to re-run: it pulls the latest code, keeps your app/config.js, and only
# rewrites the nginx site when an HA address is given.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Toycody/Home-Control-Panel.git}"
APP_ROOT=/opt/home-control-panel
HA_URL="${1:-}"
KUMA_URL="${2:-}"

if [[ $EUID -ne 0 ]]; then echo "Run as root." >&2; exit 1; fi

echo "==> Packages"
apt-get update -qq
apt-get install -y -qq nginx git ca-certificates >/dev/null

echo "==> Code"
if [[ -d "$APP_ROOT/.git" ]]; then
  git -C "$APP_ROOT" pull --ff-only
else
  git clone "$REPO_URL" "$APP_ROOT"
fi

CONFIG="$APP_ROOT/app/config.js"
if [[ ! -f "$CONFIG" ]]; then
  cp "$APP_ROOT/app/config.example.js" "$CONFIG"
  echo "    Created $CONFIG from the example."
fi

if [[ -n "$HA_URL" ]]; then
  HA_URL="${HA_URL%/}"
  if [[ ! "$HA_URL" =~ ^https?://[^/]+$ ]]; then echo "HA address should look like http://192.168.1.20:8123" >&2; exit 1; fi
  echo "==> Pointing the panel at $HA_URL"
  sed -i "s#haUrl: '[^']*'#haUrl: '$HA_URL'#" "$CONFIG"
  KUMA_URL="${KUMA_URL%/}"
  if [[ -n "$KUMA_URL" ]]; then
    echo "==> Uptime Kuma at $KUMA_URL"
    KUMA_SED=(-e "s#@KUMA_URL@#$KUMA_URL#g")
  else
    KUMA_SED=(-e '/#KUMA_BEGIN/,/#KUMA_END/d')
  fi
  sed -e "s#@HA_URL@#$HA_URL#g" -e "s#@APP_DIR@#$APP_ROOT/app#g" "${KUMA_SED[@]}" \
    "$APP_ROOT/deploy/nginx-site.conf.template" > /etc/nginx/sites-available/home-control-panel
  ln -sf /etc/nginx/sites-available/home-control-panel /etc/nginx/sites-enabled/home-control-panel
  rm -f /etc/nginx/sites-enabled/default
fi

echo "==> nginx"
nginx -t
systemctl enable --now nginx >/dev/null
systemctl reload nginx

IP=$(hostname -I | awk '{print $1}')
echo
echo "Done. Panel: http://$IP/"
echo "Check HA is reachable through the proxy (expect 401 = good, HA answered):"
echo "  curl -s -o /dev/null -w '%{http_code}\n' http://localhost/api/"
if [[ -n "$KUMA_URL" ]]; then
  echo "Check Uptime Kuma through the proxy (expect 200):"
  echo "  curl -s -o /dev/null -w '%{http_code}\n' http://localhost/kuma/api/status-page/<your-slug>"
fi

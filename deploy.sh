#!/bin/bash
# Aether Energy — native deploy script
# Run from /root/aether-energy on the VPS
# Usage: ./deploy.sh [--no-pull] [--no-build]
set -euo pipefail

cd "$(dirname "$0")"

PULL=true
BUILD=true
for arg in "$@"; do
  case "$arg" in
    --no-pull) PULL=false ;;
    --no-build) BUILD=false ;;
  esac
done

echo "=== Aether Energy deploy ==="
echo "  Time:    $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "  Branch:  $(git branch --show-current)"
echo "  Commit:  $(git rev-parse --short HEAD)"
echo

if [ "$PULL" = true ]; then
  echo "--- git pull ---"
  git fetch origin
  git reset --hard origin/main
fi

if [ "$BUILD" = true ]; then
  echo "--- pnpm install ---"
  pnpm install --frozen-lockfile 2>&1 | tail -2
  echo "--- pnpm build ---"
  pnpm build 2>&1 | tail -3
fi

echo "--- pm2 reload (with .env via ecosystem) ---"
pm2 delete aether 2>/dev/null || true
pm2 start /root/aether-energy/ecosystem.config.cjs
pm2 save --force

echo
echo "--- health check ---"
sleep 3
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/live)
echo "  /live:    HTTP $HTTP"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ready)
echo "  /ready:   HTTP $HTTP"
if [ "$HTTP" != "200" ]; then
  echo "  HEALTH CHECK FAILED — check pm2 logs"
  pm2 logs aether --lines 30 --nostream
  exit 1
fi

echo
echo "=== DEPLOYED ==="
pm2 status aether | tail -3 | head -2

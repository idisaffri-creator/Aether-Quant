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

echo "--- pm2 reload ---"
pm2 reload aether 2>/dev/null || pm2 start dist/index.js --name aether -i 1 --time
pm2 save --force

echo
echo "--- health check ---"
sleep 2
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health)
echo "  /api/health: HTTP $HTTP"
if [ "$HTTP" != "200" ]; then
  echo "  HEALTH CHECK FAILED — rolling back"
  exit 1
fi

echo
echo "=== DEPLOYED ==="
pm2 status aether | tail -3 | head -2

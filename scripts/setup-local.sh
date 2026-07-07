#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f wp-config.php ]; then
  cp wp-config.example.php wp-config.php
  echo "已建立 wp-config.php"
fi

echo "啟動 Docker..."
docker compose up -d

echo "等待資料庫..."
sleep 15

TABLE_COUNT=$(docker compose exec -T db mariadb -uwordpress -pwordpress uniquelogic_web2026 -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='uniquelogic_web2026';" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -lt 10 ] && [ -f data/initial-database.sql ]; then
  echo "匯入資料庫（第一次才需要，可能需要 1-2 分鐘）..."
  grep -v "^mysqldump:" data/initial-database.sql | docker compose exec -T db mariadb -uwordpress -pwordpress uniquelogic_web2026
  docker compose run --rm wpcli search-replace 'https://uniquelogic.com' 'http://localhost:8080' --all-tables --skip-columns=guid
  docker compose run --rm wpcli search-replace 'http://uniquelogic.com' 'http://localhost:8080' --all-tables --skip-columns=guid
  docker compose run --rm wpcli plugin deactivate really-simple-ssl wordfence litespeed-cache --quiet || true
  echo "資料庫匯入完成。"
fi

echo ""
echo "本機網站: http://localhost:8080"

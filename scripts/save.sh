#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ $# -lt 1 ]; then
  echo "用法: ./scripts/save.sh \"描述你改了什麼\""
  echo "例子: ./scripts/save.sh \"更新首頁 hero 區塊間距\""
  exit 1
fi

MESSAGE="$1"

git add content/ wp-content/mu-plugins/ docker-compose.yml scripts/ README.md .gitignore wp-config.example.php data/ 2>/dev/null || true

if git diff --cached --quiet; then
  echo "沒有偵測到可儲存的修改。"
  echo "如果你改的是 CSS / HTML / JS，請確認檔案在 content/ 資料夾內。"
  exit 0
fi

git commit -m "$MESSAGE"
git push

echo ""
echo "已儲存到 GitHub。"
echo "同事可以用 git pull 取得你的最新修改。"

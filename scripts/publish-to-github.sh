#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GH_BIN="${GH_BIN:-gh}"
if ! command -v "$GH_BIN" >/dev/null 2>&1; then
  if [ -x /tmp/gh-extract2/gh_2.67.0_macOS_arm64/bin/gh ]; then
    GH_BIN=/tmp/gh-extract2/gh_2.67.0_macOS_arm64/bin/gh
  else
    echo "找不到 gh。請先安裝 GitHub CLI，或完成 Cursor 裡的 GitHub 登入步驟。"
    exit 1
  fi
fi

if ! "$GH_BIN" auth status >/dev/null 2>&1; then
  echo "請先登入 GitHub："
  "$GH_BIN" auth login --hostname github.com --git-protocol ssh --web
fi

if ! "$GH_BIN" repo view AiloTon2/Unique-logic-edit >/dev/null 2>&1; then
  echo "建立 repository: Unique-logic-edit"
  "$GH_BIN" repo create Unique-logic-edit --public --description "Unique Logic website UI edits for local Docker preview"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin git@github.com:AiloTon2/Unique-logic-edit.git
fi

git push -u origin main

echo ""
echo "完成！Repository: https://github.com/AiloTon2/Unique-logic-edit"

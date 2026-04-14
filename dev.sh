#!/usr/bin/env bash
# 一鍵啟動：vite build → FastAPI serve dist/ + API（單一 process、單一 port）
# 用法: ./dev.sh 或 PORT=9000 ./dev.sh
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
VENV="$BACKEND_DIR/.venv"

RED='\033[0;31m'
GREEN='\033[0;32m'
DIM='\033[2m'
RESET='\033[0m'

find_free_port() {
  local port=$1
  while lsof -ti:"$port" >/dev/null 2>&1; do
    echo -e "${DIM}Port $port in use, trying $((port + 1))...${RESET}" >&2
    port=$((port + 1))
  done
  echo "$port"
}

PORT=$(find_free_port "${PORT:-8000}")

if [ ! -d "$VENV" ]; then
  echo -e "${RED}No venv found at $VENV${RESET}"
  echo "Run: cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi

echo -e "${GREEN}Building frontend...${RESET}"
npx vite build

echo -e "${GREEN}Starting server${RESET} ${DIM}(http://127.0.0.1:$PORT)${RESET}"
cd "$BACKEND_DIR"
exec "$VENV/bin/uvicorn" main:app --host 127.0.0.1 --port "$PORT"

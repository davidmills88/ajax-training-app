#!/usr/bin/env bash
# Thin launcher so `npm run assign:from-intake` uses the workspace tsx binary.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TSX="$ROOT/node_modules/.bin/tsx"
if [[ ! -x "$TSX" ]]; then
  TSX="$ROOT/packages/shared/node_modules/.bin/tsx"
fi
if [[ ! -x "$TSX" ]]; then
  TSX="$ROOT/apps/api/node_modules/.bin/tsx"
fi
if [[ ! -x "$TSX" ]]; then
  echo "tsx not found. Run npm install from the repo root." >&2
  exit 1
fi
exec "$TSX" "$ROOT/scripts/assign-from-intake.ts" "$@"

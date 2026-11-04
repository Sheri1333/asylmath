#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

git fetch origin
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"

# Redeploy when main moved, or when HEAD matches but dist is missing/stale
# (failed build after reset --hard leaves git current and skips forever).
NEED=0
if [ "$LOCAL" != "$REMOTE" ]; then
  NEED=1
  echo "==> new commits $LOCAL -> $REMOTE"
elif [ ! -f "$ROOT/dist/index.html" ]; then
  NEED=1
  echo "==> dist missing, rebuilding $LOCAL"
else
  DIST_T="$(stat -c %Y "$ROOT/dist/index.html" 2>/dev/null || stat -f %m "$ROOT/dist/index.html")"
  HEAD_T="$(git log -1 --format=%ct)"
  if [ -n "$DIST_T" ] && [ -n "$HEAD_T" ] && [ "$DIST_T" -lt "$HEAD_T" ]; then
    NEED=1
    echo "==> dist older than HEAD, rebuilding $LOCAL"
  fi
fi

if [ "$NEED" -eq 0 ]; then
  exit 0
fi

exec "$ROOT/deploy/deploy.sh"

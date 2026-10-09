#!/bin/bash
# Robust launcher for pocketbase using the double-fork pattern.
# This pattern survives the parent bash session exiting because the
# grandchild becomes a child of PID 1 (tini) and is no longer in the
# bash session's process group, so SIGHUP from the parent shell does
# not reach it.
#
# Usage:
#   ./launch.sh            # launches if not already running
#   ./launch.sh --restart  # kills existing instance and relaunches

set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
LOGFILE="/tmp/mini-service-pocketbase-service.log"
RESTART="${1:-}"

# If --restart, kill any existing instance first
if [ "$RESTART" = "--restart" ]; then
  pkill -f "pocketbase serve --http=127.0.0.1:8090" 2>/dev/null || true
  sleep 1
fi

# Already running?
if pgrep -f "pocketbase serve --http=127.0.0.1:8090" >/dev/null 2>&1; then
  echo "[launch] pocketbase already running, nothing to do."
  exit 0
fi

mkdir -p "$HERE/pb_data" "$HERE/pb_public" "$HERE/pb_migrations" "$HERE/pb_hooks"

# Double-fork: outer subshell spawns setsid'd grandchild and exits.
(
  setsid bash -c "
    cd '$HERE'
    exec ./pocketbase serve \
      --http=127.0.0.1:8090 \
      --dir=./pb_data \
      --publicDir=./pb_public \
      --hooksDir=./pb_hooks \
      --migrationsDir=./pb_migrations
  " < /dev/null > "$LOGFILE" 2>&1 &
  disown
)

# Give it a moment to come up
sleep 2
if pgrep -f "pocketbase serve --http=127.0.0.1:8090" >/dev/null 2>&1; then
  echo "[launch] pocketbase started OK (PID $(pgrep -f 'pocketbase serve --http=127.0.0.1:8090' | head -1))"
else
  echo "[launch] WARNING: pocketbase did not start; see $LOGFILE"
  exit 1
fi

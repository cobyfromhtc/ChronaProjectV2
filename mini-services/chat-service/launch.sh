#!/bin/bash
# Robust launcher for the chat-service using the double-fork pattern.
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
LOGFILE="/tmp/mini-service-chat-service.log"
RESTART="${1:-}"

# If --restart, kill any existing instance first
if [ "$RESTART" = "--restart" ]; then
  pkill -f "bun --hot index.ts" 2>/dev/null || true
  sleep 1
fi

# Already running?
if pgrep -f "bun --hot index.ts" >/dev/null 2>&1; then
  echo "[launch] chat-service already running, nothing to do."
  exit 0
fi

# Double-fork: outer subshell spawns setsid'd grandchild and exits.
(
  setsid bash -c "
    cd '$HERE'
    exec bun --hot index.ts
  " < /dev/null > "$LOGFILE" 2>&1 &
  disown
)

# Give it a moment to come up
sleep 3
if pgrep -f "bun --hot index.ts" >/dev/null 2>&1; then
  echo "[launch] chat-service started OK (PID $(pgrep -f 'bun --hot index.ts' | head -1))"
else
  echo "[launch] WARNING: chat-service did not start; see $LOGFILE"
  exit 1
fi

#!/bin/bash
# Detached launcher for the ChronaProjectV2 Next.js dev server (port 3000).
# Uses the double-fork pattern (like pocketbase/chat-service launchers) so the
# server survives the parent bash session exiting: the grandchild is re-parented
# to PID 1 and never receives the parent shell's SIGHUP.
#
# Usage:
#   ./launch.sh            # starts if not already running
#   ./launch.sh --restart  # kills existing chain and relaunches

set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
LOGFILE="/home/z/my-project/dev.log"
RESTART="${1:-}"

if [ "$RESTART" = "--restart" ]; then
  pkill -f "next dev -p 3000" 2>/dev/null || true
  sleep 2
fi

# Already running?
if curl -s -m 3 -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
  # Something is listening — confirm it's our app
  if pgrep -f "next dev -p 3000" >/dev/null 2>&1; then
    echo "[launch] next dev already running, nothing to do."
    exit 0
  fi
fi

# Double-fork: outer subshell spawns setsid'd grandchild and exits.
# Runs the ROOT project's dev script (cd ChronaProjectV2 && bun run dev |
# tee /home/z/my-project/dev.log) so logs keep flowing to the canonical
# /home/z/my-project/dev.log.
(
  setsid bash -c "
    cd /home/z/my-project
    exec bun run dev
  " < /dev/null > /dev/null 2>&1 &
  disown
)

# Give it a moment to come up
for i in $(seq 1 30); do
  if curl -s -m 2 -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
    echo "[launch] next dev up (attempt $i)"
    exit 0
  fi
  sleep 2
done
echo "[launch] WARNING: app did not respond on :3000 after 60s; see $LOGFILE"
exit 1

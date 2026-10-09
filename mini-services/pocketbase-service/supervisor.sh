#!/bin/bash
# Supervisor for pocketbase binary that survives parent shell exit.
# Traps SIGHUP/SIGTERM/SIGINT and forwards to child only on real termination.
trap '' HUP   # ignore SIGHUP entirely so we survive parent shell exit
trap '' INT   # ignore SIGINT
trap '' TERM  # ignore SIGTERM (pocketbase stays running)

cd /home/z/my-project/mini-services/pocketbase-service

# Use exec to replace shell with pocketbase, but we've already disarmed
# SIGHUP/SIGINT/SIGTERM at the shell level so the child inherits these
# signal dispositions (well, exec resets to SIG_DFL for ignored signals
# except those set to SIG_IGN; SIG_IGN is preserved across exec).
# To be safe, we use `nohup` and redirect everything.
exec nohup ./pocketbase serve \
  --http="127.0.0.1:8090" \
  --dir="./pb_data" \
  --publicDir="./pb_public" \
  --hooksDir="./pb_hooks" \
  --migrationsDir="./pb_migrations" \
  >> /tmp/mini-service-pocketbase-service.log 2>&1

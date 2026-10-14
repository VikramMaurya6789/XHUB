#!/bin/bash
# XHUB catalog builder watchdog — restarts build-catalog.mjs if dead.
# Called by cron every 15 min until catalog reaches 50k.
cd /home/hatch/workspace/xhub-sync || exit 1

COUNT=$(python3 -c "import json; print(len(json.load(open('public/catalog.json'))))" 2>/dev/null || echo 0)
if [ "$COUNT" -ge 50000 ]; then
  echo "catalog complete: $COUNT"
  exit 0
fi

if pgrep -f "build-catalog.mjs" > /dev/null; then
  echo "running, catalog: $COUNT"
else
  echo "DEAD — restarting (catalog was $COUNT)"
  nohup node scripts/build-catalog.mjs >> /tmp/catalog.log 2>&1 &
  echo "restarted pid $!"
fi

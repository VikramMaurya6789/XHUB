#!/bin/bash
# XHUB catalog watchdog — monitors 4 collection shards, restarts dead ones.
cd /home/hatch/workspace/xhub-sync || exit 1

TOTAL=0
for i in 0 1 2 3; do
  F="public/catalog-shard-$i.json"
  COUNT=$(python3 -c "import json; print(len(json.load(open('$F'))))" 2>/dev/null || echo 0)
  TOTAL=$((TOTAL + COUNT))
  if pgrep -f "build-catalog-shard.mjs $i 4" > /dev/null; then
    echo "shard $i: running ($COUNT videos)"
  else
    echo "shard $i: DEAD — restarting ($COUNT videos so far)"
    nohup node scripts/build-catalog-shard.mjs $i 4 >> /tmp/catalog-shard-$i.log 2>&1 &
  fi
done
echo "TOTAL: $TOTAL videos across 4 shards"
# Update merged catalog.json for compatibility
python3 -c "
import json
m = {}
for i in range(4):
    try: m.update(json.load(open('public/catalog-shard-$i.json')))
    except: pass
json.dump(m, open('public/catalog.json','w'))
print('merged:', len(m))
"

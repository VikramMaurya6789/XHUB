#!/bin/bash
# XHUB catalog watchdog — monitors 4 collection shards, restarts dead ones.
cd /home/hatch/workspace/xhub-sync || exit 1

for i in 0 1 2 3; do
  F="public/catalog-shard-$i.json"
  COUNT=$(python3 -c "import json; print(len(json.load(open('$F'))))" 2>/dev/null || echo 0)
  if pgrep -f "build-catalog-shard.mjs $i 4" > /dev/null; then
    echo "shard $i: running ($COUNT videos)"
  else
    # Check if a subagent is handling it (don't double-start)
    echo "shard $i: no local process ($COUNT videos in file)"
  fi
done

# Merge all shards into catalog.json — UNION with existing entries (never delete).
# The catalog also contains newest videos and backfilled dates from other jobs;
# a blind overwrite would lose them.
python3 << 'PYEOF'
import json
try:
    m = json.load(open('public/catalog.json'))
except:
    m = {}
before = len(m)
for i in range(4):
    try:
        d = json.load(open(f'public/catalog-shard-{i}.json'))
        for k, v in d.items():
            if k not in m:
                m[k] = v
    except: pass
json.dump(m, open('public/catalog.json','w'))
print(f'merged catalog: {len(m)} unique videos (+{len(m)-before} new from shards)')
PYEOF

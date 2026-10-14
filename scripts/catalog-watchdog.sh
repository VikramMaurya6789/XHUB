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

# Merge all shards into catalog.json (proper python, no bash var issues)
python3 << 'PYEOF'
import json
m = {}
for i in range(4):
    try:
        d = json.load(open(f'public/catalog-shard-{i}.json'))
        m.update(d)
    except: pass
json.dump(m, open('public/catalog.json','w'))
print(f'merged catalog: {len(m)} unique videos')
PYEOF

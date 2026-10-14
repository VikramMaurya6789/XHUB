/**
 * Watch for all 10 backfill batches to complete, then merge dates into
 * catalog.json and push to GitHub. Run in background.
 */
import fs from 'fs';
import { execSync } from 'child_process';

const DIR = '/tmp/backfill';
const WORK = '/home/hatch/workspace/xhub-sync';
const GH = '/home/hatch/workspace/skills/github/bin/gh.py';

function allDone() {
  for (let i = 0; i < 10; i++) {
    const f = `${DIR}/dates_${i}.json`;
    if (!fs.existsSync(f)) return false;
    try {
      const d = JSON.parse(fs.readFileSync(f, 'utf8'));
      // Expect roughly 1000+ vkeys per batch; file must be non-trivial
      if (Object.keys(d).length < 50) return false;
    } catch { return false; }
  }
  // Also ensure no backfill process still running
  try {
    const ps = execSync('ps aux | grep "backfill-dates.mjs" | grep -v grep | wc -l', { encoding: 'utf8' }).trim();
    if (parseInt(ps) > 0) return false;
  } catch {}
  return true;
}

async function main() {
  console.log('Watcher started, waiting for 10 backfill batches...');
  for (let wait = 0; wait < 120; wait++) { // up to 60 min
    if (allDone()) break;
    await new Promise(r => setTimeout(r, 30000));
    if (wait % 10 === 0) console.log(`Waiting... (${wait * 0.5} min elapsed)`);
  }
  if (!allDone()) {
    console.log('TIMEOUT: not all batches finished in 60 min');
    process.exit(1);
  }

  console.log('All batches done. Merging dates into catalog...');
  // Merge all dates files into catalog.json
  const { execSync: ex } = await import('child_process');
  ex(`cd ${WORK} && node -e "
    const fs = require('fs');
    const cat = JSON.parse(fs.readFileSync('public/catalog.json', 'utf8'));
    let merged = 0;
    for (let i = 0; i < 10; i++) {
      const d = JSON.parse(fs.readFileSync('/tmp/backfill/dates_' + i + '.json', 'utf8'));
      for (const [vk, pd] of Object.entries(d)) {
        if (cat[vk] && !cat[vk].added) { cat[vk].added = pd; merged++; }
      }
    }
    fs.writeFileSync('public/catalog.json', JSON.stringify(cat));
    console.log('Merged ' + merged + ' dates. Catalog: ' + Object.keys(cat).length);
  "`, { stdio: 'inherit' });

  console.log('Pushing to GitHub...');
  ex(`cd ${WORK} && python3 ${GH} push --repo VikramMaurya6789/XHUB --message "Backfill publish dates for old catalog videos" --dir ${WORK} --auto`, { stdio: 'inherit' });
  console.log('DONE: dates merged and pushed');
}

main();

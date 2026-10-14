#!/usr/bin/env node
// Refresh streams for videos in a batch file
// Usage: node refresh-batch.mjs /tmp/batches/batch_0.txt

import { readFileSync, writeFileSync, existsSync } from 'fs';

const batchFile = process.argv[2];
if (!batchFile) {
  console.error('Usage: node refresh-batch.mjs <batch_file>');
  process.exit(1);
}

const vkeys = readFileSync(batchFile, 'utf-8').trim().split('\n').filter(Boolean);
console.log(`Refreshing ${vkeys.length} videos from ${batchFile}`);

const STREAMS_FILE = '/home/hatch/workspace/xhub-sync/public/streams.json';
let streams = {};
if (existsSync(STREAMS_FILE)) {
  streams = JSON.parse(readFileSync(STREAMS_FILE, 'utf-8'));
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function extractToken(html) {
  const m = html.match(/"format":"mp4","videoUrl":"([^"]+)"/);
  if (!m) return null;
  return m[1].replace(/\\\//g, '/');
}

async function refreshVideo(vkey) {
  try {
    // Step 1: Fetch video page
    const pageRes = await fetchWithTimeout(`https://www.redtube.com/${vkey}`, {
      headers: { 'User-Agent': UA }
    });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    // Step 2: Extract token
    const tokenPath = extractToken(html);
    if (!tokenPath) return null;

    // Step 3: Fetch stream JSON
    const streamRes = await fetchWithTimeout(`https://www.redtube.com${tokenPath}`, {
      headers: { 'User-Agent': UA, 'Referer': `https://www.redtube.com/${vkey}` }
    });
    if (!streamRes.ok) return null;
    const data = await streamRes.json();

    if (!Array.isArray(data) || data.length === 0) return null;

    // Step 4: Build qualities
    const qualities = data
      .filter(q => q.videoUrl)
      .map(q => ({ quality: q.quality || 'unknown', url: q.videoUrl }))
      .sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

    if (qualities.length === 0) return null;

    return {
      ts: Date.now(),
      qualities
    };
  } catch (e) {
    return null;
  }
}

let ok = 0;
let processed = 0;

// Process with concurrency of 3
const CONCURRENCY = 3;
const queue = [...vkeys];

async function worker() {
  while (queue.length > 0) {
    const vkey = queue.shift();
    const result = await refreshVideo(vkey);
    processed++;
    if (result) {
      streams[vkey] = result;
      ok++;
    }
    if (processed % 10 === 0) {
      console.log(`Progress: ${processed}/${vkeys.length} (${ok} ok)`);
      // Save incrementally
      writeFileSync(STREAMS_FILE, JSON.stringify(streams));
    }
  }
}

const workers = [];
for (let i = 0; i < CONCURRENCY; i++) {
  workers.push(worker());
}
await Promise.all(workers);

// Final save
writeFileSync(STREAMS_FILE, JSON.stringify(streams));
console.log(`Done: ${ok}/${vkeys.length} streams refreshed`);

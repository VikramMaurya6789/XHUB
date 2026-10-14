async function verify() {
  const tests = [
    { name: 'Thumb proxy', url: 'https://xhub-rouge.vercel.app/api/thumb?vkey=222270721' },
    { name: 'Robots.txt', url: 'https://xhub-rouge.vercel.app/robots.txt' },
    { name: 'Sitemap.xml', url: 'https://xhub-rouge.vercel.app/sitemap.xml' },
    { name: 'Homepage', url: 'https://xhub-rouge.vercel.app/' },
    { name: 'Indian page', url: 'https://xhub-rouge.vercel.app/indian' },
    { name: 'Categories page', url: 'https://xhub-rouge.vercel.app/categories' },
    { name: '404 page', url: 'https://xhub-rouge.vercel.app/this-does-not-exist-12345' },
    { name: 'Content removal', url: 'https://xhub-rouge.vercel.app/content-removal' },
    { name: 'Parental controls', url: 'https://xhub-rouge.vercel.app/parental-controls' },
    { name: 'Trust & Safety', url: 'https://xhub-rouge.vercel.app/trust-safety' },
    { name: 'Celebrity detail', url: 'https://xhub-rouge.vercel.app/celebrities/kim-kardashian' },
    { name: 'Pornstar detail', url: 'https://xhub-rouge.vercel.app/pornstars/angela-white' },
    { name: 'Creator detail', url: 'https://xhub-rouge.vercel.app/creators/sweetsinner' },
  ];

  for (const t of tests) {
    try {
      const res = await fetch(t.url);
      const ct = res.headers.get('content-type');
      console.log(`[${res.status}] ${t.name} -> Content-Type: ${ct}`);
      if (t.name === 'Thumb proxy') {
        const buf = await res.arrayBuffer();
        console.log(`   Thumb proxy bytes: ${buf.byteLength}, Cache-Control: ${res.headers.get('cache-control')}`);
      } else if (t.name === 'Robots.txt' || t.name === 'Sitemap.xml') {
        const text = await res.text();
        console.log(`   Preview: ${text.slice(0, 100).replace(/\n/g, ' ')}`);
      } else {
        const text = await res.text();
        const titleMatch = text.match(/<title>([^<]+)<\/title>/);
        const rtaMatch = text.includes('RTA-5042-1996-1400-1577-RTA');
        console.log(`   Title: "${titleMatch ? titleMatch[1] : 'none'}", RTA meta: ${rtaMatch}`);
      }
    } catch (e) {
      console.error(`Failed ${t.name}: ${e.message}`);
    }
  }

  // Watch page check
  try {
    const feedRes = await fetch('https://xhub-rouge.vercel.app/api/feed?section=hot');
    const feed = await feedRes.json();
    const vkey = feed.videos?.[0]?.vkey || feed.videos?.[0]?.id;
    if (vkey) {
      const watchRes = await fetch(`https://xhub-rouge.vercel.app/watch/${vkey}`);
      const text = await watchRes.text();
      console.log(`[${watchRes.status}] Watch page for vkey ${vkey}`);
      const hasMockComments = text.includes('AlexVip') || text.includes('NightRider88');
      const hasFake1420 = text.includes('1420');
      const hasRecoveryBar = text.includes('player-recovery-bar');
      console.log(`   Mock comments present: ${hasMockComments} (expected false)`);
      console.log(`   Recovery bar present: ${hasRecoveryBar} (expected true)`);
    }
  } catch (e) {
    console.error('Watch test error:', e.message);
  }
}

verify();

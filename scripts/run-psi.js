#!/usr/bin/env node
/**
 * On-demand PageSpeed Insights scan against the deployed site.
 *
 * Setup:
 *   1. Get a free PSI API key: https://developers.google.com/speed/docs/insights/v5/get-started
 *   2. Drop it in C:\ClaudeProjects\.env as `PSI_API_KEY=xxx` (one .env shared
 *      across all sister projects), or export it in your shell.
 *
 * Usage:
 *   node scripts/run-psi.js
 *   node scripts/run-psi.js --csv > scan.csv
 *
 * Requires Node 18+ (uses global fetch).
 */

(function loadEnv() {
  const fs = require('fs');
  const path = require('path');
  const candidates = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', '.env'),
  ];
  for (const p of candidates) {
    try {
      const content = fs.readFileSync(p, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
      }
      return;
    } catch (e) { /* not found, try next */ }
  }
})();

const SITE = process.env.PSI_BASE || 'https://perilwatch.com';
const API_KEY = process.env.PSI_API_KEY;
const CSV = process.argv.includes('--csv');

if (!API_KEY) {
  console.error('PSI_API_KEY env var not set.');
  console.error('Either export it in your shell or drop it in C:\\ClaudeProjects\\.env');
  console.error('Get a free key at https://developers.google.com/speed/docs/insights/v5/get-started');
  process.exit(2);
}

// Cloudflare Pages strips .html extensions via 308 redirects, so paths
// here use the canonical (extension-less) form to avoid PSI paying a
// redirect on every run.
const URLS = [
  '/',
  '/privacy',
  '/terms',
  '/cookies',
];

const STRATEGIES = ['mobile', 'desktop'];

async function check(path, strategy) {
  const u = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  u.searchParams.set('url', SITE + path);
  u.searchParams.set('strategy', strategy);
  u.searchParams.set('key', API_KEY);
  for (const c of ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO']) {
    u.searchParams.append('category', c);
  }
  const res = await fetch(u, { headers: { referer: SITE + '/' } }); // PSI key is website-restricted (2026-07-26) — send the site referer
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} :: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const cats = data.lighthouseResult?.categories || {};
  const audits = data.lighthouseResult?.audits || {};
  return {
    perf: scoreOf(cats.performance),
    a11y: scoreOf(cats.accessibility),
    bp: scoreOf(cats['best-practices']),
    seo: scoreOf(cats.seo),
    lcp: audits['largest-contentful-paint']?.displayValue || '—',
    cls: audits['cumulative-layout-shift']?.displayValue || '—',
    fcp: audits['first-contentful-paint']?.displayValue || '—',
    tbt: audits['total-blocking-time']?.displayValue || '—',
  };
}

function scoreOf(cat) {
  if (!cat || cat.score == null) return null;
  return Math.round(cat.score * 100);
}

function fmtScore(n) {
  if (n == null) return '—';
  if (n >= 90) return `${n} ✅`;
  if (n >= 50) return `${n} ⚠️`;
  return `${n} ❌`;
}

function pad(s, w) {
  s = String(s);
  return s + ' '.repeat(Math.max(0, w - [...String(s)].length));
}

async function main() {
  if (CSV) {
    console.log('url,strategy,perf,a11y,bp,seo,lcp,cls,fcp,tbt');
  } else {
    console.log(`PSI scan against: ${SITE}`);
    console.log('='.repeat(120));
    console.log([
      pad('URL', 30), pad('Strategy', 10), pad('Perf', 8), pad('A11y', 8),
      pad('BP', 8), pad('SEO', 8), pad('LCP', 10), pad('CLS', 8), pad('FCP', 10),
    ].join(' '));
    console.log('-'.repeat(120));
  }

  for (const path of URLS) {
    for (const strategy of STRATEGIES) {
      let r;
      try {
        r = await check(path, strategy);
      } catch (err) {
        if (CSV) {
          console.log(`${path},${strategy},ERROR,,,,,,,${JSON.stringify(err.message)}`);
        } else {
          console.log(`${pad(path, 30)} ${pad(strategy, 10)} ERROR: ${err.message}`);
        }
        await sleep(1500);
        continue;
      }

      if (CSV) {
        console.log([path, strategy, r.perf, r.a11y, r.bp, r.seo, r.lcp, r.cls, r.fcp, r.tbt].join(','));
      } else {
        console.log([
          pad(path, 30), pad(strategy, 10),
          pad(fmtScore(r.perf), 8), pad(fmtScore(r.a11y), 8),
          pad(fmtScore(r.bp), 8), pad(fmtScore(r.seo), 8),
          pad(r.lcp, 10), pad(r.cls, 8), pad(r.fcp, 10),
        ].join(' '));
      }
      await sleep(800);
    }
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

main().catch((e) => { console.error(e); process.exit(1); });

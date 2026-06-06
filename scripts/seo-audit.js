#!/usr/bin/env node
/**
 * SEO-integrity audit for the static site.
 *
 * Catches the classes of regression that Lighthouse/PSI do NOT: wrong or
 * redirecting canonicals, internal links to .html (which 308-redirect on
 * Cloudflare Pages), broken internal links, accidental noindex, duplicate
 * titles/descriptions, and sitemap drift. These are the machine-readable
 * signals that, when wrong, silently de-index a site even though every page
 * renders fine.
 *
 * Two modes:
 *   (default) static  — parses the file tree + sitemap.xml. No network. Fast
 *                       enough to run on every build / pre-deploy.
 *   --live            — additionally fetches every sitemap URL and asserts a
 *                       200 (no redirect/404) and a self-referential canonical
 *                       that itself returns 200. Use post-deploy / on a cron.
 *
 * Usage:
 *   node scripts/seo-audit.js
 *   node scripts/seo-audit.js --live [--base https://perilwatch.com] [--max 50]
 *
 * Exit code 1 on any FAIL (so CI fails). WARN does not fail the build.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASE = 'https://perilwatch.com';

const args = process.argv.slice(2);
const LIVE = args.includes('--live');
const BASE = (argVal('--base') || DEFAULT_BASE).replace(/\/$/, '');
const MAX = argVal('--max') ? parseInt(argVal('--max'), 10) : Infinity;

// Files that are intentionally not indexable / not self-canonical.
const EXCLUDE = new Set(['404.html']);

const fails = [];
const warns = [];
function fail(msg) { fails.push(msg); }
function warn(msg) { warns.push(msg); }

function argVal(flag) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

function push(map, key, val) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(val);
}

// ---- file discovery ------------------------------------------------------

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

function relUrl(absFile) {
  return absFile.slice(ROOT.length + 1).replace(/\\/g, '/');
}

// Map a repo file to its canonical public URL (Cloudflare extensionless serving).
function fileToUrl(rel) {
  if (rel === 'index.html') return BASE + '/';
  if (rel.endsWith('/index.html')) return BASE + '/' + rel.slice(0, -'index.html'.length);
  if (rel.endsWith('.html')) return BASE + '/' + rel.slice(0, -'.html'.length);
  return BASE + '/' + rel;
}

// Resolve an internal href to a repo file path, or null if it cannot exist.
// Absolute hrefs (/foo) resolve from the repo root; relative hrefs (../foo)
// resolve from the directory of the page they appear on (fromRel).
function hrefToFile(href, fromRel = 'index.html') {
  const raw = href.split('#')[0].split('?')[0];
  if (!raw) return fromRel; // pure anchor/query on the same page
  let base;
  if (raw.startsWith('/')) {
    base = raw.replace(/^\//, '');
  } else {
    const fromDir = path.posix.dirname(fromRel.replace(/\\/g, '/'));
    base = path.posix.normalize(path.posix.join(fromDir, raw));
  }
  base = base.replace(/\/$/, '');
  if (base === '' || base === '.') return 'index.html';
  const candidates = [`${base}/index.html`, `${base}.html`, base];
  for (const c of candidates) {
    if (fs.existsSync(path.join(ROOT, c))) return c;
  }
  return null;
}

// ---- lightweight HTML extraction (regex; static site, predictable markup)-

function extract(html) {
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
  const desc = (html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i) || [])[1];
  const canonical = (html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i) || [])[1];
  const robots = (html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i) || [])[1] || '';
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  return { title, desc, canonical, robots, hrefs };
}

function isInternal(href) {
  return !/^(https?:)?\/\//i.test(href) && !/^(mailto:|tel:|#|data:)/i.test(href);
}

// ---- static checks -------------------------------------------------------

function runStatic() {
  const files = walk(ROOT).map(relUrl).filter((f) => !f.startsWith('scripts/'));
  const titles = new Map();
  const descs = new Map();
  let canonicalCount = 0;

  for (const rel of files) {
    if (EXCLUDE.has(rel)) continue;
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const { title, desc, canonical, robots, hrefs } = extract(html);
    const selfUrl = fileToUrl(rel);

    // canonical present, self-referential, extensionless
    if (!canonical) {
      fail(`${rel}: missing rel=canonical`);
    } else {
      canonicalCount++;
      if (canonical !== selfUrl) fail(`${rel}: canonical "${canonical}" != self "${selfUrl}"`);
      if (/\.html(\/?$|[?#])/.test(canonical)) fail(`${rel}: canonical points at a .html URL (redirects)`);
    }

    if (/noindex/i.test(robots)) fail(`${rel}: robots meta contains noindex`);
    if (!title || !title.trim()) fail(`${rel}: missing <title>`);
    if (!desc || !desc.trim()) warn(`${rel}: missing meta description`);

    if (title) push(titles, title.trim(), rel);
    if (desc) push(descs, desc.trim(), rel);

    // internal links: no .html, and target must resolve to a real file
    for (const href of hrefs) {
      if (!isInternal(href)) continue;
      if (/\.html(\/?$|[?#]|$)/.test(href)) fail(`${rel}: internal link to .html -> ${href}`);
      const target = hrefToFile(href, rel);
      if (target === null) fail(`${rel}: broken internal link -> ${href}`);
    }
  }

  // duplicate titles / descriptions
  for (const [t, list] of titles) if (list.length > 1) fail(`duplicate <title> "${t}" on ${list.length} pages: ${list.slice(0, 4).join(', ')}${list.length > 4 ? ' ...' : ''}`);
  for (const [d, list] of descs) if (list.length > 1) warn(`duplicate meta description on ${list.length} pages: ${list.slice(0, 4).join(', ')}${list.length > 4 ? ' ...' : ''}`);

  // sitemap consistency
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    fail('sitemap.xml missing');
  } else {
    const sm = fs.readFileSync(sitemapPath, 'utf8');
    const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const lastmods = (sm.match(/<lastmod>/g) || []).length;
    if (lastmods < locs.length) warn(`sitemap: ${locs.length - lastmods} of ${locs.length} URLs missing <lastmod>`);
    for (const loc of locs) {
      if (/\.html(\/?$|[?#]|$)/.test(loc)) fail(`sitemap: .html URL (redirects) -> ${loc}`);
      const target = hrefToFile(loc.replace(BASE, ''), 'index.html');
      if (target === null) fail(`sitemap: URL has no backing file -> ${loc}`);
    }
  }

  console.log(`static: scanned ${files.length} HTML files, ${canonicalCount} canonicals.`);
}

// ---- live checks ---------------------------------------------------------

async function head(url) {
  // Manual redirect handling so a 308 is reported, not silently followed.
  const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'seo-audit' } });
  return res.status;
}

async function runLive() {
  const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
  let locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (locs.length > MAX) { console.log(`live: sampling ${MAX} of ${locs.length} URLs`); locs = locs.slice(0, MAX); }

  let checked = 0;
  const CONCURRENCY = 12;
  for (let i = 0; i < locs.length; i += CONCURRENCY) {
    await Promise.all(locs.slice(i, i + CONCURRENCY).map(async (url) => {
      try {
        const status = await head(url);
        if (status !== 200) fail(`live: ${url} -> HTTP ${status} (sitemap URLs must be 200)`);
        else {
          const html = await (await fetch(url, { headers: { 'user-agent': 'seo-audit' } })).text();
          const { canonical } = extract(html);
          if (canonical && canonical !== url) fail(`live: ${url} canonical -> ${canonical} (not self)`);
        }
      } catch (e) {
        fail(`live: ${url} fetch error ${e.message}`);
      }
      checked++;
    }));
  }
  console.log(`live: checked ${checked} sitemap URLs against ${BASE}.`);
}

// ---- main ----------------------------------------------------------------

(async () => {
  runStatic();
  if (LIVE) await runLive();

  if (warns.length) {
    console.log(`\n${warns.length} WARN:`);
    for (const w of warns.slice(0, 40)) console.log(`  WARN  ${w}`);
    if (warns.length > 40) console.log(`  ... ${warns.length - 40} more`);
  }
  if (fails.length) {
    console.log(`\n${fails.length} FAIL:`);
    for (const f of fails.slice(0, 60)) console.log(`  FAIL  ${f}`);
    if (fails.length > 60) console.log(`  ... ${fails.length - 60} more`);
    console.log(`\nSEO audit FAILED (${fails.length} errors).`);
    process.exit(1);
  }
  console.log('\nSEO audit passed.');
})();

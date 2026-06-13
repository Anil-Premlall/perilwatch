#!/usr/bin/env node
/**
 * Convert the GTM loader on every HTML page from "load on window.load" to
 * "load on first user interaction (or a post-load timeout fallback)".
 *
 * Keeps the GTM container intact (all existing + future tags work). dataLayer
 * is initialized inline so conversion/event pushes still queue before GTM loads.
 *
 * Idempotent: pages already carrying the marker are skipped. Handles both the
 * current window.load-deferred shape and the older raw-IIFE shape — it replaces
 * the entire inner JS of the GTM <script> regardless of current wrapper.
 *
 * Usage: node delay-gtm.js <repo-root> [--apply]
 *   without --apply it only reports what would change (dry run).
 */
const fs = require('fs');
const path = require('path');

const argRoot = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const ROOT = argRoot || path.join(__dirname, '..');
const APPLY = process.argv.includes('--apply');

const MARKER = 'gtm-delay-interaction';
// Match the GTM head <script> (bare, no attributes) that contains gtm.start.
// (?!</script>) keeps the match from crossing into another script tag.
const GTM_RE = /<script>((?:(?!<\/script>)[\s\S])*?gtm\.start(?:(?!<\/script>)[\s\S])*?)<\/script>/;

function loaderJS(containerId) {
  return `<script>/*${MARKER}*/(function(w,d,s,l,i){w[l]=w[l]||[];var n=false;function g(){if(n)return;n=true;`
    + `w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],`
    + `j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;`
    + `j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);}`
    + `var e=['scroll','mousemove','touchstart','keydown','pointerdown','click'];`
    + `function h(){e.forEach(function(x){w.removeEventListener(x,h,{passive:true});});g();}`
    + `e.forEach(function(x){w.addEventListener(x,h,{passive:true});});`
    + `w.addEventListener('load',function(){setTimeout(g,5000);});`
    + `})(window,document,'script','dataLayer','${containerId}');</script>`;
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', '.github'].includes(e.name)) continue;
      walk(p, out);
    } else if (e.name.endsWith('.html')) {
      out.push(p);
    }
  }
  return out;
}

const files = walk(ROOT, []);
let changed = 0, skipped = 0, nogtm = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  if (html.includes(MARKER)) { skipped++; continue; }
  const m = html.match(GTM_RE);
  if (!m) { nogtm++; continue; }
  const idMatch = m[1].match(/GTM-[A-Z0-9-]+/);
  if (!idMatch) { nogtm++; continue; }
  const next = html.replace(GTM_RE, loaderJS(idMatch[0]));
  if (APPLY) fs.writeFileSync(f, next);
  changed++;
}
console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'} on ${ROOT}`);
console.log(`  html files: ${files.length}`);
console.log(`  converted : ${changed}`);
console.log(`  skipped(already): ${skipped}`);
console.log(`  no GTM block: ${nogtm}`);

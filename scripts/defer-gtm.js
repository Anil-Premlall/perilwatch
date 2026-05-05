#!/usr/bin/env node
/**
 * Wrap the inline Google Tag Manager IIFE in a `window.addEventListener('load', …)`
 * so GTM stops blocking First Contentful Paint / Largest Contentful Paint on
 * mobile Slow 4G. Lighthouse traces on sister sites showed the unwrapped
 * snippet pulling in 278 KiB of GTM/GA4 payload (123 KiB unused) plus 174ms
 * of forced reflow per gtag call.
 *
 * Idempotent: only matches the unwrapped IIFE shape, so re-running is a no-op.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const FIND = /<script>\(function\(w,d,s,l,i\)\{w\[l\][\s\S]*?\}\)\(window,document,'script','dataLayer','GTM-[^']+'\);<\/script>/g;

function wrap(match) {
  const inner = match.slice('<script>'.length, -'</script>'.length);
  return `<script>window.addEventListener('load',function(){${inner}});</script>`;
}

function walk(dir, files) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, files);
    else if (e.isFile() && e.name.endsWith('.html')) files.push(full);
  }
}

const files = [];
walk(ROOT, files);

let touched = 0;
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const next = html.replace(FIND, wrap);
  if (next !== html) {
    fs.writeFileSync(file, next, 'utf8');
    touched++;
  }
}
console.log(`Wrapped GTM in ${touched} of ${files.length} HTML files`);

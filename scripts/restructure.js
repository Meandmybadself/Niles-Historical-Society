#!/usr/bin/env node
// restructure.js — Reorganizes src/pages into category subdirectories
//                  and consolidates legacy asset dirs into assets/
// Usage: node restructure.js

'use strict';
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Category Definitions ─────────────────────────────────────────────────────

// Root hub pages — stay at src/pages/ root
const ROOT_PAGES = new Set([
  'index.html', 'stories.html', 'photos.html'
]);

// Category buckets (all lowercase for matching)
const MUSEUM_PAGES = new Set([
  'tours.html', 'mapdr.html', 'bokpg.html', 'rkive.html', 'admin.html',
  'gowns.html', 'presidentialgowns.html', 'abigailadams.html',
  'mariegouverneur.html', 'marthajeffersonrandolph.html', 'marthawashington.html',
  'aerialmaps.html'
]);

const BUILDINGS_PAGES = new Set([
  'arbor.html', 'barn.html', 'gardn.html', 'grnds.html', 'thomashouse.html',
  'thomashousefamilies.html', 'thomasmills.html'
]);

const PRESIDENTS_PAGES = new Set([
  'garfield.html', 'harrison.html', 'jackson.html', 'jefferson.html',
  'roosevelt.html', 'mckinleymemorial.html', 'mckinleyhousemuseum.html',
  'nilesmckinleystatue.html', 'lot20.html'
]);

function categorize(filename) {
  const lc = filename.toLowerCase();
  if (ROOT_PAGES.has(lc))       return 'root';
  if (MUSEUM_PAGES.has(lc))     return 'museum';
  if (BUILDINGS_PAGES.has(lc))  return 'buildings';
  if (PRESIDENTS_PAGES.has(lc)) return 'presidents';
  return 'stories';
}

// ─── Page Map ─────────────────────────────────────────────────────────────────
// Maps lowercase href (with or without Stories2/ prefix) → { category, originalName }

function buildPageMap(srcDir) {
  const map = {};

  // Root-level fragments
  fs.readdirSync(srcDir, { withFileTypes: true }).forEach(e => {
    if (!e.isFile() || !e.name.endsWith('.html')) return;
    const cat = categorize(e.name);
    map[e.name.toLowerCase()] = { category: cat, originalName: e.name };
    // Also handle URL-encoded version (e.g. "Union%20Cemetery.html")
    const encoded = encodeURIComponent(e.name).replace(/%2E/gi, '.').replace(/%2F/gi, '/');
    if (encoded !== e.name) map[encoded.toLowerCase()] = { category: cat, originalName: e.name };
  });

  // Stories2 fragments → all go to stories/
  const s2dir = path.join(srcDir, 'Stories2');
  if (fs.existsSync(s2dir)) {
    fs.readdirSync(s2dir, { withFileTypes: true }).forEach(e => {
      if (!e.isFile() || !e.name.endsWith('.html')) return;
      const entry = { category: 'stories', originalName: e.name };
      map[e.name.toLowerCase()] = entry;
      map['stories2/' + e.name.toLowerCase()] = entry;
      const encoded = encodeURIComponent(e.name).replace(/%2E/gi, '.').replace(/%2F/gi, '/');
      if (encoded !== e.name) {
        map[encoded.toLowerCase()] = entry;
        map['stories2/' + encoded.toLowerCase()] = entry;
      }
    });
  }

  return map;
}

// ─── Link Rewriter ────────────────────────────────────────────────────────────

function updateLinks(html, fromCat, pageMap) {
  return html.replace(/(\bhref=")([^"#?]+\.html)([^"]*")/gi, (match, pre, href, post) => {
    const lc  = href.toLowerCase();
    const lcD = decodeURIComponent(lc); // handle %20 etc.
    const info = pageMap[lc] || pageMap[lcD];
    if (!info) return match; // external or unknown — leave alone

    const toCat = info.category;
    let newHref;

    if (fromCat === 'root') {
      newHref = toCat === 'root' ? info.originalName : toCat + '/' + info.originalName;
    } else {
      // source page is at depth 1 (museum/, buildings/, presidents/, stories/)
      if (toCat === fromCat)  newHref = info.originalName;
      else if (toCat === 'root') newHref = '../' + info.originalName;
      else                    newHref = '../' + toCat + '/' + info.originalName;
    }

    return pre + newHref + post;
  });
}

// ─── Asset Path Rewriter ──────────────────────────────────────────────────────

// Patterns: [ [searchRegex, replacement], ... ]
// fromDepth 0 = fragment was at root (Stryz/...)
// fromDepth 1 = fragment was in Stories2/ (../Stryz2/...)
function updateAssetPaths(html, fromDepth) {
  if (fromDepth === 0) {
    // Moving from root to depth-1 subdir → add ../
    return html
      .replace(/((?:src|href)=")Stryz2\//gi,  '$1../assets/images2/')
      .replace(/((?:src|href)=")Stryz\//gi,   '$1../assets/images/')
      .replace(/((?:src|href)=")webpx\//gi,   '$1../assets/site/')
      .replace(/((?:src|href)=")wbpx2\//gi,   '$1../assets/thumbnails/')
      .replace(/((?:src|href)=")rkpdf\//gi,   '$1../assets/pdfs/')
      .replace(/((?:src|href)=")books\//gi,   '$1../assets/books/');
  } else {
    // Was in Stories2/ (depth 1) → same depth target (stories/), different dir names
    return html
      .replace(/((?:src|href)=")\.\.\/Stryz2\//gi,  '$1../assets/images2/')
      .replace(/((?:src|href)=")\.\.\/Stryz\//gi,   '$1../assets/images/')
      .replace(/((?:src|href)=")\.\.\/webpx\//gi,   '$1../assets/site/')
      .replace(/((?:src|href)=")\.\.\/wbpx2\//gi,   '$1../assets/thumbnails/')
      .replace(/((?:src|href)=")\.\.\/rkpdf\//gi,   '$1../assets/pdfs/')
      .replace(/((?:src|href)=")\.\.\/books\//gi,   '$1../assets/books/')
      // Also catch bare (no ../) paths that legacy convert may have left
      .replace(/((?:src|href)=")Stryz2\//gi,  '$1../assets/images2/')
      .replace(/((?:src|href)=")Stryz\//gi,   '$1../assets/images/')
      .replace(/((?:src|href)=")webpx\//gi,   '$1../assets/site/')
      .replace(/((?:src|href)=")wbpx2\//gi,   '$1../assets/thumbnails/')
      .replace(/((?:src|href)=")rkpdf\//gi,   '$1../assets/pdfs/')
      .replace(/((?:src|href)=")books\//gi,   '$1../assets/books/');
  }
}

// Asset update for pages that STAY at root (no ../ needed)
function updateRootAssetPaths(html) {
  return html
    .replace(/((?:src|href)=")Stryz2\//gi,  '$1assets/images2/')
    .replace(/((?:src|href)=")Stryz\//gi,   '$1assets/images/')
    .replace(/((?:src|href)=")webpx\//gi,   '$1assets/site/')
    .replace(/((?:src|href)=")wbpx2\//gi,   '$1assets/thumbnails/')
    .replace(/((?:src|href)=")rkpdf\//gi,   '$1assets/pdfs/')
    .replace(/((?:src|href)=")books\//gi,   '$1assets/books/');
}

// ─── Asset Copy ───────────────────────────────────────────────────────────────

function copyAssets() {
  const copies = [
    ['Stryz',  'assets/images'],
    ['Stryz2', 'assets/images2'],
    ['webpx',  'assets/site'],
    ['wbpx2',  'assets/thumbnails'],
    ['rkpdf',  'assets/pdfs'],
    ['books',  'assets/books'],
  ];
  copies.forEach(([src, dst]) => {
    if (!fs.existsSync(src)) { console.log(`  skip  ${src}/ (not found)`); return; }
    fs.mkdirSync(dst, { recursive: true });
    execSync(`cp -r "${src}/." "${dst}/"`);
    console.log(`  copied  ${src}/ → ${dst}/`);
  });
}

// ─── Template Update ──────────────────────────────────────────────────────────

function updateTemplate() {
  const tmplPath = '_template.html';
  let html = fs.readFileSync(tmplPath, 'utf8');

  // Asset paths ({{BASE}} is prepended at build time, so treat as root-relative)
  html = html
    .replace(/\{\{BASE\}\}webpx\//g,  '{{BASE}}assets/site/')
    .replace(/\{\{BASE\}\}wbpx2\//g,  '{{BASE}}assets/thumbnails/')
    .replace(/\{\{BASE\}\}rkpdf\//g,  '{{BASE}}assets/pdfs/')
    .replace(/\{\{BASE\}\}Stryz\//g,   '{{BASE}}assets/images/')
    .replace(/\{\{BASE\}\}Stryz2\//g,  '{{BASE}}assets/images2/');

  // Nav/footer page links with {{BASE}} prefix
  const basePageMap = {
    'arbor.html':    'buildings/arbor.html',
    'gowns.html':    'museum/gowns.html',
    'bokpg.html':    'museum/bokpg.html',
    'rkive.html':    'museum/rkive.html',
    'tours.html':    'museum/tours.html',
    'mapdr.html':    'museum/mapdr.html',
  };

  Object.entries(basePageMap).forEach(([from, to]) => {
    const re = new RegExp('(\\{\\{BASE\\}\\})' + from.replace(/\./g, '\\.'), 'g');
    html = html.replace(re, '$1' + to);
  });

  fs.writeFileSync(tmplPath, html, 'utf8');
  console.log('  updated  _template.html');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const SRC = 'src/pages';

console.log('\nBuilding page map...');
const pageMap = buildPageMap(SRC);
console.log('  ' + Object.keys(pageMap).length + ' page entries mapped.');

console.log('\nCopying assets...');
copyAssets();

// Process root-level fragments (non-root-category pages)
console.log('\nMoving root-level fragments to category subdirs...');
let moved = 0, skippedRoot = 0;

fs.readdirSync(SRC, { withFileTypes: true }).forEach(e => {
  if (!e.isFile() || !e.name.endsWith('.html')) return;
  const cat = categorize(e.name);
  if (cat === 'root') { skippedRoot++; return; }

  const srcPath = path.join(SRC, e.name);
  const outDir  = path.join(SRC, cat);
  const outPath = path.join(outDir, e.name);

  let html = fs.readFileSync(srcPath, 'utf8');
  html = updateAssetPaths(html, 0);
  html = updateLinks(html, cat, pageMap);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  fs.unlinkSync(srcPath);
  console.log(`  moved   ${e.name} → ${cat}/`);
  moved++;
});

// Process Stories2 fragments → stories/
console.log('\nMoving Stories2 fragments to stories/...');
const s2dir = path.join(SRC, 'Stories2');
if (fs.existsSync(s2dir)) {
  fs.readdirSync(s2dir, { withFileTypes: true }).forEach(e => {
    if (!e.isFile() || !e.name.endsWith('.html')) return;

    const srcPath = path.join(s2dir, e.name);
    const outDir  = path.join(SRC, 'stories');
    const outPath = path.join(outDir, e.name);

    let html = fs.readFileSync(srcPath, 'utf8');
    html = updateAssetPaths(html, 1);
    html = updateLinks(html, 'stories', pageMap);

    fs.mkdirSync(outDir, { recursive: true });
    if (fs.existsSync(outPath)) {
      console.log(`  skip   Stories2/${e.name} (already placed by root-source)`);
    } else {
      fs.writeFileSync(outPath, html, 'utf8');
      console.log(`  moved  Stories2/${e.name} → stories/`);
      moved++;
    }
    fs.unlinkSync(srcPath);
  });

  // Remove Stories2/ dir if now empty
  try { fs.rmdirSync(s2dir); console.log('  removed  src/pages/Stories2/'); }
  catch (_) { console.log('  note: src/pages/Stories2/ still has files'); }
}

// Update root hub pages in place (index.html, stories.html, photos.html)
console.log('\nUpdating root hub page paths...');
['index.html', 'stories.html', 'photos.html'].forEach(name => {
  const p = path.join(SRC, name);
  if (!fs.existsSync(p)) return;
  let html = fs.readFileSync(p, 'utf8');
  html = updateRootAssetPaths(html);
  html = updateLinks(html, 'root', pageMap);
  fs.writeFileSync(p, html, 'utf8');
  console.log(`  updated  ${name}`);
});

// Update _template.html
console.log('\nUpdating _template.html...');
updateTemplate();

console.log(`\nDone. ${moved} fragments moved, ${skippedRoot} root pages updated in-place.\n`);

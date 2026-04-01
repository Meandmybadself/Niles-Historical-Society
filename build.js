#!/usr/bin/env node
// build.js — Assembles complete HTML pages from template + content fragments
// Usage: node build.js

const fs   = require('fs');
const path = require('path');

const SRC_DIR  = 'src/pages';
const TMPL     = 'src/_template.html';

if (!fs.existsSync(SRC_DIR)) {
  console.error(`\nERROR: "${SRC_DIR}" not found. Run convert.js first.\n`);
  process.exit(1);
}

if (!fs.existsSync(TMPL)) {
  console.error(`\nERROR: "${TMPL}" not found.\n`);
  process.exit(1);
}

const template = fs.readFileSync(TMPL, 'utf8');
let built = 0, errors = 0;

function buildDir(srcDir, outDir, depth) {
  const base = depth === 0 ? '' : '../'.repeat(depth);

  fs.mkdirSync(outDir, { recursive: true });

  fs.readdirSync(srcDir, { withFileTypes: true }).forEach(function (entry) {
    const srcPath = path.join(srcDir, entry.name);
    const outPath = path.join(outDir, entry.name);

    if (entry.isDirectory()) {
      buildDir(srcPath, outPath, depth + 1);
      return;
    }

    if (!entry.name.endsWith('.html')) return;

    try {
      const raw = fs.readFileSync(srcPath, 'utf8');

      // Extract <!-- title: ... --> comment
      const titleMatch = raw.match(/<!--\s*title:\s*([\s\S]*?)\s*-->/);
      const pageTitle  = titleMatch ? titleMatch[1].trim() : 'Niles Historical Society';
      const fullTitle  = pageTitle.match(/Niles Historical Society/i)
        ? pageTitle
        : pageTitle + ' \u2014 Niles Historical Society';

      // Remove the title comment before inserting as content
      const content = raw.replace(/<!--\s*title:[\s\S]*?-->\s*\n?/, '').trim();

      const html = template
        .replace(/\{\{TITLE\}\}/g, escapeHtmlAttr(fullTitle))
        .replace(/\{\{BASE\}\}/g, base)
        .replace('{{CONTENT}}', content);

      fs.writeFileSync(outPath, html, 'utf8');
      console.log('  built  ' + outPath);
      built++;
    } catch (e) {
      console.error('  ERROR  ' + srcPath + ': ' + e.message);
      errors++;
    }
  });
}

function escapeHtmlAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

console.log('\nBuilding site from ' + SRC_DIR + ' ...\n');
buildDir(SRC_DIR, 'docs', 0);
console.log('\n' + built + ' page(s) built' + (errors ? ', ' + errors + ' error(s)' : '') + '.\n');

#!/usr/bin/env node
// convert.js — Converts legacy .htm pages to content fragments in src/pages/
// Usage: node convert.js
// Run once; re-run to refresh fragments.

const fs   = require('fs');
const path = require('path');

const OUT_BASE = 'src/pages';

// Pages handled manually — skip auto-convert
const SKIP = new Set([
  'index.htm', 'index.html',
  'mm_menu.js',
]);

// Directories containing .htm content files (relative to project root)
const SOURCE_DIRS = [
  { dir: '.',        depth: 0 },
  { dir: 'Stories2', depth: 1 },
];

// ─── HTML Cleaning ────────────────────────────────────────────────────────────

function removeTags(html, tag) {
  // Remove opening tags with attributes (self-closing or not) but keep inner content
  const open  = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'gi');
  let prev;
  do { prev = html; html = html.replace(open, '$1'); } while (html !== prev);
  // Also remove any straggling unclosed tags
  html = html.replace(new RegExp('<' + tag + '(?:\\s[^>]*)?/?>', 'gi'), '');
  html = html.replace(new RegExp('</' + tag + '>', 'gi'), '');
  return html;
}

function cleanHTML(html) {
  // Remove scripts
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove comments (Dreamweaver artifacts, tracking)
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  // Remove deprecated presentational attributes from block elements
  const BLOCK = '(?:table|tr|td|th|tbody|thead|tfoot|div|p|h[1-6]|ul|ol|li|body|html)';
  html = html.replace(
    new RegExp('(<' + BLOCK + '[^>]*?)\\s+(?:bgcolor|text|bordercolor|vlink|alink|link|background|char|charoff)="[^"]*"', 'gi'),
    '$1'
  );
  html = html.replace(
    new RegExp('(<' + BLOCK + '[^>]*?)\\s+border="[^"]*"', 'gi'),
    '$1'
  );
  html = html.replace(
    new RegExp('(<' + BLOCK + '[^>]*?)\\s+(?:cellpadding|cellspacing)="[^"]*"', 'gi'),
    '$1'
  );
  // Remove fixed pixel/percent widths & heights from table structural elements only
  html = html.replace(
    new RegExp('(<(?:table|td|th|tr)[^>]*?)\\s+width="[^"]*"', 'gi'),
    '$1'
  );
  html = html.replace(
    new RegExp('(<(?:table|td|th|tr)[^>]*?)\\s+height="[^"]*"', 'gi'),
    '$1'
  );
  // Remove valign/align from table elements (CSS handles it)
  html = html.replace(
    new RegExp('(<(?:td|th|tr)[^>]*?)\\s+(?:valign|align)="[^"]*"', 'gi'),
    '$1'
  );
  // Remove <font> tags, keep content
  html = removeTags(html, 'font');
  // Remove empty elements
  html = html.replace(/<p[^>]*>\s*(?:&nbsp;\s*)*<\/p>/gi, '');
  html = html.replace(/<div[^>]*>\s*<\/div>/gi, '');
  // Normalise &nbsp; to plain space
  html = html.replace(/&nbsp;/g, ' ');
  // Convert .htm links to .html (internal links only — no http)
  html = html.replace(/href="(?!https?:\/\/)([^"]+?)\.htm"/gi, function (_, p1) {
    return 'href="' + p1 + '.html"';
  });
  // Remove redundant name= attributes on anchors (keep id=)
  html = html.replace(/\s+name="[^"]*"/gi, '');
  // Collapse excessive blank lines
  html = html.replace(/(\n\s*){3,}/g, '\n\n');
  html = html.replace(/[ \t]+\n/g, '\n');
  return html.trim();
}

// ─── Title Extraction ─────────────────────────────────────────────────────────

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : 'Niles Historical Society';
}

// ─── Content Extraction ───────────────────────────────────────────────────────

function extractContent(html) {
  // Strategy 1 — inner content table identified by bordercolor attribute
  // (used by nearly all article pages)
  const bcMatch = html.match(/<table[^>]+bordercolor[^>]*>([\s\S]*?)<\/table>/i);
  if (bcMatch && /(<img|<p\s)/i.test(bcMatch[1])) {
    return bcMatch[0];
  }

  // Strategy 2 — last <td colspan="3" …> that is NOT part of the header
  // (hub pages: stories, photos)
  const cs3 = [...html.matchAll(/<td[^>]+colspan="3"[^>]*>([\s\S]*?)<\/td>/gi)];
  for (let i = cs3.length - 1; i >= 0; i--) {
    const inner = cs3[i][1];
    if (/<img/i.test(inner) && !/webpx\/bannr/i.test(inner)) {
      return inner;
    }
  }

  // Strategy 3 — last large <td colspan="4"> that contains images
  const cs4 = [...html.matchAll(/<td[^>]+colspan="4"[^>]*>([\s\S]*?)<\/td>/gi)];
  for (let i = cs4.length - 1; i >= 0; i--) {
    const inner = cs4[i][1];
    if (/<img/i.test(inner) && !/webpx\/bannr/i.test(inner)) {
      return inner;
    }
  }

  // Strategy 4 — slice between second <hr> and Copyright footer
  let hrCount = 0;
  let startIdx = -1;
  const hrRe = /<hr[^>]*>/gi;
  let m2;
  while ((m2 = hrRe.exec(html)) !== null) {
    hrCount++;
    if (hrCount === 2) { startIdx = m2.index + m2[0].length; }
  }
  const endIdx = html.search(/Copyright[©\s\d]/i);
  if (startIdx > 0 && endIdx > startIdx) {
    return html.slice(startIdx, endIdx);
  }

  // Fallback — everything between <body> and Copyright
  const bodyM = html.match(/<body[^>]*>([\s\S]*?)(?:Copyright[©\s\d]|<\/body>)/i);
  return bodyM ? bodyM[1] : '';
}

// ─── Card Grid Detection & Conversion ────────────────────────────────────────

function looksLikeCardGrid(html) {
  // A card grid has many <td> cells each containing an <img> inside an <a>
  const tds = [...html.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
  const cardTds = tds.filter(function (m) {
    return /<a\s[^>]*href[^>]*>[\s\S]*?<img/i.test(m[1]);
  });
  return cardTds.length >= 4;
}

function extractCardData(tdHTML) {
  // href from the first <a> in the cell
  const hrefM = tdHTML.match(/href="([^"]+)"/i);
  if (!hrefM) return null;
  const href = hrefM[1].replace(/\.htm$/i, '.html');

  // img src
  const srcM = tdHTML.match(/<img[^>]+src="([^"]+)"/i);
  const src  = srcM ? srcM[1] : '';

  // img alt
  const altM = tdHTML.match(/<img[^>]+alt="([^"]+)"/i);

  // Title: look for text in the second anchor or in a <p>/<font> after the img
  let title = '';
  // Remove the image-wrapper anchor, then find text
  const stripped = tdHTML.replace(/<a[^>]*>[\s\S]*?<img[\s\S]*?<\/a>/i, '');
  const textM = stripped.match(/<a[^>]*>([^<]+)<\/a>/i)
             || stripped.match(/>([^<]{3,})</);
  if (textM) title = textM[1].trim().replace(/\s+/g, ' ');
  if (!title && altM) title = altM[1].trim();

  if (!href || !src || !title) return null;
  return { href: href, src: src, title: title };
}

function convertToCardGrid(html) {
  const tds = [...html.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
  const cards = [];

  tds.forEach(function (m) {
    if (!/<a\s[^>]*href[^>]*>[\s\S]*?<img/i.test(m[1])) return;
    const card = extractCardData(m[1]);
    if (card) cards.push(card);
  });

  if (!cards.length) return null;

  return '<div class="card-grid">\n' +
    cards.map(function (c) {
      return '  <a href="' + c.href + '" class="card">\n' +
             '    <div class="card-image"><img src="' + c.src + '" alt="' + c.title.replace(/"/g, '&quot;') + '" loading="lazy"></div>\n' +
             '    <div class="card-body"><h3 class="card-title">' + c.title + '</h3></div>\n' +
             '  </a>';
    }).join('\n') +
    '\n</div>';
}

// ─── Page Assembly ────────────────────────────────────────────────────────────

function buildFragment(html, filename) {
  const title   = extractTitle(html);
  const rawBody = extractContent(html);

  if (looksLikeCardGrid(rawBody)) {
    const grid = convertToCardGrid(rawBody);
    if (grid) {
      return '<!-- title: ' + title + ' -->\n' +
             '<div class="page-hero">\n' +
             '  <div class="container">\n' +
             '    <h1 class="hero-title">' + title + '</h1>\n' +
             '  </div>\n' +
             '</div>\n' +
             '<div class="section">\n' +
             '  <div class="container">\n' +
             '    ' + grid + '\n' +
             '  </div>\n' +
             '</div>\n';
    }
  }

  const cleaned = cleanHTML(rawBody);

  return '<!-- title: ' + title + ' -->\n' +
         '<div class="article-header">\n' +
         '  <div class="container">\n' +
         '    <nav class="article-breadcrumb" aria-label="Breadcrumb">\n' +
         '      <a href="index.html">Home</a>\n' +
         '      <span class="sep" aria-hidden="true">&rsaquo;</span>\n' +
         '      <span>' + title + '</span>\n' +
         '    </nav>\n' +
         '    <h1 class="article-title">' + title + '</h1>\n' +
         '  </div>\n' +
         '</div>\n' +
         '<div class="container">\n' +
         '  <div class="article-body">\n' +
         cleaned + '\n' +
         '  </div>\n' +
         '</div>\n';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('\nConverting legacy pages to fragments...\n');
let count = 0, skipped = 0, errs = 0;

SOURCE_DIRS.forEach(function (src) {
  const entries = fs.readdirSync(src.dir, { withFileTypes: true });

  entries.forEach(function (entry) {
    if (!entry.isFile()) return;
    const fname = entry.name;
    if (!fname.match(/\.htm$/i)) return;
    if (SKIP.has(fname.toLowerCase())) { skipped++; return; }

    const inPath  = path.join(src.dir, fname);
    const outName = fname.replace(/\.htm$/i, '.html');
    const outPath = src.depth === 0
      ? path.join(OUT_BASE, outName)
      : path.join(OUT_BASE, src.dir, outName);

    try {
      const raw      = fs.readFileSync(inPath, 'utf8');
      const fragment = buildFragment(raw, fname.toLowerCase());

      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, fragment, 'utf8');
      console.log('  converted  ' + inPath + ' -> ' + outPath);
      count++;
    } catch (e) {
      console.error('  ERROR      ' + inPath + ': ' + e.message);
      errs++;
    }
  });
});

console.log('\n' + count + ' converted, ' + skipped + ' skipped, ' + errs + ' error(s).\n');

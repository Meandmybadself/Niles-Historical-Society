# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **static HTML website** for the Niles Historical Society (Niles, Ohio). It is a legacy archive site with no build pipeline, no package manager, no backend, and no CSS framework. All pages are hand-authored HTML 4.01 Transitional files.

## No Build Process

There are no build, lint, or test commands. Files are edited directly and served as static HTML. To preview locally, open any `.htm` file in a browser or use a simple static server:

```bash
python3 -m http.server 8000
```

## Architecture & Conventions

### File Organization
- Root: 189+ `.htm` content pages covering individual history topics
- `Stories2/` — additional historical story pages
- `Stryz/` and `Stryz2/` — large photo galleries organized by topic (~247 files combined)
- `webpx/` — site-wide assets: header/banner images, logos, navigation graphics
- `books/` — book cover images
- `rkpdf/` — PDF newsletters and membership forms
- `Web Maps/` — historical map resources

### Page Template Pattern
Every content page follows the same layout:
1. HTML 4.01 Transitional doctype
2. `bgcolor="#FFFF99"` (pale yellow), `text="#660033"` (dark brown) on `<body>`
3. Table-based layout (no CSS grid/flexbox)
4. Ward-Thomas Museum header image at top
5. Navigation links back to `index.htm`
6. Contact footer: `330.544.2143` / `curator@nileshistoricalsociety.org`

### Styling
- All styles are **inline HTML attributes** — no external `.css` files
- Color palette: yellow (`#FFFF99`) backgrounds, dark brown/red (`#660033`) text
- Fonts specified via `<font face="Arial">` or `<font face="Times New Roman">`

### JavaScript
- `mm_menu.js` — Macromedia legacy dropdown menu library (2002, v6.0). Used on the homepage for navigation. Do not replace or modernize without explicit instruction.

### No Responsive Design
The site uses fixed-width table layouts and is not mobile-optimized. Do not introduce responsive design patterns unless explicitly asked.

## Editing Guidelines

When adding or modifying pages, match the existing HTML structure exactly — use the existing pages as templates. Do not introduce external CSS files, JavaScript libraries, or modern HTML5 elements unless the user explicitly requests modernization work.

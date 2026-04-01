# Niles Historical Society

Website for the [Niles Historical Society](https://nileshistoricalsociety.com), home of the Ward–Thomas Museum at 503 Brown Street, Niles, Ohio.

## Structure

```
├── src/
│   ├── _template.html  # Shared HTML shell (header, nav, footer)
│   └── pages/          # Content fragments (source of truth)
│       ├── index.html
│       ├── stories.html
│       ├── photos.html
│       ├── buildings/
│       ├── museum/
│       ├── presidents/
│       └── stories/
├── docs/               # Built output — served by GitHub Pages
│   ├── assets/
│   │   ├── images/     # Photo galleries
│   │   ├── images2/    # Additional galleries
│   │   ├── site/       # Site-wide images
│   │   ├── thumbnails/ # Thumbnail images
│   │   ├── pdfs/       # Newsletters and forms
│   │   └── books/      # Book cover images
│   ├── buildings/
│   ├── museum/
│   ├── presidents/
│   ├── stories/
│   ├── style.css       # Site stylesheet
│   └── site.js         # Lightbox and nav toggle
├── scripts/            # One-time migration tools (convert.js, restructure.js)
├── legacy/             # Original .htm files and pre-migration asset directories
└── build.js            # Assembles docs/ from src/_template.html + src/pages/
```

## Build

No dependencies. Requires Node.js.

```bash
node build.js
```

Reads every `.html` fragment from `src/pages/`, wraps it in `src/_template.html`, and writes complete pages to `docs/`. Subdirectories are mirrored; `{{BASE}}` path depth is calculated automatically.

### Page titles

Each fragment can declare its title via an HTML comment on the first line:

```html
<!-- title: 1924 Niles Riot -->
```

If omitted, the title defaults to `Niles Historical Society`. If the declared title doesn't already contain "Niles Historical Society", the suffix ` — Niles Historical Society` is appended automatically.

## Local preview

```bash
cd docs && python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

Pushes to `main` trigger a GitHub Actions workflow (`.github/workflows/build.yml`) that runs `node build.js` and commits any changed files in `docs/`. GitHub Pages serves the `docs/` folder.

The custom domain is configured via a `CNAME` file in `docs/` and a Cloudflare DNS CNAME record pointing to the GitHub Pages endpoint.

## Editing content

Edit the fragment in `src/pages/` and push. The CI build updates `docs/` automatically. To preview locally before pushing, run `node build.js` first.

# Niles Historical Society

Website for the [Niles Historical Society](https://nileshistoricalsociety.com), home of the Ward–Thomas Museum at 503 Brown Street, Niles, Ohio.

## Structure

```
├── src/pages/          # Content fragments (source of truth)
│   ├── index.html
│   ├── stories.html
│   ├── photos.html
│   ├── buildings/
│   ├── museum/
│   ├── presidents/
│   └── stories/
├── docs/               # Built output — served by GitHub Pages
│   ├── assets/
│   │   ├── images/     # Photo galleries (from legacy Stryz/)
│   │   ├── images2/    # Additional galleries (from legacy Stryz2/)
│   │   ├── site/       # Site-wide images (from legacy webpx/)
│   │   ├── thumbnails/ # Thumbnail images (from legacy wbpx2/)
│   │   ├── pdfs/       # Newsletters and forms
│   │   └── books/      # Book cover images
│   ├── buildings/
│   ├── museum/
│   ├── presidents/
│   └── stories/
├── _template.html      # Shared HTML shell (header, nav, footer)
├── build.js            # Assembles docs/ from _template.html + src/pages/
├── style.css           # (in docs/) — site stylesheet
└── site.js             # (in docs/) — lightbox and nav toggle
```

## Build

No dependencies. Requires Node.js.

```bash
node build.js
```

Reads every `.html` fragment from `src/pages/`, wraps it in `_template.html`, and writes complete pages to `docs/`. Subdirectories are mirrored; `{{BASE}}` path depth is calculated automatically.

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

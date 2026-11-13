# myfawlt — portfolio site

Single-page editorial portfolio for custom Minecraft plugins, mods and non-hosted website structures.

## Privacy / data

- No cookies, no localStorage/sessionStorage/IndexedDB, no analytics, no trackers, no accounts, no forms, no network calls (`connect-src 'none'`).
- Fonts, motion libraries and Three.js are self-hosted.
- Terms acceptance is kept **in memory only** for the current page view; refreshing asks again.
- The Discord button writes to the clipboard only when clicked.
- `_headers` adds privacy/security headers for Netlify/Cloudflare Pages-style hosts. A hosting provider may still keep standard server logs outside the site’s control.

## Terms gate

Visitors must scroll through and accept the Terms / No-Refund Policy / Privacy Notice before the site is revealed. The gate is keyboard-accessible and locks background scrolling. After acceptance, “Terms & privacy” in the footer reopens it in read-only mode.

**Important:** these terms are a strong starting point, not legal advice and not a guarantee against lawsuits. Have a qualified lawyer in your jurisdiction review them, especially the no-refund, liability, indemnity, and governing-law clauses.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Static site: upload the folder to Netlify, Cloudflare Pages, GitHub Pages, Vercel, or any host. No build step, no backend.

## Edit content

- `index.html` — copy, sections, terms text, contact details.
- `styles.css` — colors in `:root`.
- `main.js` — project dialog text in `projects`; Discord handle in `copyDiscord()`.
- `terms.js` — gate behavior (no storage).
- `scenes.js` — Three.js still lifes; palette in `PAL`.
- `REFERENCES.md` — real reference sources and art-direction rules.

## Motion / 3D

Lenis + GSAP for page motion; Three.js for card/portrait still lifes. Scenes lazy-init via IntersectionObserver, render on demand, and dispose on page hide. Custom cursor/parallax/pointer-follow are disabled on touch and for `prefers-reduced-motion`. Static SVG fallbacks appear if WebGL is unavailable.

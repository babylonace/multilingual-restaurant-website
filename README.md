# Inkawasi · Digital menu

**English** · [Español](README.es.md)

Multilingual digital menu for **Inkawasi**, a traditional Peruvian restaurant in Ferrol (Galicia, Spain). It is a **statically pre-rendered site in 10 languages** (es, en, fr, it, de, pt, gl, ar, zh, ru) with allergen information, WCAG AA accessibility and structured data for search engines. Guests reach it by scanning a QR code at the table, so fast loading on mobile is the main constraint.

This project is the result of auditing and refactoring a first version that was generated with a design tool. The audit findings and design decisions are summarised below.

## Results

Lighthouse on mobile (simulated throttling, median of 3 runs), original version vs. current:

| Metric                       | Original | Refactor   |
| ---------------------------- | -------- | ---------- |
| Performance                  | 44       | **95**     |
| Accessibility                | 86       | **100**    |
| Best practices               | 96       | **100**    |
| SEO                          | 82       | **100**    |
| LCP                          | 6.7 s    | **2.6 s**  |
| CLS                          | 0.73     | **0.01**   |
| Transferred size             | 847 KB   | **297 KB** |
| Requests                     | 36       | **14**     |
| Third-party hosts at runtime | 4+ CDNs  | **0**      |
| First-party JavaScript       | ~220 KB  | **2.2 KB** |

## Stack

Vite · strict TypeScript · CSS cascade layers (`@layer`) with the brand design-system tokens · Vitest · Playwright + axe-core · ESLint · Prettier · GitHub Actions. No framework: the site is HTML that is already written when it arrives, plus a little JavaScript to enhance it.

## How it works

```
src/data/        dishes, sections, allergens and prices (in cents), fully typed
src/i18n/        one JSON file per language; the type is derived from Spanish, so a
                 key missing in any language is a compile error
src/render/      pure functions (context → HTML) with automatic escaping
src/client/      progressive enhancement: tabs, language menu, saved preference
scripts/         prerender (one page per language), sitemap, image optimisation
tests/           unit (Vitest) and e2e + accessibility (Playwright)
```

1. `vite build` compiles CSS/JS and leaves `dist/index.html` as a template.
2. `scripts/prerender.ts` writes `dist/carta/index.html` (es) and `dist/<lang>/carta/index.html`, each with the whole menu already in the markup, metadata, `hreflang` and JSON-LD (`Restaurant` + `Menu`).
3. In development a Vite plugin renders those same pages, so `npm run dev` shows exactly what ships.

### URL structure

| URL                         | What it is                                                             |
| --------------------------- | ---------------------------------------------------------------------- |
| `/carta/`                   | Menu in Spanish (default language). **The URL on the table QR codes.** |
| `/en/carta/`, `/gl/carta/`… | Menu in each of the other 9 languages                                  |
| `/`, `/en/`…                | Redirect to the matching menu, until the site has a home page          |

The menu is under `/carta/` so that a home page can take over `/` later without changing any printed URL. Roots redirect with a real `302` (`dist/_redirects`, read by Cloudflare Pages and Netlify) and a static fallback page for any other host.

## Design decisions

- **Pre-rendering instead of an SPA.** The original loaded its data with `import()` after mounting, so the first paint was empty and a search engine saw no dishes. The menu is now in the HTML.
- **One URL per language, not a piece of state.** `/en/`, `/gl/`… are real, linkable, indexable pages. The language switcher is a set of links inside a `<details>`, so it works without JavaScript.
- **Language redirect that does not hurt SEO.** Only from the root page, using the saved choice or the browser language, and never for crawlers. The function that decides is the same one the tests exercise.
- **No third-party requests at runtime.** Self-hosted fonts split by `unicode-range` (the browser downloads only Latin or Cyrillic, depending on the language), inline icons and flags.
- **Prices as integers (cents)**, formatted with `Intl.NumberFormat` per language.
- **Templates escape by default** (`html\`\``); no `innerHTML` with unsanitised data.
- **Real right-to-left Arabic:** `dir` and `lang` on `<html>`, CSS logical properties, no `letter-spacing` (it breaks letter joining) and prices isolated with `unicode-bidi`.
- **AA contrast.** Two design-system shades (`gold-700`, `terra-500`) fall short of 4.5:1 on cream for small text; `--gold-800` and `--terra-700` were added for text only.

## What the audit fixed

- A 60 KB proprietary runtime + a 31 KB editor scaffold + an 88 KB design-system bundle, all to render a menu.
- No `<title>`, meta description, `lang` or `main` landmark; insufficient contrast; CLS of 0.73.
- Inline styles everywhere and `!important` hacks that clipped tabs with long names ("Accompagnements").
- Hard-coded Spanish strings (review prompt, "Get directions") that were never translated.
- **Data errors:** in Galician, "peanuts" was translated as "Améndoas" (almonds), a different allergen. Also a typo ("patatas frito") in the Mostrito description.
- `lucide@latest` unpinned and loaded from unpkg.
- A 195 KB logo (2670 px wide) shown at 50 px tall: now 17 KB.

## Commands

```bash
npm install
npm run dev            # dev server with all 10 pages
npm run build          # typecheck + build + pre-render  → dist/
npm run preview        # serve dist/
npm test               # unit tests (152)
npm run test:e2e       # e2e + accessibility (44), builds first
npm run lint && npm run format:check && npm run typecheck
npm run optimize:images
```

## Deployment

`.github/workflows/ci.yml` runs formatting, lint, types, unit and e2e tests on every push and pull request.

Production will be Cloudflare Pages on `inkawasi.es` (domain not purchased yet). To enable canonical URLs, `hreflang` and `sitemap.xml`, set the site origin at build time:

```bash
SITE_URL=https://inkawasi.es BASE_PATH=/ npm run build
```

## To do

- Register `inkawasi.es` and deploy to Cloudflare Pages.
- Open Graph image for link previews.
- Logo, photos and brand belong to Inkawasi.

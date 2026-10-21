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
2. `scripts/prerender.ts` writes a home page and a carta per language (`dist/index.html`, `dist/carta/index.html`, `dist/<lang>/index.html`, `dist/<lang>/carta/index.html`), each with its content already in the markup, metadata, `hreflang` and JSON-LD (`Restaurant`, plus `Menu` on the carta).
3. In development a Vite plugin renders those same pages, so `npm run dev` shows exactly what ships.

### URL structure

| URL                                    | What it is                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/carta/`                              | Menu in Spanish (default language). **The URL on the table QR codes.**                                    |
| `/en/carta/`, `/gl/carta/`…            | Menu in each of the other 9 languages                                                                     |
| `/`, `/en/`…                           | Home page in each language: dining-room photo and the ways to reach us                                    |
| `/menu-del-dia/`, `/en/menu-del-dia/`… | Daily set menu: hours, structure and prices; today's dishes are asked on WhatsApp until the CMS (stage 4) |
| `/aviso-legal/`                        | Legal notice (LSSI). Spanish only; draft until approved                                                   |
| `/privacidad/`                         | Privacy policy (GDPR). Spanish only; draft until approved                                                 |

The home page lives at `/` and the menu is one button on it; the menu stays at `/carta/` so printed QR codes never change. Old links of the form `/#marino` (the menu used to be the root) are forwarded to the menu by a tiny inline script.

## Design decisions

- **Pre-rendering instead of an SPA.** The original loaded its data with `import()` after mounting, so the first paint was empty and a search engine saw no dishes. The menu is now in the HTML.
- **One URL per language, not a piece of state.** `/en/`, `/gl/`… are real, linkable, indexable pages. The language switcher is a set of links inside a `<details>`, so it works without JavaScript.
- **Language redirect that does not hurt SEO.** Only from the Spanish home and the Spanish menu, using the saved choice or the browser language, and never for crawlers. The function that decides is the same one the tests exercise.
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
npm test               # unit tests (251)
npm run test:e2e       # e2e + accessibility (74), builds first
npm run lint && npm run format:check && npm run typecheck
npm run optimize:images
npm run build:og       # re-render public/og-image.jpg (1200×630) with Playwright
```

## Changing things

| To change…                     | Edit                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| A price, a dish, its allergens | `src/data/menu.ts` (prices in euro cents: `1450` is 14,50€). Dish text per language: `src/i18n/locales/<lang>.json` |
| Opening hours, the closed day  | Not on this site: they are kept in Google Business Profile, and "See opening hours" opens the Google Maps card      |
| A WhatsApp message             | `src/data/whatsapp.ts` (Spanish, read by the staff). Button labels per language: `ui.wa*` in the locale files       |
| Phone, address, links          | `src/render/contact.ts`                                                                                             |
| The daily menu                 | Not editable yet: it arrives with the CMS in stage 4 of `docs/plan-web.md`                                          |
| A one-off closure (holiday)    | Not editable yet: same stage 4 (CMS)                                                                                |

Every change is checked by `npm test`; a dish without a price or description in all 10 languages, or an allergen outside the official 14, fails the build.

## Confidential data

The holder's details for the legal pages (name, NIE, address) are **not in git**. They live in `private/negocio.privado.json`, which is git-ignored; only the template `private/negocio.privado.example.json` is tracked. The build reads it and never writes it (the file is read-only). In CI, provide the same JSON as the `INKAWASI_PRIVATE_JSON` secret. A build with `SITE_URL` set refuses to publish placeholders, and a unit test fails if the real NIE ever shows up in a tracked file. Technical secrets (Cloudflare, Resend, Turnstile) go in environment variables, never in that file.

The legal pages stay `noindex` and marked as a draft until `LEGAL_DRAFT` in `src/data/legal.ts` is set to `false`.

## Deployment

`.github/workflows/ci.yml` runs formatting, lint, types, unit and e2e tests on every push and pull request.

Production will be Cloudflare Pages on `inkawasi.es` (domain not purchased yet). To enable canonical URLs, `hreflang` and `sitemap.xml`, set the site origin at build time:

```bash
SITE_URL=https://inkawasi.es BASE_PATH=/ npm run build
```

## To do

- Register `inkawasi.es` and deploy to Cloudflare Pages.
- Review the legal texts and set `LEGAL_DRAFT` to `false`.
- Replace the Open Graph image with one that uses a photo of the restaurant.
- Logo, photos and brand belong to Inkawasi.

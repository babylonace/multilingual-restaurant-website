# Inkawasi · Digital menu

**English** · [Español](README.es.md)

Multilingual digital menu for **Inkawasi**, a traditional Peruvian restaurant in Ferrol (Galicia, Spain). It is a **statically pre-rendered site in 10 languages** (es, en, fr, it, de, pt, gl, ar, zh, ru) with allergen information, WCAG AA accessibility and structured data for search engines. Guests reach it by scanning a QR code at the table, so fast loading on mobile is the main constraint.

This project is the result of auditing and refactoring a first version that was generated with a design tool. The audit findings and design decisions are summarised below.

**Live:** [inkawasi.es](https://inkawasi.es) · [English menu](https://inkawasi.es/en/carta/)

| Home, phone                                                                                                                                                                     | Menu, phone                                                                                                                                         | Home, desktop                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| <img src="docs/images/home-mobile.webp" alt="Home page on a phone: cover photo of the restaurant, title and buttons for the menu, the daily set menu and WhatsApp" width="220"> | <img src="docs/images/carta-mobile.webp" alt="English menu on a phone: favourite dishes with photos and prices, then tabs per section" width="220"> | <img src="docs/images/home-desktop.webp" alt="Home page on a desktop screen" width="420"> |

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

Astro 7 as the build tool (it emits static HTML and ships no framework to the browser) · strict TypeScript · CSS cascade layers (`@layer`) with tokens generated from the design system · Vitest · Playwright + axe-core · Lighthouse CI · ESLint · Prettier · GitHub Actions · Cloudflare Pages.

## How it works

```
design-system/    tokens.json copied from the design system: the only source of colours,
                  spacing, radius, shadows and type scale
src/data/         typed dishes, sections, allergens and prices (in cents)
src/i18n/         one JSON per language; the type is derived from Spanish, so a key
                  missing in any language is a compile error
src/render/       pure functions  (context → HTML)  with automatic escaping: the content
src/pages/        Astro routes: each page calls its renderer; sitemap.xml and robots.txt
src/layouts/      the shared document: CSS, JS, self-hosted fonts and icons
src/lib/          build helpers: per-language context and the image pipeline
src/assets/fotos/ photo originals (at most 2400 px)
src/client/       progressive enhancement: tabs, language menu, saved preference
scripts/          tokens, favicon, logo, Open Graph image, private data
tests/            unit (Vitest) and e2e + accessibility (Playwright)
```

1. `npm run tokens` turns `design-system/tokens.json` into `src/styles/tokens.generated.css` (not tracked). `dev`, `build` and `typecheck` run it first.
2. `astro build` emits a home, a carta and a menú del día per language, the two legal pages, `404.html`, `sitemap.xml` and `robots.txt`. The `.astro` pages are thin: the HTML comes from the renderers in `src/render`, the same ones the unit tests exercise, with metadata, `hreflang` and JSON-LD (`Restaurant`, plus `Menu` on the carta).
3. Photos go through `astro:assets`: AVIF and WebP at several widths, with hashed names cached for a year (`public/_headers`).
4. Astro's font API self-hosts Montserrat and Lora (Latin and Cyrillic only), generates metric-matched fallbacks so text does not jump when the fonts arrive, and only the Latin Montserrat file is preloaded.

When moving from Vite to Astro (stage 3) the HTML of all 33 pages was compared before and after: same URLs, same text, links, metadata, classes and structured data.

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
- **Astro as a build tool, not a framework.** Routing, bundling, fonts and images; the HTML still comes from tested pure functions. The migration changed no URL and no page content.
- **No third-party requests at runtime.** Self-hosted fonts split by `unicode-range` (the browser downloads only Latin or Cyrillic, depending on the language; a test checks that all Latin and Russian text fits those two files), inline icons and flags.
- **Prices as integers (cents)**, formatted with `Intl.NumberFormat` per language.
- **Templates escape by default** (`html\`\``); no `innerHTML` with unsanitised data.
- **Real right-to-left Arabic:** `dir` and `lang` on `<html>`, CSS logical properties, no `letter-spacing` (it breaks letter joining) and prices isolated with `unicode-bidi`.
- **The design system rules.** Colours come from `tokens.json` and a test fails if a hand-written colour appears in the CSS. Text is in the brand brown `#6E3F31` (formerly `#512E24`), never grey or on white, and the brand bands use that same brown. The DS shades for small text (`gold-800`, `terra-700`) already meet AA.

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
npm run dev            # dev server with every page
npm run build          # tokens + Astro build  → dist/
npm run preview        # serves dist/
npm test               # unit tests (471)
npm run test:e2e       # e2e + accessibility (112), builds first
npm run lighthouse     # mobile Lighthouse on dist/ with the thresholds in lighthouserc.json
npm run lint && npm run format:check && npm run typecheck
npm run build:favicon  # rebuilds the tab icon from the official isotype
npm run optimize:images  # rebuilds the logo
npm run build:og       # rebuilds public/og-image.jpg (1200×630) with Playwright
```

## Changing things

| To change…                     | Edit                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| A price, a dish, its allergens | `src/data/menu.ts` (prices in euro cents: `1450` is 14,50€). Dish text per language: `src/i18n/locales/<lang>.json` |
| Opening hours, the closed day  | Not on this site: they are kept in Google Business Profile, and "See opening hours" opens the Google Maps card      |
| A WhatsApp message             | `src/data/whatsapp.ts` (Spanish, read by the staff). Button labels per language: `ui.wa*` in the locale files       |
| Phone, address, links          | `src/render/contact.ts`                                                                                             |
| The daily menu                 | Not editable yet: it arrives with the CMS planned in "To do"                                                        |
| A one-off closure (holiday)    | Not editable yet: same stage 4 (CMS)                                                                                |
| Colours, spacing or type       | Copy the design system's new `tokens.json` into `design-system/` and build. Never by hand in the CSS                |
| A photo (cover or favourite)   | Replace the original in `src/assets/fotos/` under the same name (at most 2400 px); the build makes AVIF and WebP    |
| The browser-tab icon           | `assets-src/brand/inkawasi-icono-light.svg` (copied untouched from the DS) and `npm run build:favicon`              |

Every change is checked by `npm test`; a dish without a price or description in all 10 languages, or an allergen outside the official 14, fails the build.

## Confidential data

The holder's details for the legal pages (name, NIE, address) are **not in git**. They live in `private/negocio.privado.json`, which is git-ignored; only the template `private/negocio.privado.example.json` is tracked. The build reads it and never writes it (the file is read-only). In CI, provide the same JSON as the `INKAWASI_PRIVATE_JSON` secret. A build with `SITE_URL` set refuses to publish placeholders, and a unit test fails if the real NIE ever shows up in a tracked file. Technical secrets (Cloudflare, Resend, Turnstile) go in environment variables, never in that file.

The legal pages are always `noindex` and out of the sitemap: the law requires the holder's NIE and address on the site, not in search results. `LEGAL_DRAFT` in `src/data/legal.ts` only adds a draft banner (approved and off since 22 October 2026).

## Deployment

`.github/workflows/ci.yml` runs formatting, lint, types, unit tests, e2e tests and mobile Lighthouse on every push and pull request. Lighthouse CI fails the build if the median of 3 runs on the home page, the carta, the menú del día and the English carta drops below 90 for performance or 95 for accessibility, best practices or SEO (`lighthouserc.json`); the report is kept as a CI artifact. When everything passes on `main`, the `deploy` job builds with `SITE_URL=https://inkawasi.es` (canonical URLs, `hreflang` and `sitemap.xml`) and uploads `dist/` to Cloudflare Pages with `wrangler pages deploy` (project `inkawasi`). The build runs in GitHub Actions rather than on Cloudflare because the menú del día images will later be rendered with Playwright.

GitHub settings. The secrets live in the `production` environment (Settings → Environments), limited to the `main` branch, so no other job or branch can read them:

| Name                    | Where                           | Value                                             |
| ----------------------- | ------------------------------- | ------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | repository variable             | Cloudflare account ID; nothing deploys without it |
| `CLOUDFLARE_API_TOKEN`  | `production` environment secret | token with the Cloudflare Pages: Edit permission  |
| `INKAWASI_PRIVATE_JSON` | `production` environment secret | the contents of `private/negocio.privado.json`    |

Every branch other than `main` is published as a preview at `<branch>.example-project.pages.dev` (the `preview` job), built without `SITE_URL` and therefore without private data: the legal pages show the template's placeholders. The GitHub `preview` environment holds only `CLOUDFLARE_API_TOKEN`; without it, the job says so and uploads nothing.

`public/_headers` adds `X-Robots-Tag: noindex` to the `*.pages.dev` URLs, so only `inkawasi.es` gets indexed, and a one-year cache to `/_astro/*`, whose names carry a content hash. `www.inkawasi.es` redirects to `https://inkawasi.es` through a 301 redirect rule on the Cloudflare zone.

`inkawasi.netlify.app` is a permanent 301 redirector to `https://inkawasi.es/carta/` (the old site was the carta itself, so every old address lands there in one hop): the `netlify-redirector/` folder is uploaded once by hand on Netlify (Deploys → drag and drop the folder). Never delete the Netlify project. Rollback: republish the previous deploy on Netlify.

Local production build:

```bash
SITE_URL=https://inkawasi.es npm run build
```

## To do

- A small CMS for the daily set menu and one-off closures.
- Replace the Open Graph image with one that uses a photo of the restaurant.

## License

The code is under the [MIT license](LICENSE). The Inkawasi name, logo, photographs and menu texts belong to the restaurant and are not covered by it: see [NOTICE](NOTICE).

Built by [babylonace](https://github.com/babylonace). AI-assisted.

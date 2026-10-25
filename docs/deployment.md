# Deployment and confidential data

How the site is built and published, and how the private data required by Spanish law stays out of Git.

## Pipeline

`.github/workflows/ci.yml` runs formatting, lint, types, unit tests, e2e tests and mobile Lighthouse on every push and pull request. Lighthouse CI fails the build if the median of 3 runs on the home page, the carta, the menú del día and the English carta drops below 90 for performance or 95 for accessibility, best practices or SEO (`lighthouserc.json`); the report is kept as a CI artifact.

When everything passes on `main`, the `deploy` job builds with `SITE_URL=https://inkawasi.es` (canonical URLs, `hreflang` and `sitemap.xml`) and uploads `dist/` to Cloudflare Pages with `wrangler pages deploy`. The build runs in GitHub Actions rather than on Cloudflare so that every deploy has passed the same checks.

Every branch other than `main` is published as a preview at `<branch>.<project>.pages.dev` (the `preview` job), built without `SITE_URL` and therefore without private data: the legal pages show the template's placeholders.

## GitHub settings

The secrets live in the `production` environment (Settings → Environments), limited to the `main` branch, so no other job or branch can read them. Pull requests from forks never receive them.

| Name                    | Where                                      | Value                                              |
| ----------------------- | ------------------------------------------ | -------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | repository variable                        | Cloudflare account ID; nothing deploys without it  |
| `CLOUDFLARE_API_TOKEN`  | `production` and `preview` environment secret | token with the Cloudflare Pages: Edit permission |
| `INKAWASI_PRIVATE_JSON` | `production` environment secret            | the contents of `private/negocio.privado.json`     |

Without `CLOUDFLARE_ACCOUNT_ID` the deploy jobs are skipped and CI only checks the code, which is what a fork gets by default.

## Confidential data

The holder's details for the legal pages (name, NIE, address) are **not in Git**. They live in `private/negocio.privado.json`, which is git-ignored; only the template `private/negocio.privado.example.json` is tracked. The build reads it and never writes it. In CI the same JSON comes from the `INKAWASI_PRIVATE_JSON` secret. A build with `SITE_URL` set refuses to publish placeholders, and a unit test fails if the real NIE ever shows up in a tracked file.

The legal pages are always `noindex` and out of the sitemap: the law requires the holder's NIE and address on the site, not in search results. `LEGAL_DRAFT` in `src/data/legal.ts` only adds a draft banner.

## Headers and redirects

`public/_headers` adds `X-Robots-Tag: noindex` to the `*.pages.dev` URLs, so only the real domain gets indexed, and a one-year cache to `/_astro/*`, whose names carry a content hash. `www.inkawasi.es` redirects to `https://inkawasi.es` through a 301 redirect rule on the Cloudflare zone.

`inkawasi.netlify.app`, the old address, is a permanent 301 redirector to `https://inkawasi.es/carta/`: the `netlify-redirector/` folder is uploaded once by hand on Netlify (Deploys → drag and drop the folder).

## Local production build

```bash
SITE_URL=https://inkawasi.es npm run build
```

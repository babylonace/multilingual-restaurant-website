/**
 * Post-build step: turns the Vite-built `dist/index.html` shell into one static carta page
 * per language (`dist/carta/index.html`, `dist/en/carta/index.html`, …), a redirect stub at
 * each language root, `_redirects`, sitemap.xml and robots.txt.
 *
 * Run by `npm run build` after `vite build`, so asset URLs already carry their content hashes.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { LANGS } from '../src/data/langs';
import { cartaPath, langHref, langPath, langUrl } from '../src/render/context';
import { renderPage } from '../src/render/page';
import { renderRedirectPage } from '../src/render/redirect-page';
import { applyTemplate, PLACEHOLDERS } from '../src/render/template';
import { getBuildConfig } from './config';

const DIST = resolve('dist');
const { base, siteUrl } = getBuildConfig();

async function write(relativePath: string, content: string): Promise<void> {
  const file = join(DIST, relativePath);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

// Read the shell before the root stub overwrites dist/index.html.
const template = await readFile(join(DIST, 'index.html'), 'utf8');
for (const placeholder of PLACEHOLDERS) {
  if (!template.includes(placeholder)) {
    throw new Error(
      `dist/index.html lost its ${placeholder} placeholder; was it already pre-rendered?`,
    );
  }
}

for (const { code } of LANGS) {
  const ctx = { lang: code, base, siteUrl };
  await write(join(cartaPath(code), 'index.html'), applyTemplate(template, renderPage(ctx)));
  await write(join(langPath(code), 'index.html'), renderRedirectPage(ctx));
}
console.log(
  `Pre-rendered ${LANGS.length} carta pages + ${LANGS.length} root redirects (base "${base}")`,
);

// Real 302s on hosts that read this file (Cloudflare Pages, Netlify); the stubs above cover the rest.
const redirects = LANGS.map(
  ({ code }) => `${base}${langPath(code)} ${langHref({ lang: code, base }, code)} 302`,
).join('\n');
await write('_redirects', `${redirects}\n`);

const ctx = { lang: 'es', base, siteUrl } as const;
if (siteUrl) {
  const urls = LANGS.map(({ code }) => {
    const alternates = LANGS.map(
      (l) =>
        `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${langUrl(ctx, l.code)}"/>`,
    ).join('\n');
    return `  <url>\n    <loc>${langUrl(ctx, code)}</loc>\n${alternates}\n  </url>`;
  }).join('\n');
  await write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
  );
}
await write(
  'robots.txt',
  `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}${base}sitemap.xml\n` : ''}`,
);
console.log(
  siteUrl
    ? 'Wrote _redirects, sitemap.xml and robots.txt'
    : 'Wrote _redirects and robots.txt (set SITE_URL to also get sitemap.xml)',
);

/**
 * Post-build step: turns the Vite-built `dist/index.html` shell into one static HTML page
 * per language (`dist/index.html`, `dist/en/index.html`, …) plus sitemap.xml and robots.txt.
 *
 * Run by `npm run build` after `vite build`, so asset URLs already carry their content hashes.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { LANGS } from '../src/data/langs';
import { langPath, langUrl } from '../src/render/context';
import { renderPage } from '../src/render/page';
import { applyTemplate, PLACEHOLDERS } from '../src/render/template';
import { getBuildConfig } from './config';

const DIST = resolve('dist');
const { base, siteUrl } = getBuildConfig();

const template = await readFile(join(DIST, 'index.html'), 'utf8');
for (const placeholder of PLACEHOLDERS) {
  if (!template.includes(placeholder)) {
    throw new Error(
      `dist/index.html lost its ${placeholder} placeholder; was it already pre-rendered?`,
    );
  }
}

for (const { code } of LANGS) {
  const file = join(DIST, langPath(code), 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, applyTemplate(template, renderPage({ lang: code, base, siteUrl })));
}
console.log(`Pre-rendered ${LANGS.length} pages (base "${base}")`);

const ctx = { lang: 'es', base, siteUrl } as const;
if (siteUrl) {
  const urls = LANGS.map(({ code }) => {
    const alternates = LANGS.map(
      (l) =>
        `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${langUrl(ctx, l.code)}"/>`,
    ).join('\n');
    return `  <url>\n    <loc>${langUrl(ctx, code)}</loc>\n${alternates}\n  </url>`;
  }).join('\n');
  await writeFile(
    join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
  );
}
await writeFile(
  join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}${base}sitemap.xml\n` : ''}`,
);
console.log(
  siteUrl
    ? 'Wrote sitemap.xml and robots.txt'
    : 'Wrote robots.txt (set SITE_URL to also get sitemap.xml)',
);

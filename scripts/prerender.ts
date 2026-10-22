/**
 * Post-build step: turns the Vite-built `dist/index.html` shell into static pages: a home page
 * and a carta per language (`dist/index.html`, `dist/carta/index.html`, `dist/en/index.html`,
 * `dist/en/carta/index.html`, …), the two legal pages, 404.html, sitemap.xml and robots.txt.
 *
 * Run by `npm run build` after `vite build`, so asset URLs already carry their content hashes.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { LANGS } from '../src/data/langs';
import { LEGAL_DRAFT, LEGAL_PAGES } from '../src/data/legal';
import { kindPath, kindUrl, type PageKind } from '../src/render/context';
import { renderLegalPage } from '../src/render/legal';
import { renderNotFoundPage } from '../src/render/not-found';
import { renderHomePage, renderMenuDelDiaPage, renderPage } from '../src/render/page';
import { applyTemplate, PLACEHOLDERS } from '../src/render/template';
import { getBuildConfig } from './config';
import { loadPrivate } from './private-data';

const DIST = resolve('dist');
const { base, siteUrl } = getBuildConfig();

async function write(relativePath: string, content: string): Promise<void> {
  const file = join(DIST, relativePath);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

// Read the shell before the Spanish home page overwrites dist/index.html.
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
  await write(
    join(kindPath('carta', code), 'index.html'),
    applyTemplate(template, renderPage(ctx)),
  );
  await write(
    join(kindPath('home', code), 'index.html'),
    applyTemplate(template, renderHomePage(ctx)),
  );
  await write(
    join(kindPath('menu', code), 'index.html'),
    applyTemplate(template, renderMenuDelDiaPage(ctx)),
  );
}
console.log(
  `Pre-rendered ${LANGS.length} home, carta and menú del día pages each (base "${base}")`,
);

// Legal pages carry the holder's details, which live outside git (see scripts/private-data.ts).
const { titular } = loadPrivate({ strict: Boolean(siteUrl) });
for (const id of LEGAL_PAGES) {
  const legal = renderLegalPage({ lang: 'es', base, siteUrl }, id, titular);
  await write(join(id, 'index.html'), applyTemplate(template, legal));
}
console.log(
  `Pre-rendered ${LEGAL_PAGES.length} legal pages${LEGAL_DRAFT ? ' (draft, noindex)' : ''}`,
);

await write('404.html', applyTemplate(template, renderNotFoundPage({ lang: 'es', base, siteUrl })));
console.log('Pre-rendered 404.html');

if (siteUrl) {
  const ctx = { lang: 'es', base, siteUrl } as const;
  const entries = (kind: PageKind) =>
    LANGS.map(({ code }) => {
      const alternates = LANGS.map(
        (l) =>
          `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${kindUrl(ctx, kind, l.code)}"/>`,
      ).join('\n');
      return `  <url>\n    <loc>${kindUrl(ctx, kind, code)}</loc>\n${alternates}\n  </url>`;
    });
  const urls = [...entries('home'), ...entries('carta'), ...entries('menu')];
  // Draft legal pages are noindex, so they stay out of the sitemap until they are approved.
  if (!LEGAL_DRAFT) {
    for (const id of LEGAL_PAGES) {
      urls.push(`  <url>\n    <loc>${siteUrl}${base}${id}/</loc>\n  </url>`);
    }
  }
  await write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
  );
}
await write(
  'robots.txt',
  `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}${base}sitemap.xml\n` : ''}`,
);
console.log(
  siteUrl
    ? 'Wrote sitemap.xml and robots.txt'
    : 'Wrote robots.txt (set SITE_URL to also get sitemap.xml)',
);

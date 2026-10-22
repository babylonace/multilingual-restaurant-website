import { LANGS } from '../data/langs';
import { kindUrl, type PageKind } from './context';

interface SiteContext {
  base: string;
  siteUrl: string;
}

/**
 * Every language of the home, the carta and the menú del día, each with its alternates. The
 * legal pages are noindex (they carry the holder's NIE), so they never enter the sitemap.
 */
export function sitemapXml({ base, siteUrl }: SiteContext): string {
  const ctx = { base, siteUrl };
  const entries = (kind: PageKind) =>
    LANGS.map(({ code }) => {
      const alternates = LANGS.map(
        (l) =>
          `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${kindUrl(ctx, kind, l.code)}"/>`,
      ).join('\n');
      return `  <url>\n    <loc>${kindUrl(ctx, kind, code)}</loc>\n${alternates}\n  </url>`;
    });
  const urls = [...entries('home'), ...entries('carta'), ...entries('menu')];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

/** Everything may be crawled; the sitemap is announced when the build knows the public origin. */
export function robotsTxt({
  base,
  siteUrl,
}: {
  base: string;
  siteUrl: string | undefined;
}): string {
  return `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}${base}sitemap.xml\n` : ''}`;
}

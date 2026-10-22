/**
 * `sitemap.xml`, only when the build knows the public origin (`SITE_URL`): a sitemap needs
 * absolute URLs. A dynamic route so that without an origin there is simply no file.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { base, siteUrl } from '../lib/build';
import { sitemapXml } from '../render/sitemap';

export const getStaticPaths = (() =>
  siteUrl ? [{ params: { sitemap: 'sitemap' } }] : []) satisfies GetStaticPaths;

export const GET: APIRoute = () =>
  new Response(sitemapXml({ base, siteUrl: siteUrl! }), {
    headers: { 'Content-Type': 'application/xml' },
  });

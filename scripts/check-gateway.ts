/**
 * Checks what a visitor gets from the public site, whichever way it is served: Cloudflare Pages
 * directly, or through the Netlify gateway that dodges the LaLiga blocks
 * (docs/plan-bloqueos-laliga.md). Indexable pages carry no X-Robots-Tag, hashed assets keep their
 * one-year cache, no redirect or page leaks the origin host, www goes to the apex and the old
 * Netlify address goes to the carta, each in one hop.
 *
 * Usage: tsx scripts/check-gateway.ts [base URL, default https://inkawasi.es]
 * Prints every problem and exits with 1 if there is any.
 */
import { fileURLToPath } from 'node:url';

export interface Snapshot {
  status: number;
  /** Lower-case header names. */
  headers: Record<string, string>;
  body: string;
}

/** Hosts that only exist behind the site: a visitor must never see them. */
export const ORIGIN_HOSTS = ['example-project.pages.dev', 'origin.example.com'];

export const PAGES = ['/', '/carta/', '/en/carta/', '/menu-del-dia/'];

const REDIRECT = new Set([301, 308]);

const leaks = (text: string) => ORIGIN_HOSTS.filter((host) => text.includes(host));

/** An indexable page: 200, no X-Robots-Tag, no origin host anywhere in the HTML. */
export function pageProblems(path: string, page: Snapshot): string[] {
  const problems: string[] = [];
  if (page.status !== 200) problems.push(`${path}: status ${page.status}, expected 200`);
  const robots = page.headers['x-robots-tag'];
  if (robots) problems.push(`${path}: X-Robots-Tag "${robots}" would take it out of Google`);
  for (const host of leaks(page.body)) problems.push(`${path}: the HTML mentions ${host}`);
  return problems;
}

/** A hashed build asset: cached for a year and never revalidated. */
export function assetProblems(path: string, asset: Snapshot): string[] {
  const cache = asset.headers['cache-control'] ?? '';
  if (asset.status === 200 && cache.includes('max-age=31536000') && cache.includes('immutable')) {
    return [];
  }
  return [
    `${path}: status ${asset.status}, Cache-Control "${cache}", expected a one-year immutable cache`,
  ];
}

/** One permanent redirect to exactly `expected` (relative locations resolve against `from`). */
export function redirectProblems(from: string, response: Snapshot, expected: string): string[] {
  const location = response.headers.location;
  if (!REDIRECT.has(response.status) || !location) {
    return [`${from}: status ${response.status}, expected a permanent redirect to ${expected}`];
  }
  const target = new URL(location, from).href;
  if (target !== expected) return [`${from}: redirects to ${target}, expected ${expected}`];
  return [];
}

/** The first hashed stylesheet the page links, to check the asset cache. */
export function findAsset(html: string): string | undefined {
  return html.match(/\/_astro\/[^"'\s>]+\.css/)?.[0];
}

async function snapshot(url: string): Promise<Snapshot> {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => (headers[name.toLowerCase()] = value));
  return { status: response.status, headers, body: await response.text() };
}

export async function checkGateway(base: string): Promise<string[]> {
  const origin = new URL(base).origin;
  const problems: string[] = [];

  const home = await snapshot(`${origin}/`);
  for (const path of PAGES) {
    problems.push(...pageProblems(path, path === '/' ? home : await snapshot(origin + path)));
  }

  const asset = findAsset(home.body);
  if (asset) problems.push(...assetProblems(asset, await snapshot(origin + asset)));
  else problems.push('/: no /_astro/*.css stylesheet found to check the asset cache');

  problems.push(
    ...redirectProblems(`${origin}/carta`, await snapshot(`${origin}/carta`), `${origin}/carta/`),
  );

  const missing = await snapshot(`${origin}/no-existe-inkawasi/`);
  if (missing.status !== 404)
    problems.push(`/no-existe-inkawasi/: status ${missing.status}, expected 404`);

  // Only the real domain has a www twin and an old Netlify address; a test subdomain has neither.
  if (new URL(origin).hostname === 'inkawasi.es') {
    const www = 'https://www.inkawasi.es/carta/';
    problems.push(...redirectProblems(www, await snapshot(www), 'https://inkawasi.es/carta/'));
    const old = 'https://inkawasi.netlify.app/menu';
    problems.push(...redirectProblems(old, await snapshot(old), 'https://inkawasi.es/carta/'));
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const base = process.argv[2] ?? 'https://inkawasi.es';
  const problems = await checkGateway(base).catch((error: Error) => {
    // A connection that never opens is what a LaLiga block looks like from a Spanish ISP.
    const cause = (error.cause as { code?: string } | undefined)?.code ?? error.message;
    return [`could not connect (${cause}); during a LaLiga block, Cloudflare IPs time out`];
  });
  if (problems.length > 0) {
    console.error(`${base}: ${problems.length} problem(s)\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`${base}: pages indexable, assets cached, redirects in one hop`);
}

import { describe, expect, it } from 'vitest';
import {
  assetProblems,
  findAsset,
  pageProblems,
  redirectProblems,
  type Snapshot,
} from '../../scripts/check-gateway';

const snap = (status: number, headers: Record<string, string> = {}, body = ''): Snapshot => ({
  status,
  headers,
  body,
});

describe('pageProblems', () => {
  it('accepts an indexable page', () => {
    expect(
      pageProblems('/', snap(200, {}, '<link rel="canonical" href="https://inkawasi.es/" />')),
    ).toEqual([]);
  });

  it('flags the noindex that *.pages.dev carries', () => {
    expect(pageProblems('/', snap(200, { 'x-robots-tag': 'noindex' }))).toEqual([
      '/: X-Robots-Tag "noindex" would take it out of Google',
    ]);
  });

  it('flags a wrong status and every origin host in the HTML', () => {
    const body =
      '<a href="https://origin.example.com/carta/">x</a> https://example-project.pages.dev/';
    expect(pageProblems('/carta/', snap(503, {}, body))).toEqual([
      '/carta/: status 503, expected 200',
      '/carta/: the HTML mentions example-project.pages.dev',
      '/carta/: the HTML mentions origin.example.com',
    ]);
  });
});

describe('assetProblems', () => {
  it('needs a one-year immutable cache', () => {
    const year = { 'cache-control': 'public, max-age=31536000, immutable' };
    expect(assetProblems('/_astro/a.css', snap(200, year))).toEqual([]);
    expect(
      assetProblems('/_astro/a.css', snap(200, { 'cache-control': 'public, max-age=0' })),
    ).toHaveLength(1);
    expect(assetProblems('/_astro/a.css', snap(404, year))).toHaveLength(1);
  });
});

describe('redirectProblems', () => {
  const from = 'https://inkawasi.es/carta';

  it('resolves a relative Location against the request', () => {
    expect(
      redirectProblems(from, snap(308, { location: '/carta/' }), 'https://inkawasi.es/carta/'),
    ).toEqual([]);
  });

  it('rejects a redirect that leaks the origin host', () => {
    const leak = snap(301, { location: 'https://origin.example.com/carta/' });
    expect(redirectProblems(from, leak, 'https://inkawasi.es/carta/')).toEqual([
      `${from}: redirects to https://origin.example.com/carta/, expected https://inkawasi.es/carta/`,
    ]);
  });

  it('rejects a temporary redirect or none at all', () => {
    expect(
      redirectProblems(from, snap(302, { location: '/carta/' }), 'https://inkawasi.es/carta/'),
    ).toHaveLength(1);
    expect(redirectProblems(from, snap(200), 'https://inkawasi.es/carta/')).toHaveLength(1);
  });
});

describe('findAsset', () => {
  it('finds the first hashed stylesheet', () => {
    const html =
      '<link rel="stylesheet" href="/_astro/footer.D82_Kjbi.css" /><img src="/_astro/a.avif">';
    expect(findAsset(html)).toBe('/_astro/footer.D82_Kjbi.css');
    expect(findAsset('<p>no styles</p>')).toBeUndefined();
  });
});

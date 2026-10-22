import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/data/langs';
import { picture, pictureOf } from '../../src/render/picture';
import { robotsTxt, sitemapXml } from '../../src/render/sitemap';
import { TEST_PICTURES } from './fixtures';

describe('sitemap.xml', () => {
  const xml = sitemapXml({ base: '/', siteUrl: 'https://example.test' });
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  it('lists the home, the carta and the menú del día in every language', () => {
    expect(locs).toHaveLength(LANGS.length * 3);
    expect(locs).toContain('https://example.test/');
    expect(locs).toContain('https://example.test/carta/');
    expect(locs).toContain('https://example.test/en/menu-del-dia/');
  });

  it('gives every URL its alternates', () => {
    expect(xml.match(/hreflang=/g)).toHaveLength(LANGS.length * LANGS.length * 3);
  });

  it('leaves out the legal pages, which are noindex', () => {
    expect(xml).not.toMatch(/aviso-legal|privacidad/);
  });
});

describe('robots.txt', () => {
  it('allows everything and announces the sitemap when the origin is known', () => {
    expect(robotsTxt({ base: '/', siteUrl: 'https://example.test' })).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://example.test/sitemap.xml\n',
    );
    expect(robotsTxt({ base: '/', siteUrl: undefined })).toBe('User-agent: *\nAllow: /\n');
  });
});

describe('picture', () => {
  it('offers AVIF before WebP and escapes the alt text', () => {
    const out = picture(TEST_PICTURES.cover, {
      class: 'x',
      alt: 'Sala "Inkawasi"',
      sizes: '100vw',
    }).toString();
    expect(out.indexOf('image/avif')).toBeLessThan(out.indexOf('image/webp'));
    expect(out).toContain('alt="Sala &quot;Inkawasi&quot;"');
    expect(out).not.toContain('loading=');
  });

  it('fails the build for a favourite without a photo', () => {
    expect(() => pictureOf(TEST_PICTURES, 'g-nope')).toThrow('g-nope');
  });
});

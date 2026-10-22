import { describe, expect, it } from 'vitest';
import { preferredLang } from '../../src/client/lang-pref';
import { renderPage } from '../../src/render/page';
import { TEST_PICTURES } from './fixtures';

const SUPPORTED = ['es', 'en', 'fr', 'gl'];
const CHROME = 'Mozilla/5.0 Chrome/130';

const pick = (saved: string | null, langs: string[], ua = CHROME) =>
  preferredLang(SUPPORTED, 'es', saved, langs, ua);

describe('preferredLang', () => {
  it('stays on Spanish for Spanish browsers', () => {
    expect(pick(null, ['es-ES', 'en'])).toBeUndefined();
  });

  it('picks the first supported browser language', () => {
    expect(pick(null, ['ja-JP', 'fr-CA', 'en'])).toBe('fr');
  });

  it('prefers the saved choice over the browser', () => {
    expect(pick('gl', ['en-US'])).toBe('gl');
  });

  it('lets a saved Spanish choice override an English browser', () => {
    expect(pick('es', ['en-US'])).toBeUndefined();
  });

  it('ignores a saved value that is no longer supported', () => {
    expect(pick('xx', ['en-US'])).toBe('en');
  });

  it('never redirects crawlers, so every language stays indexable', () => {
    expect(pick(null, ['en-US'], 'Mozilla/5.0 (compatible; Googlebot/2.1)')).toBeUndefined();
    expect(pick('en', ['en-US'], 'Chrome-Lighthouse')).toBeUndefined();
  });
});

describe('inline redirect script', () => {
  const head = renderPage({ lang: 'es', base: '/', pictures: TEST_PICTURES }).head;

  it('embeds plain JavaScript (no build-tool helpers that would be undefined in the page)', () => {
    expect(head).not.toContain('__name');
  });

  it('is syntactically valid JavaScript', () => {
    const script = /<script>(.*?)<\/script>/s.exec(head)?.[1] ?? '';
    expect(() => new Function(script)).not.toThrow();
  });
});

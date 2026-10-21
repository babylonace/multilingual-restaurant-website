import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/data/langs';
import { cartaPath, langHref, langPath } from '../../src/render/context';
import { renderRedirectPage } from '../../src/render/redirect-page';
import { resolveRoute } from '../../src/render/routes';

describe('resolveRoute', () => {
  it('serves the default-language carta at /carta/', () => {
    expect(resolveRoute('/carta/')).toEqual({ kind: 'carta', lang: 'es' });
  });

  it('serves other languages under their own prefix', () => {
    expect(resolveRoute('/en/carta/')).toEqual({ kind: 'carta', lang: 'en' });
    expect(resolveRoute('/ar/carta/index.html')).toEqual({ kind: 'carta', lang: 'ar' });
  });

  it('treats language roots as redirects', () => {
    expect(resolveRoute('/')).toEqual({ kind: 'redirect', lang: 'es' });
    expect(resolveRoute('/gl/')).toEqual({ kind: 'redirect', lang: 'gl' });
  });

  it('serves the legal pages in Spanish only', () => {
    expect(resolveRoute('/aviso-legal/')).toEqual({
      kind: 'legal',
      lang: 'es',
      legal: 'aviso-legal',
    });
    expect(resolveRoute('/privacidad/index.html')).toEqual({
      kind: 'legal',
      lang: 'es',
      legal: 'privacidad',
    });
    expect(resolveRoute('/en/privacidad/')).toBeUndefined();
  });

  it('does not invent routes', () => {
    expect(resolveRoute('/xx/carta/')).toBeUndefined();
    expect(resolveRoute('/es/carta/')).toBeUndefined();
    expect(resolveRoute('/menu/')).toBeUndefined();
    expect(resolveRoute('/assets/logo.webp')).toBeUndefined();
  });

  it('resolves every path the build writes', () => {
    for (const { code } of LANGS) {
      expect(resolveRoute(`/${cartaPath(code)}`)).toEqual({ kind: 'carta', lang: code });
      expect(resolveRoute(`/${langPath(code)}`)).toEqual({ kind: 'redirect', lang: code });
    }
  });
});

describe('carta URLs', () => {
  it('keeps the QR-code URL stable', () => {
    expect(langHref({ lang: 'es', base: '/' }, 'es')).toBe('/carta/');
  });
});

describe('redirect page', () => {
  const page = renderRedirectPage({ lang: 'en', base: '/', siteUrl: 'https://example.test' });

  it('forwards to the carta of the same language', () => {
    expect(page).toContain('url=/en/carta/');
    expect(page).toContain('location.replace("/en/carta/"+location.hash)');
  });

  it('points search engines at the carta', () => {
    expect(page).toContain('<link rel="canonical" href="https://example.test/en/carta/"');
  });

  it('declares its language and keeps a plain link as fallback', () => {
    expect(page).toContain('<html lang="en">');
    expect(page).toContain('<a href="/en/carta/">');
  });
});

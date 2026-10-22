import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/data/langs';
import { cartaPath, kindHref, langHref, langPath } from '../../src/render/context';
import { resolveRoute } from '../../src/render/routes';

describe('resolveRoute', () => {
  it('serves the default-language carta at /carta/', () => {
    expect(resolveRoute('/carta/')).toEqual({ kind: 'carta', lang: 'es' });
  });

  it('serves other languages under their own prefix', () => {
    expect(resolveRoute('/en/carta/')).toEqual({ kind: 'carta', lang: 'en' });
    expect(resolveRoute('/ar/carta/index.html')).toEqual({ kind: 'carta', lang: 'ar' });
  });

  it('serves a home page at every language root', () => {
    expect(resolveRoute('/')).toEqual({ kind: 'home', lang: 'es' });
    expect(resolveRoute('/gl/')).toEqual({ kind: 'home', lang: 'gl' });
  });

  it('serves the menú del día in every language, keeping its Spanish slug', () => {
    expect(resolveRoute('/menu-del-dia/')).toEqual({ kind: 'menu', lang: 'es' });
    expect(resolveRoute('/en/menu-del-dia/')).toEqual({ kind: 'menu', lang: 'en' });
    expect(resolveRoute('/es/menu-del-dia/')).toBeUndefined();
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
      expect(resolveRoute(`/${langPath(code)}`)).toEqual({ kind: 'home', lang: code });
    }
  });
});

describe('carta URLs', () => {
  it('keeps the QR-code URL stable', () => {
    expect(langHref({ base: '/' }, 'es')).toBe('/carta/');
  });
});

describe('home URLs', () => {
  it('puts the Spanish home at the root and the others under their language', () => {
    expect(kindHref({ base: '/' }, 'home', 'es')).toBe('/');
    expect(kindHref({ base: '/' }, 'home', 'en')).toBe('/en/');
    expect(kindHref({ base: '/site/' }, 'carta', 'gl')).toBe('/site/gl/carta/');
  });
});

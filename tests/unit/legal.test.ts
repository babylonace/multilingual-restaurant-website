import { describe, expect, it } from 'vitest';
import { LEGAL_PAGES } from '../../src/data/legal';
import { renderLegalPage } from '../../src/render/legal';
import { TEST_PICTURES } from './fixtures';

const TITULAR = { nombre: 'Ana Pérez', nie: 'X1234567L', domicilio: 'Calle Falsa 1, Ferrol' };
const CTX = {
  lang: 'es',
  base: '/',
  pictures: TEST_PICTURES,
  siteUrl: 'https://example.test',
} as const;

describe.each(LEGAL_PAGES)('legal page "%s"', (id) => {
  const draft = renderLegalPage(CTX, id, TITULAR, true);

  it('is Spanish and prints the holder from the private data', () => {
    expect(draft.lang).toBe('es');
    expect(draft.body).toContain('Ana Pérez');
    expect(draft.body).toContain('X1234567L');
    expect(draft.body).toContain('Calle Falsa 1, Ferrol');
  });

  it('says it is a draft while it is one', () => {
    expect(draft.body).toContain('Borrador pendiente de revisión');
  });

  it('drops the draft marks once approved but stays out of search engines', () => {
    const final = renderLegalPage(CTX, id, TITULAR, false);
    expect(final.body).not.toContain('Borrador');
    for (const page of [draft, final]) {
      expect(page.head).toContain('<meta name="robots" content="noindex" />');
      expect(page.head).not.toContain('rel="canonical"');
    }
  });

  it('escapes the holder data', () => {
    const page = renderLegalPage(CTX, id, { ...TITULAR, nombre: '<b>x</b>' }, true);
    expect(page.body).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('contents', () => {
  it('identifies the holder as article 10 LSSI requires', () => {
    const { body } = renderLegalPage(CTX, 'aviso-legal', TITULAR, true);
    expect(body).toMatch(/Titular/);
    expect(body).toMatch(/NIE/);
    expect(body).toMatch(/Domicilio/);
    expect(body).toContain('contacto@inkawasi.es');
  });

  it('states there are no cookies and names the processors', () => {
    const { body } = renderLegalPage(CTX, 'privacidad', TITULAR, true);
    expect(body).toContain('no usa cookies');
    expect(body).toContain('Cloudflare');
    expect(body).toContain('Netlify');
    expect(body).toContain('Gmail');
    expect(body).toContain('aepd.es');
  });
});

import { describe, expect, it } from 'vitest';
import { LEGAL_PAGES } from '../../src/data/legal';
import { renderLegalPage } from '../../src/render/legal';

const TITULAR = { nombre: 'Ana Pérez', nie: 'X1234567L', domicilio: 'Calle Falsa 1, Ferrol' };
const CTX = { lang: 'es', base: '/', siteUrl: 'https://example.test' } as const;

describe.each(LEGAL_PAGES)('legal page "%s"', (id) => {
  const draft = renderLegalPage(CTX, id, TITULAR, true);

  it('is Spanish and prints the holder from the private data', () => {
    expect(draft.lang).toBe('es');
    expect(draft.body).toContain('Ana Pérez');
    expect(draft.body).toContain('X1234567L');
    expect(draft.body).toContain('Calle Falsa 1, Ferrol');
  });

  it('says it is a draft and asks search engines to stay away while it is one', () => {
    expect(draft.body).toContain('Borrador pendiente de revisión');
    expect(draft.head).toContain('<meta name="robots" content="noindex" />');
    expect(draft.head).not.toContain('rel="canonical"');
  });

  it('drops the draft marks once approved and becomes indexable', () => {
    const final = renderLegalPage(CTX, id, TITULAR, false);
    expect(final.body).not.toContain('Borrador');
    expect(final.head).not.toContain('noindex');
    expect(final.head).toContain(`<link rel="canonical" href="https://example.test/${id}/"`);
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
    expect(body).toContain('owner@example.com');
  });

  it('states there are no cookies and names the processors', () => {
    const { body } = renderLegalPage(CTX, 'privacidad', TITULAR, true);
    expect(body).toContain('no usa cookies');
    expect(body).toContain('Cloudflare');
    expect(body).toContain('Netlify');
    expect(body).toContain('aepd.es');
  });
});

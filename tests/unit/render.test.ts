import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/data/langs';
import { DISHES } from '../../src/data/menu';
import { renderPage } from '../../src/render/page';

const SITE = 'https://example.test';

describe.each(LANGS)('page "$code"', ({ code, rtl }) => {
  const page = renderPage({ lang: code, base: '/', siteUrl: SITE });

  it('sets lang and direction', () => {
    expect(page.lang).toBe(code);
    expect(page.dir).toBe(rtl ? 'rtl' : 'ltr');
  });

  it('prints every dish, so the menu is in the HTML before any script runs', () => {
    for (const dish of Object.values(DISHES)) expect(page.body).toContain(dish.name);
  });

  it('has one visible tabpanel and the rest hidden', () => {
    const panels = page.body.match(/role="tabpanel"[^>]*>/g) ?? [];
    expect(panels).toHaveLength(7);
    expect(panels.filter((p) => !p.includes('hidden'))).toHaveLength(1);
  });

  it('wires each tab to an existing panel', () => {
    for (const [, id] of page.body.matchAll(/aria-controls="([^"]+)"/g)) {
      expect(page.body).toContain(`id="${id}"`);
    }
  });

  it('has unique ids', () => {
    const ids = [...page.body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('leaks no template artifacts', () => {
    const visible = (page.body + page.head).replace(/<script[\s\S]*?<\/script>/g, '');
    expect(visible).not.toMatch(/undefined|\[object|NaN|\{\{/);
  });

  it('emits valid structured data', () => {
    const json = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(page.head)?.[1];
    expect(json).toBeDefined();
    const data = JSON.parse(json ?? '{}');
    expect(data['@type']).toBe('Restaurant');
    expect(data.hasMenu.hasMenuSection.length).toBeGreaterThan(0);
  });

  it('declares every language as an alternate, plus x-default', () => {
    for (const l of LANGS) expect(page.head).toContain(`hreflang="${l.code}"`);
    expect(page.head).toContain('hreflang="x-default"');
  });
});

describe('rendering rules', () => {
  it('links languages through the base path', () => {
    const { body } = renderPage({ lang: 'es', base: '/carta/' });
    expect(body).toContain('href="/carta/en/"');
    expect(body).toContain('href="/carta/"');
    expect(body).toContain('src="/carta/assets/logo.webp"');
  });

  it('skips canonical and hreflang without a site URL', () => {
    const { head } = renderPage({ lang: 'es', base: '/' });
    expect(head).not.toContain('rel="canonical"');
    expect(head).not.toContain('hreflang');
  });

  it('adds the language redirect script only on the default-language page', () => {
    expect(renderPage({ lang: 'es', base: '/' }).head).toContain('location.replace');
    expect(renderPage({ lang: 'en', base: '/' }).head).not.toContain('location.replace');
  });

  it('marks the current language in the switcher', () => {
    const { body } = renderPage({ lang: 'gl', base: '/' });
    expect(body).toMatch(/hreflang="gl"[^>]*aria-current="true"/);
  });

  it('prints the weekend badge on Sunday-only dishes', () => {
    const { body } = renderPage({ lang: 'en', base: '/' });
    expect(body).toContain('Sundays');
  });
});

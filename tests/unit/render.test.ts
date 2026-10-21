import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/data/langs';
import { DISHES } from '../../src/data/menu';
import { LOCALES } from '../../src/i18n';
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

describe.each(LANGS)('page "$code" extras', ({ code }) => {
  const { body, head } = renderPage({ lang: code, base: '/', siteUrl: SITE });

  it('shows all 14 allergens in the legend, with the traces note', () => {
    const legend = /<ul class="legend__grid">(.*?)<\/ul>/s.exec(body)?.[1] ?? '';
    expect(legend.match(/<li class="legend__item">/g)).toHaveLength(14);
    for (const key of ['frutosCascara', 'altramuces'] as const) {
      expect(legend).toContain(LOCALES[code].allergens[key]);
      expect(body).toContain(`id="alg-${key}"`);
    }
    expect(body).toContain(LOCALES[code].ui.allergenTraces);
  });

  it('offers a ready-made WhatsApp message per intent, and Just Eat as a secondary link', () => {
    const actions = /<section class="actions".*?<\/section>/s.exec(body)?.[0] ?? '';
    const links = [
      ...actions.matchAll(/href="(https:\/\/wa\.me\/[^"]+)"[^>]*data-prop-intent="(\w+)"/g),
    ];
    expect(links.map((m) => m[2])).toEqual(['reservar', 'recoger', 'domicilio', 'consulta']);
    for (const [, href] of links) expect(href).toMatch(/^https:\/\/wa\.me\/34614922183\?text=Hola/);
    expect(body).toContain('utm_content=carta');
    expect(body).toContain('data-event="justeat_clic"');
  });

  it('no longer links the saved-message WhatsApp URL', () => {
    expect(body + head).not.toContain('wa.me/message');
  });

  it('prints the opening hours and links the legal pages', () => {
    expect(body).toContain('11:00–23:00');
    expect(body).toContain('09:00–23:00');
    expect(body).toContain(LOCALES[code].ui.closed);
    expect(body).toContain('href="/aviso-legal/"');
    expect(body).toContain('href="/privacidad/"');
  });

  it('points social previews at the Open Graph image', () => {
    expect(head).toContain(`<meta property="og:image" content="${SITE}/og-image.png" />`);
    expect(head).toContain('content="summary_large_image"');
  });
});

describe('structured data', () => {
  const json = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(
    renderPage({ lang: 'es', base: '/', siteUrl: SITE }).head,
  )?.[1];
  const data = JSON.parse(json ?? '{}');

  it('describes the opening hours, with no Monday and midnight as 00:00', () => {
    const days = data.openingHoursSpecification.flatMap(
      (s: { dayOfWeek: string[] }) => s.dayOfWeek,
    );
    expect(days).toEqual(['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    const weekend = data.openingHoursSpecification[1];
    expect(weekend).toMatchObject({ opens: '11:00', closes: '00:00' });
  });

  it('has coordinates, postal code, map and reservations', () => {
    expect(data.geo).toEqual({
      '@type': 'GeoCoordinates',
      latitude: 43.4878407,
      longitude: -8.2178932,
    });
    expect(data.address.postalCode).toBe('15404');
    expect(data.hasMap).toBe('https://maps.app.goo.gl/xJ61NGccX21LAM6b9');
    expect(data.acceptsReservations).toBe(true);
  });

  it('claims nothing it cannot back up', () => {
    expect(data).not.toHaveProperty('aggregateRating');
    expect(data).not.toHaveProperty('priceRange');
  });
});

describe('rendering rules', () => {
  it('links languages through the base path', () => {
    const { body } = renderPage({ lang: 'es', base: '/site/' });
    expect(body).toContain('href="/site/en/carta/"');
    expect(body).toContain('href="/site/carta/"');
    expect(body).toContain('src="/site/assets/logo.webp"');
  });

  it('puts every canonical and alternate URL under /carta/', () => {
    const { head } = renderPage({ lang: 'gl', base: '/', siteUrl: SITE });
    expect(head).toContain(`<link rel="canonical" href="${SITE}/gl/carta/"`);
    expect(head).toContain(`hreflang="es" href="${SITE}/carta/"`);
    expect(head).toContain(`hreflang="x-default" href="${SITE}/carta/"`);
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

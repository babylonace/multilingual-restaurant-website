import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/data/langs';
import { DISHES } from '../../src/data/menu';
import { LOCALES } from '../../src/i18n';
import { renderHomePage, renderPage } from '../../src/render/page';

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

describe.each(LANGS)('carta "$code" extras', ({ code }) => {
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

  it('asks for a review on Google Maps and on TripAdvisor', () => {
    expect(body).toContain('href="https://g.page/r/CdLbyRjbHjW8EAE/review"');
    expect(body).toContain(
      'href="https://www.tripadvisor.com.pe/UserReviewEdit-d34747578?m=68676"',
    );
    expect(body).toContain(LOCALES[code].ui.reviewTitle);
  });

  it('links back to the home page of the same language and to the legal pages', () => {
    expect(body).toContain(
      `<a class="masthead__logo" href="${code === 'es' ? '/' : `/${code}/`}">`,
    );
    expect(body).toContain('href="/aviso-legal/"');
    expect(body).toContain('href="/privacidad/"');
  });

  it('keeps the hours out: Google Business Profile is the only place they live', () => {
    expect(body).not.toMatch(/\d\d:\d\d–\d\d:\d\d/);
    expect(head).not.toContain('openingHours');
  });

  it('no longer links the saved-message WhatsApp URL', () => {
    expect(body + head).not.toContain('wa.me/message');
  });

  it('points social previews at the Open Graph image', () => {
    expect(head).toContain(`<meta property="og:image" content="${SITE}/og-image.jpg" />`);
    expect(head).toContain('content="summary_large_image"');
  });
});

describe.each(LANGS)('home "$code"', ({ code, rtl }) => {
  const ui = LOCALES[code].ui;
  const { body, head, lang, dir } = renderHomePage({ lang: code, base: '/', siteUrl: SITE });
  const carta = code === 'es' ? '/carta/' : `/${code}/carta/`;

  it('sets lang and direction, and has its own title', () => {
    expect(lang).toBe(code);
    expect(dir).toBe(rtl ? 'rtl' : 'ltr');
    expect(head).toContain(`<title>${ui.homeMetaTitle}</title>`);
  });

  it('shows the dining-room photo with its size, alt text and high priority', () => {
    const img = /<img[^>]*class="cover__img"[^>]*>/s.exec(body)?.[0] ?? '';
    expect(img).toContain('width="1600"');
    expect(img).toContain('height="900"');
    expect(img).toContain('fetchpriority="high"');
    expect(img).toContain('assets/portada/restaurante-800.webp 800w');
    expect(img).toContain(`alt="${ui.coverAlt}"`);
  });

  it('makes the carta one button among the others', () => {
    expect(body).toMatch(new RegExp(`class="pill pill--gold pill--lg"\\s+href="${carta}"`));
    expect(body).toContain(ui.viewMenu);
  });

  it('offers a ready-made WhatsApp message per intent', () => {
    const actions = /<section class="actions".*?<\/section>/s.exec(body)?.[0] ?? '';
    const links = [
      ...actions.matchAll(/href="(https:\/\/wa\.me\/[^"]+)"[^>]*data-prop-intent="(\w+)"/g),
    ];
    expect(links.map((m) => m[2])).toEqual(['reservar', 'recoger', 'domicilio', 'consulta']);
    for (const [, href] of links) expect(href).toMatch(/^https:\/\/wa\.me\/34614922183\?text=Hola/);
  });

  it('opens directions in Google Maps and the place card for the hours', () => {
    expect(body).toContain(
      'href="https://www.google.com/maps/dir/?api=1&amp;destination=43.4878407,-8.2178932"',
    );
    expect(body).toContain('href="https://maps.app.goo.gl/xJ61NGccX21LAM6b9"');
    expect(body).toContain(ui.viewHours);
    expect(body).not.toMatch(/\d\d:\d\d–\d\d:\d\d/);
  });

  it('links Just Eat with its tracking tags, and asks for both reviews', () => {
    expect(body).toContain('utm_content=home');
    expect(body).toContain('data-event="justeat_clic"');
    expect(body).toContain('href="https://g.page/r/CdLbyRjbHjW8EAE/review"');
    expect(body).toContain('tripadvisor.com.pe/UserReviewEdit-d34747578');
  });

  it('keeps the reservation system out of sight', () => {
    expect(body).not.toMatch(/\/reservar|\/reserva\/|\/equipo/);
  });

  it('switches language between home pages, not to the cartas', () => {
    const menu = /<ul class="lang__list">.*?<\/ul>/s.exec(body)?.[0] ?? '';
    expect(menu).toMatch(/href="\/en\/"\s+hreflang="en"/);
    expect(menu).not.toContain('/carta/');
  });

  it('declares canonical and alternates for the home URLs', () => {
    expect(head).toContain(
      `<link rel="canonical" href="${SITE}${code === 'es' ? '/' : `/${code}/`}"`,
    );
    expect(head).toContain(`hreflang="en" href="${SITE}/en/"`);
    expect(head).toContain(`hreflang="x-default" href="${SITE}/"`);
  });

  it('prints every visible string from the locale, with no template artifacts', () => {
    const visible = (body + head).replace(/<script[\s\S]*?<\/script>/g, '');
    expect(visible).not.toMatch(/undefined|\[object|NaN|\{\{/);
  });
});

describe('structured data', () => {
  const read = (page: { head: string }) =>
    JSON.parse(
      /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(page.head)?.[1] ?? '{}',
    );
  const data = read(renderPage({ lang: 'es', base: '/', siteUrl: SITE }));
  const home = read(renderHomePage({ lang: 'es', base: '/', siteUrl: SITE }));

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

  it('claims nothing it cannot back up, and keeps hours out', () => {
    for (const d of [data, home]) {
      expect(d).not.toHaveProperty('aggregateRating');
      expect(d).not.toHaveProperty('priceRange');
      expect(d).not.toHaveProperty('openingHoursSpecification');
    }
  });

  it('carries the whole menu on the carta and points at it from the home page', () => {
    expect(data.hasMenu['@type']).toBe('Menu');
    expect(home.hasMenu).toBe(`${SITE}/carta/`);
    expect(home.image).toBe(`${SITE}/assets/portada/restaurante-1600.webp`);
  });

  it('lists TripAdvisor among the profiles', () => {
    expect(data.sameAs).toContain(
      'https://www.tripadvisor.com/Restaurant_Review-g642225-d34747578-Reviews-Inkawasi-Ferrol_Province_of_A_Coruna_Galicia.html',
    );
  });
});

describe('legacy links', () => {
  it('sends an old /#marino link from the home page to the carta of that language', () => {
    expect(renderHomePage({ lang: 'es', base: '/' }).head).toContain(
      'location.replace("/carta/"+location.hash)',
    );
    expect(renderHomePage({ lang: 'fr', base: '/' }).head).toContain(
      'location.replace("/fr/carta/"+location.hash)',
    );
  });

  it('only forwards real tab names', () => {
    const { head } = renderHomePage({ lang: 'es', base: '/' });
    const pattern = /test\(location\.hash\)/.test(head)
      ? /\/\^#\(([^)]*)\)\$\//.exec(head)?.[1]
      : '';
    expect(pattern?.split('|')).toEqual([
      'entrantes',
      'sopas',
      'marino',
      'wok',
      'criollo',
      'porciones',
      'bebidas',
    ]);
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

import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/data/langs';
import { LOCALES } from '../../src/i18n';
import { bookingSlots } from '../../src/lib/hours';
import {
  clampGuests,
  formatDate,
  MAX_GUESTS,
  reservationMessage,
  todayInSpain,
  type Reservation,
} from '../../src/lib/reservation';
import { kindHref, kindPath } from '../../src/render/context';
import { renderHomePage, renderPage, renderReservarPage } from '../../src/render/page';
import { resolveRoute } from '../../src/render/routes';
import { sitemapXml } from '../../src/render/sitemap';
import { TEST_PICTURES } from './fixtures';

const BOOKING: Reservation = {
  name: 'Ana Pérez',
  phone: '+34 600 111 222',
  date: '2026-11-12',
  time: '21:00',
  guests: 4,
  notes: '',
};

describe('reservationMessage', () => {
  it('writes name, phone, day, time and guests, in Spanish for the staff', () => {
    expect(reservationMessage(BOOKING)).toBe(
      [
        'Hola, quiero reservar una mesa en Inkawasi.',
        'Nombre: Ana Pérez',
        'Teléfono: +34 600 111 222',
        'Día: jueves 12/11/2026',
        'Hora: 21:00',
        'Personas: 4',
      ].join('\n'),
    );
  });

  it('leaves the phone line out when none was given: the WhatsApp already shows the number', () => {
    const message = reservationMessage({ ...BOOKING, phone: '  ' });
    expect(message).not.toContain('Teléfono');
    expect(message).toContain('Nombre: Ana Pérez\nDía: jueves 12/11/2026');
  });

  it('adds the notes only when there are some, and the language line last', () => {
    const message = reservationMessage(
      { ...BOOKING, notes: ' Una  trona\ny alergia al sésamo ' },
      'Idioma: English',
    );
    expect(message).toMatch(/Personas: 4\nNotas: Una trona y alergia al sésamo\nIdioma: English$/);
    expect(reservationMessage(BOOKING)).not.toContain('Notas');
  });

  it('keeps the same Nombre / Día / Hora / Personas lines as the blank template', () => {
    for (const label of ['Nombre: ', 'Día: ', 'Hora: ', 'Personas: '])
      expect(reservationMessage(BOOKING)).toContain(label);
  });

  it('never writes a nonsense number of guests', () => {
    expect(clampGuests(0)).toBe(1);
    expect(clampGuests(99)).toBe(MAX_GUESTS);
    expect(clampGuests(Number.NaN)).toBe(1);
    expect(reservationMessage({ ...BOOKING, guests: 40 })).toContain(`Personas: ${MAX_GUESTS}`);
  });
});

describe('dates', () => {
  it('writes the weekday and the day the Spanish way', () => {
    expect(formatDate('2026-11-12')).toBe('jueves 12/11/2026');
    expect(formatDate('2026-12-31')).toBe('jueves 31/12/2026');
  });

  it('writes nothing for something that is not a date', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate('12/11/2026')).toBe('');
    expect(formatDate('2026-13-45')).toBe('');
  });

  it('takes today from Ferrol, not from the visitor’s clock', () => {
    // 23:30 UTC on 11 Nov is already 12 Nov in Spain (winter time, UTC+1).
    expect(todayInSpain(new Date('2026-11-11T23:30:00Z'))).toBe('2026-11-12');
    expect(todayInSpain(new Date('2026-11-11T12:00:00Z'))).toBe('2026-11-11');
  });
});

describe('the reservation page is behind its switch', () => {
  const on = { base: '/', pictures: TEST_PICTURES, bookings: true } as const;
  const off = { base: '/', pictures: TEST_PICTURES } as const;

  it('lives at /reservar/ in the default language and under the prefix in the rest', () => {
    expect(kindPath('reservar', 'es')).toBe('reservar/');
    expect(kindPath('reservar', 'en')).toBe('en/reservar/');
    expect(kindHref({ base: '/' }, 'reservar', 'gl')).toBe('/gl/reservar/');
    expect(resolveRoute('/reservar/')).toEqual({ kind: 'reservar', lang: 'es' });
    expect(resolveRoute('/fr/reservar/')).toEqual({ kind: 'reservar', lang: 'fr' });
  });

  it('is in the sitemap only when it is built', () => {
    const site = { base: '/', siteUrl: 'https://example.test' };
    expect(sitemapXml(site)).not.toContain('reservar');
    const withIt = sitemapXml({ ...site, bookings: true });
    expect(withIt).toContain('<loc>https://example.test/reservar/</loc>');
    expect(withIt).toContain('<loc>https://example.test/en/reservar/</loc>');
    expect([...withIt.matchAll(/<loc>/g)]).toHaveLength(LANGS.length * 4);
  });

  it('links nothing to it while it is off: not the home, not the carta', () => {
    for (const { code } of LANGS) {
      const pages = [renderHomePage({ ...off, lang: code }), renderPage({ ...off, lang: code })];
      for (const { body, head } of pages) expect(body + head).not.toContain('reservar/');
    }
  });

  it('turns the booking tile of the home into a link to it when it is on', () => {
    const { body } = renderHomePage({ ...on, lang: 'en' });
    const actions = /<section class="actions".*?<\/section>/s.exec(body)?.[0] ?? '';
    expect(actions).toMatch(/href="\/en\/reservar\/"[^>]*data-event="reserva_clic"/);
    expect(actions).not.toMatch(/href="\/en\/reservar\/"[^>]*_blank/);
  });
});

describe.each(LANGS)('reservation form "$code"', ({ code, rtl }) => {
  const t = LOCALES[code].ui;
  const { body, head, lang, dir } = renderReservarPage({
    lang: code,
    base: '/',
    pictures: TEST_PICTURES,
    siteUrl: 'https://example.test',
    bookings: true,
  });

  it('sets language and direction, and has one h1 with the title', () => {
    expect(lang).toBe(code);
    expect(dir).toBe(rtl ? 'rtl' : 'ltr');
    expect(body.match(/<h1\b/g)).toHaveLength(1);
    expect(body).toContain(`<h1 class="reserve__title">${t.resTitle}</h1>`);
  });

  it('asks for name, day, time and guests (required) and a phone (optional), with a visible label', () => {
    for (const name of ['name', 'date', 'time', 'guests']) {
      const tag = new RegExp(`<(?:input|select)[^>]*name="${name}"[^>]*>`, 's').exec(body)?.[0];
      expect(tag, name).toBeDefined();
      expect(tag, name).toMatch(/\srequired[\s>]/);
    }
    // The message comes from the customer's own WhatsApp, which shows the number already.
    const phone = /<input[^>]*name="phone"[^>]*>/s.exec(body)?.[0] ?? '';
    expect(phone).not.toMatch(/\srequired/);
    const notes = /<textarea[^>]*>/s.exec(body)?.[0] ?? '';
    expect(notes).not.toMatch(/\srequired/);
    for (const label of [t.resName, t.resPhone, t.resDate, t.resTime, t.resGuests])
      expect(body).toMatch(
        new RegExp(`class="field__label"[^>]*>${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<`),
      );
    // Optional is said in the label, and placeholders are never used as labels.
    expect(t.resNotes).toMatch(/\(.+\)|（.+）/);
    expect(t.resPhone).toMatch(/\(.+\)|（.+）/);
    expect(body).not.toContain('placeholder=');
  });

  it('offers the times inside the kitchen hours, not a free field', () => {
    const select = /<select[^>]*name="time"[^>]*>(.*?)<\/select>/s.exec(body)?.[1] ?? '';
    const times = [...select.matchAll(/<option value="(\d\d:\d\d)"/g)].map((m) => m[1]);
    expect(times).toEqual(bookingSlots());
    expect(times).not.toContain('16:00');
    expect(times).not.toContain('22:00');
    expect(body).not.toMatch(/type="time"/);
    // The closed-Monday line is there for the script to show.
    expect(body).toContain(t.resClosedMonday);
  });

  it('links to ordering, and has the last-step screen for the script to show', () => {
    expect(body).toMatch(/class="reserve__cross"[\s\S]*?\?pedido=domicilio/);
    expect(body).toContain(t.crossToOrder);
    expect(body).toMatch(/data-reserve-sent\s+hidden/);
    expect(body).toContain(t.resSentText);
  });

  it('uses the input types that bring the right keyboard on a phone', () => {
    expect(body).toMatch(/type="tel"[^>]*name="phone"|name="phone"[^>]*type="tel"/s);
    expect(body).toMatch(/type="date"[^>]*name="date"|name="date"[^>]*type="date"/s);
    expect(body).toContain('autocomplete="name"');
    expect(body).toContain('autocomplete="tel"');
  });

  it('offers 1 to the maximum guests and says what to do for more', () => {
    const options = [...body.matchAll(/<option value="(\d+)"/g)].map((m) => Number(m[1]));
    expect(options).toEqual(Array.from({ length: MAX_GUESTS }, (_, i) => i + 1));
    expect(body).toContain(t.resLarge.replace('{n}', String(MAX_GUESTS)));
  });

  it('needs JavaScript, with a WhatsApp link for those without it', () => {
    expect(body).toMatch(/<form\s+class="reserve__form"\s+data-js-only/);
    expect(body).toMatch(/<noscript>[\s\S]*wa\.me\/34614922183[\s\S]*<\/noscript>/);
  });

  it('declares title, description, canonical and alternates', () => {
    expect(head).toContain(`<title>${t.resTitle} · Inkawasi</title>`);
    expect(head).toContain('rel="canonical"');
    for (const l of LANGS) expect(head).toContain(`hreflang="${l.code}"`);
  });

  it('leaks no template artifacts', () => {
    expect((body + head).replace(/<script[\s\S]*?<\/script>/g, '')).not.toMatch(
      /undefined|\[object|NaN|\{\{|\{n\}/,
    );
  });
});

import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/data/langs';
import { MENU_ITEMS } from '../../src/data/order';
import { BEERS, DISHES, SECTIONS, SOFT_DRINKS } from '../../src/data/menu';
import { LOCALES } from '../../src/i18n';
import { DELIVERY_FEE_CENTS, TAPER_CENTS } from '../../src/data/order';
import { formatPrice } from '../../src/lib/format';
import { escapeHtml } from '../../src/lib/html';
import { pickupSlots } from '../../src/lib/hours';
import { languageLine } from '../../src/lib/whatsapp';
import { renderHomePage, renderMenuDelDiaPage, renderPage } from '../../src/render/page';
import { TEST_PICTURES } from './fixtures';

const MENU_PRICES: Record<string, number> = Object.fromEntries(
  MENU_ITEMS.map((m) => [m.id, m.priceCents]),
);
const FOOD = SECTIONS.flatMap((s) => s.dishes);
const DRINKS = [...SOFT_DRINKS, ...BEERS];

describe.each(LANGS)('order controls "$code"', ({ code }) => {
  const { body } = renderPage({ lang: code, base: '/', pictures: TEST_PICTURES });
  const t = LOCALES[code].ui;

  /** The opening tags of the order controls, by item id. */
  const controls = new Map(
    [...body.matchAll(/<span\s+class="qty"[^>]*>/g)].map((m) => {
      const tag = m[0];
      return [/data-id="([^"]+)"/.exec(tag)?.[1] ?? '', tag] as const;
    }),
  );

  it('puts a control on every dish and every drink, once', () => {
    expect([...controls.keys()].sort()).toEqual(
      [...FOOD, ...DRINKS, ...MENU_ITEMS.map((m) => m.id)].sort(),
    );
  });

  it('says how many tapers a unit takes: dishes 1, drinks 0, menus 2 and 1', () => {
    for (const id of FOOD) expect(controls.get(id), id).toContain('data-tapers="1"');
    for (const id of DRINKS) expect(controls.get(id), id).toContain('data-tapers="0"');
    expect(controls.get('menuCompleto')).toContain('data-tapers="2"');
    expect(controls.get('medioMenu')).toContain('data-tapers="1"');
    expect(controls.get('menuCompleto')).toMatch(/data-menu/);
    expect(controls.get('ceviche')).not.toMatch(/data-menu/);
  });

  it('reminds that the menu changes daily, gives its days and hours, and links to Instagram', () => {
    expect(body).toContain(t.orderMenuNote);
    expect(body).toContain(t.orderMenuHours);
    expect(body).toContain('href="https://www.instagram.com/inkawasi.ferrol"');
  });

  it('carries the name and the price in cents, straight from the menu data', () => {
    for (const [id, tag] of controls) {
      if (id in MENU_PRICES) continue;
      const dish = DISHES[id as keyof typeof DISHES];
      expect(tag, id).toContain(`data-price="${dish.priceCents}"`);
      expect(tag, id).toContain(`data-name="${dish.name}"`);
    }
  });

  it('marks what needs JavaScript, so without it the carta is unchanged and with it nothing jumps', () => {
    // data-js-only is shown from the first paint by a script in the head: no `hidden` to lift later.
    for (const [id, tag] of controls) {
      expect(tag, id).toMatch(/\sdata-js-only[\s>]/);
      expect(tag, id).not.toMatch(/\shidden[\s>]/);
    }
    expect(body).toMatch(/<section class="order-panel" id="pedido" data-js-only/);
    expect(body).toMatch(/<section\s+class="menu-card"[^>]*data-js-only/);
    expect(body).toMatch(/<div class="order-bar" hidden/);
    expect(body).not.toMatch(/<dialog[^>]*\sopen[\s>]/);
  });

  it('names the dish in the labels of its buttons, in this language', () => {
    expect(body).toContain(`aria-label="${t.orderAdd.replace('{name}', DISHES.ceviche.name)}"`);
    expect(body).toContain(`aria-label="${t.orderRemove.replace('{name}', DISHES.inkaKola.name)}"`);
    expect(body).not.toContain('{name}');
  });

  it('shows the availability of Sunday dishes in the order', () => {
    expect(controls.get('causaLimena')).toContain(`data-badge="${escapeHtml(t.sun)}"`);
    expect(controls.get('caldoGallina')).toContain(`data-badge="${escapeHtml(t.satsun)}"`);
    expect(controls.get('ceviche')).not.toContain('data-badge');
  });

  it('prints the dialog with the texts of the language and what the script needs', () => {
    expect(body).toContain(`<h2 class="order__title" id="order-title">${t.orderTitle}</h2>`);
    expect(body).toContain(t.orderSend);
    // Name always; address to deliver, time to pick up, the menu dishes only with a menu.
    for (const field of ['name', 'address', 'time', 'menu'])
      expect(body).toContain(`data-order-field="${field}"`);
    for (const label of [t.orderName, t.orderAddress, t.orderMenuChoice])
      expect(body).toContain(`>${escapeHtml(label)}</span>`);
    // The time is a list, so its label sits outside it and keeps the name of the field short.
    expect(body).toMatch(
      new RegExp(`<label class="field__label" for="order-time">${escapeHtml(t.orderTime)}</label>`),
    );
    expect(body).toContain('data-wa-number="34614922183"');
    expect(body).toContain(`data-lang="${code}"`);
    expect(body).toContain(`data-lang-line="${languageLine(code)}"`);
    expect(body.match(/name="order-mode"/g)).toHaveLength(2);
  });

  it('shows what each way costs before anything is added, with the real prices', () => {
    const price = (cents: number) => formatPrice(cents, code);
    const fill = (text: string) =>
      escapeHtml(
        text
          .replace('{delivery}', price(DELIVERY_FEE_CENTS))
          .replace('{taper}', price(TAPER_CENTS)),
      );
    expect(body).toContain(fill(t.orderCostsDelivery));
    expect(body).toContain(fill(t.orderCostsPickup));
    expect(body).not.toMatch(/\{(delivery|taper)\}/);
  });

  it('offers the blank WhatsApp orders to those without JavaScript', () => {
    expect(body).toMatch(/<noscript>[\s\S]*wa\.me\/34614922183[\s\S]*<\/noscript>/);
  });

  it('offers the pickup time as a list of times inside the kitchen hours', () => {
    const select =
      /<select[^>]*data-order-field="time"[^>]*>(.*?)<\/select>/s.exec(body)?.[1] ?? '';
    const times = [...select.matchAll(/<option value="(\d\d:\d\d)"/g)].map((m) => m[1]);
    expect(times).toEqual(pickupSlots());
    expect(select).toContain(t.pickTime);
    expect(body).not.toMatch(/type="time"/);
  });

  it('says how each way is paid: cash or Bizum at the door, anything at the counter', () => {
    expect(body).toMatch(/data-order-pay="domicilio">\s*\S/);
    expect(body).toContain(t.payDelivery);
    expect(body).toContain(t.payPickup);
    expect(body).toMatch(/data-order-pay="recoger"\s+hidden/);
  });

  it('prints, hidden, the sentences the script picks from for the kitchen and the menu', () => {
    const kitchen = /<p[^>]*data-kitchen-status[^>]*>/s.exec(body)?.[0] ?? '';
    expect(kitchen).toContain('hidden');
    for (const text of [t.serviceOpen, t.serviceLater, t.serviceNext]) {
      expect(kitchen).toContain(`="${escapeHtml(text)}"`);
      expect(text).toMatch(/\{time\}/);
    }
    expect(t.serviceNext).toContain('{day}');
    const menu = /<p[^>]*data-menu-status[^>]*>/s.exec(body)?.[0] ?? '';
    expect(menu).toContain('hidden');
    for (const text of [t.menuOpen, t.menuSoon, t.menuClosed])
      expect(menu).toContain(`="${escapeHtml(text)}"`);
    expect(t.menuClosed).toContain('{day}');
  });

  it('has the last-step screen, hidden, with its way back and its way to a new order', () => {
    expect(body).toMatch(/data-order-sent\s+hidden/);
    for (const text of [t.sentTitle, t.orderSentText, t.orderSentBack, t.orderSentNew])
      expect(body).toContain(escapeHtml(text));
  });

  it('names the charge for the container and the cutlery together', () => {
    expect(t.orderTapers.length).toBeGreaterThan(0);
    expect(body).toContain(escapeHtml(t.orderTapers));
  });

  it('lets the staff know who to answer in, but never in Spanish', () => {
    expect(languageLine('es')).toBe('');
    if (code !== 'es') expect(languageLine(code)).toMatch(/^Idioma: \S+/);
  });
});

describe('the other pages', () => {
  it('have no cart: only the carta can be ordered from', () => {
    const pages = [
      renderHomePage({ lang: 'es', base: '/', pictures: TEST_PICTURES }),
      renderMenuDelDiaPage({ lang: 'es', base: '/', pictures: TEST_PICTURES }),
    ];
    for (const { body } of pages) {
      expect(body).not.toContain('data-order');
      expect(body).not.toContain('class="qty"');
    }
  });
});

describe('order texts', () => {
  it('exist in every language and use the same placeholders', () => {
    for (const { code } of LANGS) {
      const ui = LOCALES[code].ui;
      expect(ui.orderAdd, code).toContain('{name}');
      expect(ui.orderRemove, code).toContain('{name}');
      expect(ui.orderSend.trim(), code).not.toBe('');
    }
  });
});

describe.each(LANGS)('menú del día page "$code"', ({ code }) => {
  it('links to the menu rows of the carta, which have that anchor', () => {
    const mdd = renderMenuDelDiaPage({ lang: code, base: '/', pictures: TEST_PICTURES }).body;
    const carta = renderPage({ lang: code, base: '/', pictures: TEST_PICTURES }).body;
    expect(mdd).toContain(LOCALES[code].ui.orderMenuCta);
    expect(mdd).toMatch(/href="\/(?:[a-z]{2}\/)?carta\/#pedir-menu"/);
    expect(carta).toContain('id="pedir-menu"');
  });
});

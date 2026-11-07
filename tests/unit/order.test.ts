import { describe, expect, it } from 'vitest';
import { DELIVERY_FEE_CENTS, MAX_QTY, MENU_ITEMS, TAPER_CENTS } from '../../src/data/order';
import { DISHES } from '../../src/data/menu';
import { WHATSAPP_MESSAGES } from '../../src/data/whatsapp';
import {
  clampQty,
  EMPTY_DETAILS,
  orderLines,
  orderMessage,
  orderTotals,
  parseStored,
  serializeOrder,
  withQty,
  type OrderItem,
} from '../../src/lib/order';

const item = (id: keyof typeof DISHES, tapers: number): OrderItem => ({
  id,
  name: DISHES[id].name,
  priceCents: DISHES[id].priceCents,
  tapers,
});

/** In the carta's order: dishes first, drinks last. */
const CATALOG = [
  item('ceviche', 1),
  item('arrozChaufa', 1),
  item('inkaKola', 0),
  item('estrellaGalicia', 0),
];

describe('the rules', () => {
  it('are the ones Adriana decided: 5 € delivery, 0,50 € per dish container', () => {
    expect(DELIVERY_FEE_CENTS).toBe(500);
    expect(TAPER_CENTS).toBe(50);
  });
});

describe('withQty', () => {
  it('sets, replaces and removes without touching the old cart', () => {
    const empty = {};
    const one = withQty(empty, 'ceviche', 1);
    const two = withQty(one, 'ceviche', 2);
    expect(empty).toEqual({});
    expect(one).toEqual({ ceviche: 1 });
    expect(two).toEqual({ ceviche: 2 });
    expect(withQty(two, 'ceviche', 0)).toEqual({});
  });

  it('never goes below zero or above the maximum', () => {
    expect(withQty({}, 'ceviche', -3)).toEqual({});
    expect(withQty({}, 'ceviche', 999)).toEqual({ ceviche: MAX_QTY });
    expect(clampQty(2.9)).toBe(2);
    expect(clampQty(Number.NaN)).toBe(0);
  });
});

describe('orderLines', () => {
  it('follows the carta order, not the order things were added', () => {
    const cart = withQty(withQty({}, 'inkaKola', 1), 'ceviche', 2);
    expect(orderLines(cart, CATALOG).map((l) => l.item.id)).toEqual(['ceviche', 'inkaKola']);
  });

  it('ignores ids that are no longer on the carta', () => {
    expect(orderLines({ plato_retirado: 3 }, CATALOG)).toEqual([]);
  });
});

describe('orderTotals', () => {
  // 2 ceviches (14,50) + 1 chaufa (11) + 1 Inka Kola (3) = 43 €; 3 dishes = 3 tapers.
  const lines = orderLines({ ceviche: 2, arrozChaufa: 1, inkaKola: 1 }, CATALOG);

  it('adds delivery and one taper per dish for a delivery', () => {
    expect(orderTotals(lines, 'domicilio')).toEqual({
      count: 4,
      itemsCents: 4300,
      deliveryCents: 500,
      taperCount: 3,
      tapersCents: 150,
      totalCents: 4950,
    });
  });

  it('charges tapers but no delivery for a pickup', () => {
    const totals = orderTotals(lines, 'recoger');
    expect(totals.deliveryCents).toBe(0);
    expect(totals.tapersCents).toBe(150);
    expect(totals.totalCents).toBe(4450);
  });

  it('charges no taper for drinks', () => {
    const drinks = orderLines({ inkaKola: 2, estrellaGalicia: 1 }, CATALOG);
    const totals = orderTotals(drinks, 'recoger');
    expect(totals.taperCount).toBe(0);
    expect(totals.totalCents).toBe(600 + 250);
  });

  it('charges one taper per unit, not per different dish', () => {
    const totals = orderTotals(orderLines({ ceviche: 2 }, CATALOG), 'recoger');
    expect(totals.taperCount).toBe(2);
  });

  it('is zero for an empty order, delivery fee included', () => {
    expect(orderTotals([], 'domicilio').totalCents).toBe(0);
  });
});

describe('the menú del día', () => {
  const [full, half] = MENU_ITEMS;
  const menus: OrderItem[] = [
    { id: full.id, name: full.name, priceCents: full.priceCents, tapers: full.tapers, menu: true },
    { id: half.id, name: half.name, priceCents: half.priceCents, tapers: half.tapers, menu: true },
  ];

  it('costs 13 € the full menu and 8 € the half, as on the menú del día page', () => {
    expect([full.priceCents, half.priceCents]).toEqual([1300, 800]);
  });

  it('takes 2 tapers the full menu and 1 the half', () => {
    const lines = orderLines({ menuCompleto: 2, medioMenu: 1 }, menus);
    const totals = orderTotals(lines, 'recoger');
    expect(totals.taperCount).toBe(5);
    expect(totals.tapersCents).toBe(250);
    // 2 x 13 + 8 = 34 €, plus 2,50 € of tapers, no delivery.
    expect(totals.totalCents).toBe(3650);
  });

  it('writes the dishes the customer chose for the menu, once, with the order', () => {
    const message = orderMessage(orderLines({ menuCompleto: 1 }, menus), 'domicilio', {
      ...ANA,
      menu: 'Ensalada; lomo saltado',
    });
    expect(message).toContain(
      [
        '- 1 x Menú del día completo: 13 €',
        'Menú del día (primero y segundo): Ensalada; lomo saltado',
        'Platos: 13 €',
        'Envase y cubiertos: 1 €',
        'Envío: 5 €',
        'Total: 19 €',
      ].join('\n'),
    );
  });

  it('adds no such line to an order without a menu', () => {
    expect(orderMessage(orderLines({ ceviche: 1 }, CATALOG), 'recoger', ANA)).not.toContain(
      'primero y segundo',
    );
  });
});

const ANA = { name: 'Ana Pérez', address: 'Rúa Real 12, 2B', time: '14:30', menu: '' };

describe('orderMessage', () => {
  const lines = orderLines({ ceviche: 2, arrozChaufa: 1, inkaKola: 1 }, CATALOG);

  it('writes who orders, where to, every line and how the price adds up, for a delivery', () => {
    expect(orderMessage(lines, 'domicilio', ANA)).toBe(
      [
        'Hola, quiero hacer un pedido a domicilio.',
        'Nombre: Ana Pérez',
        'Dirección: Rúa Real 12, 2B',
        'Pedido:',
        '- 2 x Ceviche: 29 €',
        '- 1 x Arroz Chaufa: 11 €',
        '- 1 x Inka Kola: 3 €',
        'Platos y bebidas: 43 €',
        'Envase y cubiertos: 1,50 €',
        'Envío: 5 €',
        'Total: 49,50 €',
      ].join('\n'),
    );
  });

  it('says "Platos" when there is no drink, and leaves out the lines that do not apply', () => {
    const dishes = orderMessage(orderLines({ ceviche: 1 }, CATALOG), 'recoger', ANA);
    expect(dishes).toContain('Platos: 14,50 €\nEnvase y cubiertos: 0,50 €\nTotal: 15 €');
    expect(dishes).not.toMatch(/Envío|bebidas/);
    const drinks = orderMessage(orderLines({ inkaKola: 2 }, CATALOG), 'recoger', ANA);
    expect(drinks).toMatch(/Platos y bebidas: 6 €\nTotal: 6 €$/);
    expect(drinks).not.toMatch(/Envase|Envío/);
  });

  it('asks for the time instead of the address for a pickup, and the total has no delivery', () => {
    const message = orderMessage(lines, 'recoger', ANA);
    expect(message).toContain('para recoger.\nNombre: Ana Pérez\nHora: 14:30\nPedido:\n');
    expect(message).not.toContain('Dirección');
    expect(message).toMatch(/Platos y bebidas: 43 €\nEnvase y cubiertos: 1,50 €\nTotal: 44,50 €$/);
  });

  it('keeps what the customer typed on one line and caps it', () => {
    const message = orderMessage(lines, 'domicilio', {
      ...ANA,
      name: '  Ana\n\nPérez  ',
      address: 'x'.repeat(500),
    });
    expect(message).toContain('Nombre: Ana Pérez\n');
    expect(message).toContain(`Dirección: ${'x'.repeat(160)}\n`);
  });

  it('ends with the language line when there is one', () => {
    expect(orderMessage(lines, 'domicilio', ANA, 'Idioma: English')).toMatch(
      /Total: 49,50 €\nIdioma: English$/,
    );
  });

  it('falls back to the blank template when nothing was added', () => {
    expect(orderMessage([], 'domicilio')).toBe(WHATSAPP_MESSAGES.domicilio);
  });

  it('uses plain spaces, not no-break spaces, in amounts', () => {
    const message = orderMessage(lines, 'domicilio', ANA);
    // NFKC turns every no-break space into a plain one and leaves the rest alone.
    expect(message.normalize('NFKC')).toBe(message);
  });

  it('stays short enough for a WhatsApp link even with every item at the maximum', () => {
    const all = Object.fromEntries(Object.keys(DISHES).map((id) => [id, MAX_QTY]));
    const catalog = Object.values(DISHES).map((d) => ({
      id: d.id,
      name: d.name,
      priceCents: d.priceCents,
      tapers: 1,
    }));
    const long = { name: 'n'.repeat(200), address: 'a'.repeat(200), time: '', menu: '' };
    const message = orderMessage(orderLines(all, catalog), 'domicilio', long, 'Idioma: Русский');
    expect(encodeURIComponent(message).length).toBeLessThan(4500);
  });
});

describe('parseStored', () => {
  const known = (id: string) => CATALOG.some((i) => i.id === id);

  it('reads what serializeOrder wrote', () => {
    const order = {
      mode: 'recoger',
      cart: { ceviche: 2, inkaKola: 1 },
      details: ANA,
    } as const;
    expect(parseStored(serializeOrder(order), known)).toEqual(order);
  });

  it.each([
    ['nothing stored', null],
    ['not JSON', '{oops'],
    ['not an object', '42'],
    ['null', 'null'],
    ['an array', '[1,2]'],
  ])('starts empty for %s', (_name, raw) => {
    expect(parseStored(raw, known)).toEqual({
      mode: 'domicilio',
      cart: {},
      details: EMPTY_DETAILS,
    });
  });

  it('drops unknown ids, bad quantities and an unknown mode', () => {
    const raw = JSON.stringify({
      mode: 'barco',
      cart: { ceviche: 2, plato_retirado: 1, inkaKola: 'tres', arrozChaufa: -1, __proto__: 5 },
    });
    expect(parseStored(raw, known)).toEqual({
      mode: 'domicilio',
      cart: { ceviche: 2 },
      details: EMPTY_DETAILS,
    });
  });

  it('keeps only text in the details, cleaned', () => {
    const raw = JSON.stringify({
      details: { name: ' Ana\n ', address: 7, time: null, menu: 'x' },
    });
    expect(parseStored(raw, known).details).toEqual({
      name: 'Ana',
      address: '',
      time: '',
      menu: 'x',
    });
  });

  it('caps quantities at the maximum', () => {
    expect(parseStored('{"cart":{"ceviche":500}}', known).cart).toEqual({ ceviche: MAX_QTY });
  });
});

/**
 * The order behind the carta's cart: quantities, totals, the WhatsApp message and what is kept
 * between pages. Pure functions with no DOM, so the rules are unit-tested; `client/order.ts`
 * only connects them to the page.
 */
import {
  DEFAULT_ORDER_MODE,
  DELIVERY_FEE_CENTS,
  MAX_QTY,
  ORDER_MODES,
  TAPER_CENTS,
  type OrderMode,
} from '../data/order';
import {
  ORDER_GREETING,
  ORDER_PRICE_LABEL,
  ORDER_WHERE_LABEL,
  WHATSAPP_MESSAGES,
} from '../data/whatsapp';
import { formatPrice } from './format';

/** What the page knows about something that can be ordered. */
export interface OrderItem {
  id: string;
  name: string;
  priceCents: number;
  /** Tapers one unit takes: a dish 1, a drink 0, a full menú del día 2 (first and second). */
  tapers: number;
  /** A menú del día: the customer still has to say which first and second dish. */
  menu?: boolean;
}

/** Units per item id. An item that is not in the order is not in the object. */
export type Cart = Readonly<Record<string, number>>;

export interface OrderLine {
  item: OrderItem;
  qty: number;
  totalCents: number;
}

export interface OrderTotals {
  /** Units in the order, drinks included. */
  count: number;
  itemsCents: number;
  deliveryCents: number;
  /** Dishes, which is how many tapers. */
  taperCount: number;
  tapersCents: number;
  totalCents: number;
}

/** What the customer typed in the order form. Kept in the tab, never sent anywhere but WhatsApp. */
export interface OrderDetails {
  name: string;
  address: string;
  /** When they come by, for a pickup. */
  time: string;
  /** Which first and second dish of the menú del día. */
  menu: string;
}

export const EMPTY_DETAILS: OrderDetails = { name: '', address: '', time: '', menu: '' };

export interface StoredOrder {
  mode: OrderMode;
  cart: Cart;
  details: OrderDetails;
}

export function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return 0;
  return Math.min(MAX_QTY, Math.max(0, Math.trunc(qty)));
}

/** A new cart with `qty` units of an item; zero takes it out. The old cart is never changed. */
export function withQty(cart: Cart, id: string, qty: number): Cart {
  const rest = Object.fromEntries(Object.entries(cart).filter(([key]) => key !== id));
  const next = clampQty(qty);
  return next > 0 ? { ...rest, [id]: next } : rest;
}

/** The cart's items that exist in the catalog, in the catalog's order (the carta's order). */
export function orderLines(cart: Cart, catalog: readonly OrderItem[]): OrderLine[] {
  const lines: OrderLine[] = [];
  for (const item of catalog) {
    const qty = clampQty(cart[item.id] ?? 0);
    if (qty > 0) lines.push({ item, qty, totalCents: item.priceCents * qty });
  }
  return lines;
}

export function orderTotals(lines: readonly OrderLine[], mode: OrderMode): OrderTotals {
  const count = lines.reduce((sum, l) => sum + l.qty, 0);
  const itemsCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
  const taperCount = lines.reduce((sum, l) => sum + l.item.tapers * l.qty, 0);
  const tapersCents = taperCount * TAPER_CENTS;
  const deliveryCents = mode === 'domicilio' && count > 0 ? DELIVERY_FEE_CENTS : 0;
  return {
    count,
    itemsCents,
    deliveryCents,
    taperCount,
    tapersCents,
    totalCents: itemsCents + deliveryCents + tapersCents,
  };
}

/** The message is for the staff, so amounts are always written the Spanish way. */
function eur(cents: number): string {
  // Intl writes a no-break space before the euro sign; NFKC turns it into a plain one.
  return formatPrice(cents, 'es').normalize('NFKC');
}

/** Longest name, address, time or menu choice that goes into a message (a typo guard). */
const MAX_FIELD = 160;

/** One line, single spaces, trimmed and capped: what a customer typed, made safe to put in a message. */
export function cleanField(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, MAX_FIELD) : '';
}

/**
 * The price lines at the foot of the message: dishes, tapers, delivery and the total. A line that
 * does not apply (no tapers for drinks only, no delivery for a pickup) is left out rather than
 * written as zero.
 */
function priceLines(lines: readonly OrderLine[], mode: OrderMode): string[] {
  const totals = orderTotals(lines, mode);
  const hasDrinks = lines.some((l) => l.item.tapers === 0);
  return [
    `${hasDrinks ? ORDER_PRICE_LABEL.itemsWithDrinks : ORDER_PRICE_LABEL.items}: ${eur(totals.itemsCents)}`,
    ...(totals.taperCount > 0 ? [`${ORDER_PRICE_LABEL.tapers}: ${eur(totals.tapersCents)}`] : []),
    ...(totals.deliveryCents > 0
      ? [`${ORDER_PRICE_LABEL.delivery}: ${eur(totals.deliveryCents)}`]
      : []),
    `${ORDER_PRICE_LABEL.total}: ${eur(totals.totalCents)}`,
  ];
}

/**
 * The WhatsApp message of an order, in Spanish like every other message: who orders, where to
 * (or when they come by), what, and how the price adds up (dishes, tapers, delivery, total).
 * `languageLine` is the closing "Idioma: …" line of a visitor who does not read Spanish.
 */
export function orderMessage(
  lines: readonly OrderLine[],
  mode: OrderMode,
  details: OrderDetails = EMPTY_DETAILS,
  languageLine = '',
): string {
  const tail = languageLine ? `\n${languageLine}` : '';
  if (lines.length === 0) return `${WHATSAPP_MESSAGES[mode]}${tail}`;

  const where = mode === 'domicilio' ? details.address : details.time;
  const menu = lines.some((l) => l.item.menu);
  return [
    ORDER_GREETING[mode],
    `Nombre: ${cleanField(details.name)}`,
    `${ORDER_WHERE_LABEL[mode]}: ${cleanField(where)}`,
    'Pedido:',
    ...lines.map((l) => `- ${l.qty} x ${l.item.name}: ${eur(l.totalCents)}`),
    // The menu changes every day: the customer says which first and second dish they want.
    ...(menu ? [`Menú del día (primero y segundo): ${cleanField(details.menu)}`] : []),
    ...priceLines(lines, mode),
  ]
    .join('\n')
    .concat(tail);
}

export function isOrderMode(value: unknown): value is OrderMode {
  return typeof value === 'string' && (ORDER_MODES as readonly string[]).includes(value);
}

/**
 * Reads what `serializeOrder` wrote. Anything unexpected (other site version, edited by hand,
 * truncated) falls back to an empty order instead of breaking the carta.
 */
export function parseStored(raw: string | null, isKnown: (id: string) => boolean): StoredOrder {
  const empty: StoredOrder = { mode: DEFAULT_ORDER_MODE, cart: {}, details: EMPTY_DETAILS };
  if (!raw) return empty;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return empty;
    const { mode, cart, details } = data as { mode?: unknown; cart?: unknown; details?: unknown };
    let clean: Cart = {};
    if (typeof cart === 'object' && cart !== null && !Array.isArray(cart)) {
      for (const [id, qty] of Object.entries(cart)) {
        if (isKnown(id) && typeof qty === 'number') clean = withQty(clean, id, qty);
      }
    }
    const d = (typeof details === 'object' && details !== null ? details : {}) as Record<
      string,
      unknown
    >;
    return {
      mode: isOrderMode(mode) ? mode : DEFAULT_ORDER_MODE,
      cart: clean,
      details: {
        name: cleanField(d.name),
        address: cleanField(d.address),
        time: cleanField(d.time),
        menu: cleanField(d.menu),
      },
    };
  } catch {
    return empty;
  }
}

export function serializeOrder(order: StoredOrder): string {
  return JSON.stringify(order);
}

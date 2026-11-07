/**
 * Rules of an order made from the carta and sent over WhatsApp. Prices are in euro cents, like
 * the dishes. Change them here and nowhere else.
 */
export const ORDER_MODES = ['domicilio', 'recoger'] as const;

/** How the customer gets the food: brought home or picked up at the door. */
export type OrderMode = (typeof ORDER_MODES)[number];

export const DEFAULT_ORDER_MODE: OrderMode = 'domicilio';

/** Delivery fee, charged once per order and only when it is delivered. */
export const DELIVERY_FEE_CENTS = 500;

/**
 * Packaging and cutlery ("envase y cubiertos"; the code still says taper), one charge so nobody
 * thinks they only pay for the container. Charged for every dish (not for drinks), for delivery
 * and pickup. A dish takes one; a full menú del día takes two (first and second), a half menu one.
 */
export const TAPER_CENTS = 50;

/**
 * The menú del día as something to order. The dishes change every day, so the order only carries
 * the menu and its price; the customer writes the dishes in the message. Prices confirmed by the
 * restaurant (13 € full, 8 € half); names stay in Spanish in every language, like the dishes.
 */
export const MENU_ITEMS = [
  { id: 'menuCompleto', name: 'Menú del día completo', priceCents: 1300, tapers: 2 },
  { id: 'medioMenu', name: 'Medio menú del día', priceCents: 800, tapers: 1 },
] as const;

/** Most units of one item in an order: a typo guard, and it keeps the WhatsApp link short. */
export const MAX_QTY = 20;

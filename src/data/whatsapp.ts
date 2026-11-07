import type { OrderMode } from './order';

/**
 * What a visitor wants from a WhatsApp chat. Each intent opens the chat with its message already
 * written, so the visitor only has to fill in the blanks and press send.
 *
 * Messages are in Spanish on purpose: the staff reads them. The button labels are translated
 * (`ui.wa*` in the locale files); `lib/whatsapp.ts` appends the visitor's language.
 */
export const WHATSAPP_INTENTS = ['reservar', 'recoger', 'domicilio', 'consulta'] as const;

/** The four intents offered as tiles on the home page. */
export type HomeIntent = (typeof WHATSAPP_INTENTS)[number];

/** Every ready-made message: the home tiles plus asking what today's menú del día is. */
export type WhatsappIntent = HomeIntent | 'menu';

/** How an order starts. The blank order messages and the orders built in the carta share it. */
export const ORDER_GREETING: Record<OrderMode, string> = {
  recoger: 'Hola, quiero hacer un pedido para recoger.',
  domicilio: 'Hola, quiero hacer un pedido a domicilio.',
};

/** What the staff need besides the name: where to deliver, or when the customer comes by. */
export const ORDER_WHERE_LABEL: Record<OrderMode, string> = {
  recoger: 'Hora',
  domicilio: 'Dirección',
};

/**
 * How the price of an order is written at the foot of its message: dishes, tapers, delivery and
 * the total, one line each. "Platos y bebidas" only when the order has a drink in it.
 */
export const ORDER_PRICE_LABEL = {
  items: 'Platos',
  itemsWithDrinks: 'Platos y bebidas',
  tapers: 'Envase y cubiertos',
  delivery: 'Envío',
  total: 'Total',
} as const;

export const WHATSAPP_MESSAGES: Record<WhatsappIntent, string> = {
  reservar: 'Hola, quiero reservar una mesa en Inkawasi.\nNombre: \nDía: \nHora: \nPersonas: ',
  recoger: `${ORDER_GREETING.recoger}\nNombre: \n${ORDER_WHERE_LABEL.recoger}: \nPedido: `,
  domicilio: `${ORDER_GREETING.domicilio}\nNombre: \n${ORDER_WHERE_LABEL.domicilio}: \nPedido: `,
  consulta: 'Hola, tengo una consulta: ',
  menu: 'Hola, ¿qué hay hoy de menú del día?',
};

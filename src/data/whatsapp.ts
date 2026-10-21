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

export const WHATSAPP_MESSAGES: Record<WhatsappIntent, string> = {
  reservar: 'Hola, quiero reservar una mesa en Inkawasi.\nNombre: \nDía: \nHora: \nPersonas: ',
  recoger: 'Hola, quiero hacer un pedido para recoger.\nNombre: \nHora: \nPedido: ',
  domicilio: 'Hola, quiero hacer un pedido a domicilio.\nNombre: \nDirección: \nPedido: ',
  consulta: 'Hola, tengo una consulta: ',
  menu: 'Hola, ¿qué hay hoy de menú del día?',
};

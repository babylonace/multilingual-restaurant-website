/**
 * What a visitor wants from a WhatsApp chat. Each intent opens the chat with its message already
 * written, so the visitor only has to fill in the blanks and press send.
 *
 * Messages are in Spanish on purpose: the staff reads them. The button labels are translated
 * (`ui.wa*` in the locale files); `lib/whatsapp.ts` appends the visitor's language.
 */
export const WHATSAPP_INTENTS = ['reservar', 'recoger', 'domicilio', 'consulta'] as const;

export type WhatsappIntent = (typeof WHATSAPP_INTENTS)[number];

export const WHATSAPP_MESSAGES: Record<WhatsappIntent, string> = {
  reservar: 'Hola, quiero reservar una mesa en Inkawasi.\nNombre: \nDía: \nHora: \nPersonas: ',
  recoger: 'Hola, quiero hacer un pedido para recoger.\nNombre: \nHora: \nPedido: ',
  domicilio: 'Hola, quiero hacer un pedido a domicilio.\nNombre: \nDirección: \nPedido: ',
  consulta: 'Hola, tengo una consulta: ',
};

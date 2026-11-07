import { LANGS } from '../data/langs';
import type { LangCode } from '../data/types';
import { WHATSAPP_MESSAGES, type WhatsappIntent } from '../data/whatsapp';
import { DEFAULT_LANG } from '../i18n';

export { whatsappLink } from './wa-link';

/**
 * The closing line of a message from a visitor who does not read Spanish: their language, written
 * as the language calls itself, so the staff know what to answer in. Empty for Spanish.
 */
export function languageLine(lang: LangCode): string {
  if (lang === DEFAULT_LANG) return '';
  const label = LANGS.find((l) => l.code === lang)?.label ?? lang;
  return `Idioma: ${label}`;
}

/** The ready-made message for an intent, ending with the visitor's language outside Spanish. */
export function intentMessage(intent: WhatsappIntent, lang: LangCode): string {
  const message = WHATSAPP_MESSAGES[intent];
  const line = languageLine(lang);
  return line ? `${message}\n${line}` : message;
}

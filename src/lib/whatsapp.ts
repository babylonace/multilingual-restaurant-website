import { LANGS } from '../data/langs';
import type { LangCode } from '../data/types';
import { WHATSAPP_MESSAGES, type WhatsappIntent } from '../data/whatsapp';
import { DEFAULT_LANG } from '../i18n';

/** `https://wa.me/<number>?text=<message>`; the number is digits only, with country code. */
export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/**
 * The ready-made message for an intent. Outside Spanish it ends with the visitor's language,
 * written as the language calls itself, so the staff know what to answer in.
 */
export function intentMessage(intent: WhatsappIntent, lang: LangCode): string {
  const message = WHATSAPP_MESSAGES[intent];
  if (lang === DEFAULT_LANG) return message;
  const label = LANGS.find((l) => l.code === lang)?.label ?? lang;
  return `${message}\nIdioma: ${label}`;
}

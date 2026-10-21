import type { LangCode } from '../data/types';

/** BCP 47 tags used for number formatting. Arabic is forced to Latin digits to match the printed carta. */
const NUMBER_LOCALE: Record<LangCode, string> = {
  es: 'es-ES',
  en: 'en-GB',
  fr: 'fr-FR',
  it: 'it-IT',
  de: 'de-DE',
  pt: 'pt-PT',
  gl: 'gl-ES',
  ar: 'ar-u-nu-latn',
  zh: 'zh-CN',
  ru: 'ru-RU',
};

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(lang: LangCode, wholeEuros: boolean): Intl.NumberFormat {
  const key = `${lang}:${wholeEuros}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(NUMBER_LOCALE[lang], {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: wholeEuros ? 0 : 2,
      maximumFractionDigits: 2,
    });
    formatters.set(key, f);
  }
  return f;
}

/** `500 → "5 €"`, `1450 → "14,50 €"` (es). Integer prices drop the decimals, as on the printed carta. */
export function formatPrice(cents: number, lang: LangCode): string {
  return formatter(lang, cents % 100 === 0)
    .format(cents / 100)
    .replace(/[‎‏]/g, '');
}

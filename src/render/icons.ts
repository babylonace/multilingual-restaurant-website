import * as flags from 'country-flag-icons/string/3x2';
import { siFacebook, siInstagram, siJusteat, siWhatsapp } from 'simple-icons';
import { LANGS } from '../data/langs';
import type { AllergenKey, FlagId } from '../data/types';
import { html, raw, type SafeHtml } from '../lib/html';

const STROKE =
  'fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';

/** Allergen pictograms (48×48 grid, drawn for the brand; they follow `currentColor`). */
const ALLERGEN_SYMBOLS: Record<AllergenKey, string> = {
  gluten: `<g ${STROKE}><path d="M24 44V19"/><path d="M24 19q0-6 5.5-8 M24 19q0-6-5.5-8"/><path d="M24 27q0-5.5 6-7.5 M24 27q0-5.5-6-7.5"/><path d="M24 35q0-5.5 6-7.5 M24 35q0-5.5-6-7.5"/></g>`,
  crustaceos: `<g ${STROKE}><path d="M32 13c-9-2-17 4-17 13 0 7 5 11 11 11 4 0 7-2 8-5"/><path d="M32 13c3-2 6-1 8-3"/><path d="M34 32l4 2M34 32l2 4"/><path d="M18 33l-2 4M23 34l-1 4"/><circle cx="27" cy="17" r="1.6" fill="currentColor" stroke="none"/></g>`,
  huevos: `<g ${STROKE}><path d="M24 10c-6 0-11 8-11 16 0 6 5 10 11 10s11-4 11-10c0-8-5-16-11-16Z"/><circle cx="24" cy="27" r="5" fill="currentColor" stroke="none"/></g>`,
  pescado: `<g ${STROKE}><path d="M8 24c5-8 15-11 24-9 4 1 8 4 8 4s-4 3-8 4c-9 2-19-1-24-3Z"/><path d="M8 24l-4-5M8 24l-4 5"/><circle cx="32" cy="21" r="1.6" fill="currentColor" stroke="none"/></g>`,
  cacahuete: `<g ${STROKE}><path d="M24 6C19 6 16 10 16 15C16 19 20 21 20 24C20 27 16 29 16 33C16 38 20 41 24 41C28 41 32 38 32 33C32 29 28 27 28 24C28 21 32 19 32 15C32 10 29 6 24 6Z"/><circle cx="24" cy="15" r="1.5" fill="currentColor" stroke="none"/><circle cx="24" cy="32" r="1.5" fill="currentColor" stroke="none"/></g>`,
  soja: `<g ${STROKE}><path d="M12 12c14 0 24 10 24 24"/><ellipse cx="18" cy="22" rx="5" ry="4" transform="rotate(45 18 22)"/><ellipse cx="26" cy="30" rx="5" ry="4" transform="rotate(45 26 30)"/></g>`,
  lacteos: `<g ${STROKE}><path d="M17 20l7-8 7 8v20H17Z"/><path d="M17 20h14"/><path d="M22 12v-2h4v2"/></g>`,
  sesamo: `<g fill="currentColor" stroke="none"><ellipse cx="18" cy="18" rx="3.4" ry="2" transform="rotate(-30 18 18)"/><ellipse cx="30" cy="16" rx="3.4" ry="2" transform="rotate(20 30 16)"/><ellipse cx="24" cy="26" rx="3.4" ry="2" transform="rotate(-10 24 26)"/><ellipse cx="15" cy="30" rx="3.4" ry="2" transform="rotate(30 15 30)"/><ellipse cx="32" cy="30" rx="3.4" ry="2" transform="rotate(-25 32 30)"/></g>`,
  apio: `<g ${STROKE}><path d="M20 42V22M24 42V20M28 42V22"/><path d="M24 20c-2-6-7-8-11-7 1 6 6 9 11 8Z"/><path d="M24 20c2-6 7-8 11-7-1 6-6 9-11 8Z"/></g>`,
  mostaza: `<g ${STROKE}><path d="M19 20h10v18a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3Z"/><path d="M21 20v-4h6v4"/><path d="M23 10h2v4h-2Z"/><path d="M24 27v6"/></g>`,
  sulfitos: `<g ${STROKE}><path d="M20 8h8M22 8v9l-8 16a3 3 0 0 0 3 4h12a3 3 0 0 0 3-4l-8-16V8"/><circle cx="24" cy="34" r="1.6" fill="currentColor" stroke="none"/><circle cx="29" cy="30" r="1.2" fill="currentColor" stroke="none"/></g>`,
  moluscos: `<g ${STROKE}><path d="M24 40C10 30 8 18 16 12c4-3 12-3 16 0 8 6 6 18-8 28Z"/><path d="M24 40V12M24 40 13 20M24 40l11-20M24 40 18 16M24 40l6-24"/></g>`,
  frutosCascara: `<g ${STROKE}><path d="M24 12c-6 0-10 4-10 10 0 9 5 17 10 20 5-3 10-11 10-20 0-6-4-10-10-10Z"/><path d="M14 22h20"/><path d="M24 12V7"/></g>`,
  altramuces: `<g ${STROKE}><path d="M8 34C8 24 20 12 34 10c4-.5 6 1 6 4 0 12-12 24-26 24-4 0-6-1.5-6-4Z"/><circle cx="16" cy="31" r="2.6"/><circle cx="23" cy="26" r="2.6"/><circle cx="30" cy="20" r="2.6"/></g>`,
};

/** The Galician flag is not an ISO country, so it is drawn here: white field, blue diagonal band. */
const GALICIA_FLAG = `<symbol id="flag-gl" viewBox="0 0 3 2"><rect width="3" height="2" fill="#fff"/><path d="M0 0 3 2" stroke="#0d5eaf" stroke-width=".55"/></symbol>`;

const COUNTRY_FLAGS: Record<Exclude<FlagId, 'gl'>, string> = {
  es: flags.ES,
  gb: flags.GB,
  fr: flags.FR,
  it: flags.IT,
  de: flags.DE,
  pt: flags.PT,
  sa: flags.SA,
  cn: flags.CN,
  ru: flags.RU,
};

/** Turns a standalone `<svg>` string into a `<symbol>` so it can be referenced with `<use>`. */
function toSymbol(id: string, svg: string): string {
  return svg
    .replace(/^<svg[^>]*?viewBox="([^"]+)"[^>]*>/, `<symbol id="${id}" viewBox="$1">`)
    .replace(/<\/svg>\s*$/, '</symbol>');
}

/** One hidden sprite per page: allergen pictograms + the flags of the languages on offer. */
export function spriteSheet(): SafeHtml {
  const allergens = Object.entries(ALLERGEN_SYMBOLS).map(
    ([key, body]) => `<symbol id="alg-${key}" viewBox="0 0 48 48">${body}</symbol>`,
  );
  const flagSymbols = LANGS.map(({ flag }) =>
    flag === 'gl' ? GALICIA_FLAG : toSymbol(`flag-${flag}`, COUNTRY_FLAGS[flag]),
  );
  return raw(
    `<svg width="0" height="0" class="sprite" aria-hidden="true" focusable="false"><defs>${allergens.join('')}${flagSymbols.join('')}</defs></svg>`,
  );
}

export function allergenIcon(key: AllergenKey): SafeHtml {
  return html`<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <use href="#alg-${key}" />
  </svg>`;
}

export function flagIcon(flag: FlagId): SafeHtml {
  return html`<svg
    class="flag"
    viewBox="0 0 3 2"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    focusable="false"
  >
    <use href="#flag-${flag}" />
  </svg>`;
}

/** Lucide icons (ISC), inlined to avoid a runtime CDN. */
const LUCIDE = {
  'map-pin':
    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  navigation: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  calendar:
    '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  'shopping-bag':
    '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  bike: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
} as const;

export function uiIcon(name: keyof typeof LUCIDE, className = 'icon'): SafeHtml {
  return raw(
    `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${LUCIDE[name]}</svg>`,
  );
}

/** Brand glyphs from Simple Icons (CC0). */
const BRANDS = {
  instagram: siInstagram,
  facebook: siFacebook,
  whatsapp: siWhatsapp,
  justeat: siJusteat,
} as const;

export function brandIcon(name: keyof typeof BRANDS, className = 'icon'): SafeHtml {
  return raw(
    `<svg class="${className}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="${BRANDS[name].path}"/></svg>`,
  );
}

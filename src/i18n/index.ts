import type { LangCode } from '../data/types';
import ar from './locales/ar.json';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import gl from './locales/gl.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';

/**
 * Shape of a locale file, derived from the Spanish source of truth.
 * Typing the registry below as `Record<LangCode, Locale>` makes a missing or
 * misspelled key in any language a compile error, not a blank spot in production.
 */
export type Locale = typeof es;

export const LOCALES: Record<LangCode, Locale> = { es, en, fr, it, de, pt, gl, ar, zh, ru };

export const DEFAULT_LANG: LangCode = 'es';

export function isLangCode(value: unknown): value is LangCode {
  return typeof value === 'string' && Object.hasOwn(LOCALES, value);
}

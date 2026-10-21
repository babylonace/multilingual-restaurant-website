import { LEGAL_PAGES, type LegalId } from '../data/legal';
import type { LangCode } from '../data/types';
import { DEFAULT_LANG, isLangCode } from '../i18n';

/**
 * URL space of the site, relative to the base path:
 *
 *   /carta/        carta, Spanish (default language)
 *   /en/carta/     carta, any other language
 *   /  /en/  …     language roots; they only forward to that language's carta until
 *                  the site has a home page of its own
 *   /aviso-legal/  legal pages, Spanish only (they are required by Spanish law)
 *   /privacidad/
 *
 * The printed QR codes point at `/carta/`, so that URL must never move.
 */
export type Route =
  | { kind: 'carta'; lang: LangCode }
  | { kind: 'redirect'; lang: LangCode }
  | { kind: 'legal'; lang: 'es'; legal: LegalId };

const LEGAL_ROUTE = new RegExp(`^/(${LEGAL_PAGES.join('|')})/(?:index\\.html)?$`);

/** Resolves a pathname with the base already removed (`/`, `/en/`, `/en/carta/`…). */
export function resolveRoute(pathname: string): Route | undefined {
  const legal = LEGAL_ROUTE.exec(pathname)?.[1];
  if (legal) return { kind: 'legal', lang: 'es', legal: legal as LegalId };

  const match = /^\/(?:([a-z]{2})\/)?(carta\/)?(?:index\.html)?$/.exec(pathname);
  if (!match) return undefined;

  const lang = match[1] ?? DEFAULT_LANG;
  // The default language lives at the root, never under its own prefix.
  if (!isLangCode(lang) || (match[1] && lang === DEFAULT_LANG)) return undefined;
  return { kind: match[2] ? 'carta' : 'redirect', lang };
}

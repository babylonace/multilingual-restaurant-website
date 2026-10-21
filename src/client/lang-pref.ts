/** Same key the previous version of the carta used, so returning visitors keep their language. */
export const LANG_STORAGE_KEY = 'inkawasi_menu_lang';

/**
 * Picks the language to redirect to from the default (Spanish) root page, or `undefined`
 * to stay. A saved choice wins; otherwise the first supported browser language is used.
 * Crawlers are never redirected, so search engines index every language at its own URL.
 */
export function preferredLang(
  supported: readonly string[],
  defaultLang: string,
  saved: string | null,
  browserLanguages: readonly string[],
  userAgent: string,
): string | undefined {
  if (/bot|crawl|spider|lighthouse|headless/i.test(userAgent)) return undefined;

  let pick = saved && supported.includes(saved) ? saved : undefined;
  if (!pick) {
    for (const tag of browserLanguages) {
      const code = tag.slice(0, 2).toLowerCase();
      if (supported.includes(code)) {
        pick = code;
        break;
      }
    }
  }
  return pick && pick !== defaultLang ? pick : undefined;
}

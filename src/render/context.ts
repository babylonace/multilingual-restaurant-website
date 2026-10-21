import { LANGS } from '../data/langs';
import type { LangCode, LangDef } from '../data/types';
import { DEFAULT_LANG, LOCALES, type Locale } from '../i18n';

export interface RenderContext {
  lang: LangCode;
  /** Public base path, always starting and ending with `/` (e.g. `/` or `/inkawasi-web/`). */
  base: string;
  /** Absolute origin (no trailing slash). Without it, canonical/hreflang/sitemap tags are skipped. */
  siteUrl?: string;
}

/** The two kinds of page that exist in every language. */
export type PageKind = 'home' | 'carta';

export interface Page {
  ctx: RenderContext;
  kind: PageKind;
  t: Locale['ui'];
  locale: Locale;
  langDef: LangDef;
  dir: 'ltr' | 'rtl';
}

export function createPage(ctx: RenderContext, kind: PageKind = 'carta'): Page {
  const langDef = LANGS.find((l) => l.code === ctx.lang);
  if (!langDef) throw new Error(`Unknown language: ${ctx.lang}`);
  const locale = LOCALES[ctx.lang];
  return { ctx, kind, t: locale.ui, locale, langDef, dir: langDef.rtl ? 'rtl' : 'ltr' };
}

/** Folder of a language, relative to the site root: `""` for the default, `"en/"` otherwise. */
export function langPath(lang: LangCode): string {
  return lang === DEFAULT_LANG ? '' : `${lang}/`;
}

/** The carta lives in its own folder so a home page can take over the root later. */
export const CARTA_ROUTE = 'carta/';

/** Path of a language's carta, relative to the site root: `carta/`, `en/carta/`… */
export function cartaPath(lang: LangCode): string {
  return `${langPath(lang)}${CARTA_ROUTE}`;
}

/** Link to the carta of a language. */
export function langHref(ctx: RenderContext, lang: LangCode): string {
  return `${ctx.base}${cartaPath(lang)}`;
}

export function langUrl(ctx: RenderContext, lang: LangCode): string | undefined {
  return ctx.siteUrl ? `${ctx.siteUrl}${langHref(ctx, lang)}` : undefined;
}

/** Folder of a page kind in a language: `""` / `"en/"` for the home, `"carta/"` / `"en/carta/"` for the carta. */
export function kindPath(kind: PageKind, lang: LangCode): string {
  return kind === 'home' ? langPath(lang) : cartaPath(lang);
}

/** Link to the same kind of page in another language, so the language switcher stays on the page. */
export function kindHref(ctx: RenderContext, kind: PageKind, lang: LangCode): string {
  return `${ctx.base}${kindPath(kind, lang)}`;
}

export function kindUrl(ctx: RenderContext, kind: PageKind, lang: LangCode): string | undefined {
  return ctx.siteUrl ? `${ctx.siteUrl}${kindHref(ctx, kind, lang)}` : undefined;
}

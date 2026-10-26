import { LANGS } from '../data/langs';
import type { LangCode, LangDef } from '../data/types';
import { DEFAULT_LANG, LOCALES, type Locale } from '../i18n';
import type { InstagramFeed } from '../data/instagram';
import type { Pictures } from './picture';

export interface RenderContext {
  lang: LangCode;
  /** Public base path, always starting and ending with `/` (e.g. `/` or `/multilingual-restaurant-website/`). */
  base: string;
  /** Absolute origin (no trailing slash). Without it, canonical/hreflang/sitemap tags are skipped. */
  siteUrl?: string;
  /** Photos from the image pipeline (src/lib/pictures.ts in the build, a fixture in the tests). */
  pictures: Pictures;
  /** Latest Instagram posts (src/lib/instagram.ts). Without them the section shows the favourites. */
  instagram?: InstagramFeed;
}

/** What links and absolute URLs need from a context. */
export type SiteRef = Pick<RenderContext, 'base' | 'siteUrl'>;

/** The kinds of page that exist in every language. */
export type PageKind = 'home' | 'carta' | 'menu';

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
export function langHref(ctx: Pick<RenderContext, 'base'>, lang: LangCode): string {
  return `${ctx.base}${cartaPath(lang)}`;
}

export function langUrl(ctx: SiteRef, lang: LangCode): string | undefined {
  return ctx.siteUrl ? `${ctx.siteUrl}${langHref(ctx, lang)}` : undefined;
}

/** The menú del día keeps its Spanish name in every language, like the carta. */
export const MENU_ROUTE = 'menu-del-dia/';

/** Folder of a page kind in a language: `""`, `"carta/"`, `"menu-del-dia/"`, each under `"en/"`… outside Spanish. */
export function kindPath(kind: PageKind, lang: LangCode): string {
  if (kind === 'home') return langPath(lang);
  return kind === 'carta' ? cartaPath(lang) : `${langPath(lang)}${MENU_ROUTE}`;
}

/** Link to the same kind of page in another language, so the language switcher stays on the page. */
export function kindHref(ctx: Pick<RenderContext, 'base'>, kind: PageKind, lang: LangCode): string {
  return `${ctx.base}${kindPath(kind, lang)}`;
}

export function kindUrl(ctx: SiteRef, kind: PageKind, lang: LangCode): string | undefined {
  return ctx.siteUrl ? `${ctx.siteUrl}${kindHref(ctx, kind, lang)}` : undefined;
}

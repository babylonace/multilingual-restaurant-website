import { LANGS } from '../data/langs';
import type { LangCode, LangDef } from '../data/types';
import { DEFAULT_LANG, LOCALES, type Locale } from '../i18n';

export interface RenderContext {
  lang: LangCode;
  /** Public base path, always starting and ending with `/` (e.g. `/` or `/inkawasi-carta/`). */
  base: string;
  /** Absolute origin (no trailing slash). Without it, canonical/hreflang/sitemap tags are skipped. */
  siteUrl?: string;
}

export interface Page {
  ctx: RenderContext;
  t: Locale['ui'];
  locale: Locale;
  langDef: LangDef;
  dir: 'ltr' | 'rtl';
}

export function createPage(ctx: RenderContext): Page {
  const langDef = LANGS.find((l) => l.code === ctx.lang);
  if (!langDef) throw new Error(`Unknown language: ${ctx.lang}`);
  const locale = LOCALES[ctx.lang];
  return { ctx, t: locale.ui, locale, langDef, dir: langDef.rtl ? 'rtl' : 'ltr' };
}

/** Path of the page for a language, relative to the site root: `""` for the default, `"en/"` otherwise. */
export function langPath(lang: LangCode): string {
  return lang === DEFAULT_LANG ? '' : `${lang}/`;
}

export function langHref(ctx: RenderContext, lang: LangCode): string {
  return `${ctx.base}${langPath(lang)}`;
}

export function langUrl(ctx: RenderContext, lang: LangCode): string | undefined {
  return ctx.siteUrl ? `${ctx.siteUrl}${langHref(ctx, lang)}` : undefined;
}

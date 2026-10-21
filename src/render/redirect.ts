import { LANG_STORAGE_KEY, preferredLang } from '../client/lang-pref';
import { LANGS } from '../data/langs';
import { SECTIONS } from '../data/menu';
import { DEFAULT_LANG } from '../i18n';
import { raw, type SafeHtml } from '../lib/html';
import { CARTA_ROUTE, kindHref, type PageKind, type RenderContext } from './context';

/**
 * Inline <head> script for the default-language pages only (the home `/` and the carta
 * `/carta/`): sends returning visitors (and tourists whose browser speaks another supported
 * language) to the same kind of page in their language before first paint. It embeds the very
 * same `preferredLang` function the unit tests cover.
 */
export function redirectScript(ctx: RenderContext, kind: PageKind): SafeHtml {
  const supported = JSON.stringify(LANGS.map((l) => l.code));
  const suffix = kind === 'carta' ? CARTA_ROUTE : '';
  return raw(`<script>(function(){try{
var base=${JSON.stringify(ctx.base)};
if(location.pathname.replace(/\\/?$/,'/')!==${JSON.stringify(kindHref(ctx, kind, DEFAULT_LANG))})return;
var saved=null;try{saved=localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)})}catch(e){}
var pick=(${preferredLang.toString()})(${supported},${JSON.stringify(DEFAULT_LANG)},saved,navigator.languages||[navigator.language],navigator.userAgent);
if(pick)location.replace(base+pick+'/'+${JSON.stringify(suffix)}+location.hash);
}catch(e){}})();</script>`);
}

const TAB_IDS = [...SECTIONS.map((s) => s.id), 'bebidas'];

/**
 * The carta used to live at the site root and its tabs were addressed as `/#marino`. Old links
 * of that shape still land on the carta, in the language of the page they reached.
 */
export function legacyTabScript(ctx: RenderContext): SafeHtml {
  const carta = kindHref(ctx, 'carta', ctx.lang);
  return raw(
    `<script>if(/^#(${TAB_IDS.join('|')})$/.test(location.hash))location.replace(${JSON.stringify(carta)}+location.hash);</script>`,
  );
}

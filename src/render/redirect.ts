import { LANG_STORAGE_KEY, preferredLang } from '../client/lang-pref';
import { LANGS } from '../data/langs';
import { DEFAULT_LANG } from '../i18n';
import { raw, type SafeHtml } from '../lib/html';
import { CARTA_ROUTE, langHref, type RenderContext } from './context';

/**
 * Inline <head> script for the default-language carta only: sends returning visitors (and
 * tourists whose browser speaks another supported language) to their language before first
 * paint. It embeds the very same `preferredLang` function the unit tests cover.
 */
export function redirectScript(ctx: RenderContext): SafeHtml {
  const supported = JSON.stringify(LANGS.map((l) => l.code));
  return raw(`<script>(function(){try{
var base=${JSON.stringify(ctx.base)};
if(location.pathname.replace(/\\/?$/,'/')!==${JSON.stringify(langHref(ctx, DEFAULT_LANG))})return;
var saved=null;try{saved=localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)})}catch(e){}
var pick=(${preferredLang.toString()})(${supported},${JSON.stringify(DEFAULT_LANG)},saved,navigator.languages||[navigator.language],navigator.userAgent);
if(pick)location.replace(base+pick+'/'+${JSON.stringify(CARTA_ROUTE)}+location.hash);
}catch(e){}})();</script>`);
}

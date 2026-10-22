/** Build-time helpers shared by the Astro pages. */
import { LANGS } from '../data/langs';
import type { LangCode } from '../data/types';
import { DEFAULT_LANG } from '../i18n';
import type { RenderContext } from '../render/context';
import { getBuildConfig } from '../../scripts/config';
import { loadPictures } from './pictures';

export const { base, siteUrl } = getBuildConfig();

/** The render context of one language: base path, public origin and the processed photos. */
export async function renderContext(lang: LangCode): Promise<RenderContext> {
  return { lang, base, siteUrl, pictures: await loadPictures() };
}

/**
 * Static paths of a `[...lang]` route: Spanish at the root (`/`, `/carta/`), every other
 * language under its code (`/en/`, `/en/carta/`), the same folders as `kindPath`.
 */
export function langPaths() {
  return LANGS.map(({ code }) => ({
    params: { lang: code === DEFAULT_LANG ? undefined : code },
    props: { lang: code },
  }));
}

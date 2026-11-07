/** Build-time helpers shared by the Astro pages. */
import { LANGS } from '../data/langs';
import type { LangCode } from '../data/types';
import { DEFAULT_LANG } from '../i18n';
import type { RenderContext } from '../render/context';
import { getBuildConfig } from '../../scripts/config';
import { loadInstagram } from './instagram';
import { loadPictures } from './pictures';

export const { base, siteUrl } = getBuildConfig();

/**
 * The booking form is opt-in per build. Without this switch there is
 * no /reservar/ page, no link to it and no sitemap entry, so every build in the workflows sets it;
 * `tests/unit/workflows.test.ts` checks that none of them forgets.
 */
export const bookings = process.env.BOOKINGS_VISIBLE === '1';

/** The render context of one language: base path, public origin, the processed photos and the Instagram posts. */
export async function renderContext(lang: LangCode): Promise<RenderContext> {
  return {
    lang,
    base,
    siteUrl,
    pictures: await loadPictures(),
    instagram: loadInstagram(),
    bookings,
  };
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

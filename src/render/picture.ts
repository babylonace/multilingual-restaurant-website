import { html, type SafeHtml } from '../lib/html';

/** One format of a responsive image: a `srcset` the browser picks a width from. */
export interface PictureSource {
  type: 'image/avif' | 'image/webp';
  srcset: string;
}

/** A photo processed by the image pipeline (src/lib/pictures.ts): AVIF and WebP in several widths. */
export interface Picture {
  /** WebP at the largest width: the `<img>` fallback and the absolute URL for structured data. */
  src: string;
  /** Intrinsic size of the original, so the layout reserves space from the ratio. */
  width: number;
  height: number;
  /** Best format first. */
  sources: PictureSource[];
}

/** Every photo the pages use, keyed the way the data refers to them. */
export interface Pictures {
  cover: Picture;
  /** By `FAVORITES[].image` (e.g. `g-ceviche`). */
  favorites: Record<string, Picture>;
}

/** The photo of a favourite; a missing one is a build error, never a broken image. */
export function pictureOf(pictures: Pictures, image: string): Picture {
  const found = pictures.favorites[image];
  if (!found) throw new Error(`No photo for favourite "${image}" in src/assets/fotos/favoritos`);
  return found;
}

interface PictureAttrs {
  class: string;
  alt: string;
  /** The `sizes` attribute: how wide the image is shown, so the browser fetches the right file. */
  sizes: string;
  loading?: 'eager' | 'lazy';
  fetchpriority?: 'high';
}

/** `<picture>` with one `<source>` per format and the WebP `<img>` that carries size and alt. */
export function picture(p: Picture, attrs: PictureAttrs): SafeHtml {
  return html`<picture>
    ${p.sources.map(
      (s) => html`<source type="${s.type}" srcset="${s.srcset}" sizes="${attrs.sizes}" />`,
    )}
    <img
      class="${attrs.class}"
      src="${p.src}"
      width="${p.width}"
      height="${p.height}"
      alt="${attrs.alt}"
      ${attrs.loading && html`loading="${attrs.loading}"`}
      ${attrs.fetchpriority && html`fetchpriority="${attrs.fetchpriority}"`}
      decoding="async"
    />
  </picture>`;
}

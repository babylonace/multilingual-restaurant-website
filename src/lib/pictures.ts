/**
 * The image pipeline. Originals live in `src/assets/fotos` (at most 2400 px on the long side);
 * the build turns each one into AVIF and WebP at a few widths, with hashed, cacheable names.
 * Build-time only (it uses `astro:assets`); the renderers just receive the result.
 */
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import type { Picture, PictureSource, Pictures } from '../render/picture';
import cover from '../assets/fotos/portada/restaurante.webp';

/** Cover: 640 and 828 for phones (828 is the 2× of a 414 px screen), 1200 and 1600 for wider screens. */
const COVER_WIDTHS = [640, 828, 1200, 1600];

/** The favourites' originals are 476 px wide; cards show them at 220 to 340 px. */
const FAVORITE_WIDTHS = [320, 476];

const FORMATS: { format: 'avif' | 'webp'; type: PictureSource['type']; quality: number }[] = [
  { format: 'avif', type: 'image/avif', quality: 55 },
  { format: 'webp', type: 'image/webp', quality: 72 },
];

async function process(src: ImageMetadata, widths: number[]): Promise<Picture> {
  const usable = widths.filter((w) => w <= src.width);
  const results = await Promise.all(
    FORMATS.map(({ format, quality }) => getImage({ src, format, quality, widths: usable })),
  );
  const webp = results[FORMATS.findIndex((f) => f.format === 'webp')];
  if (!webp) throw new Error('The pipeline needs a WebP fallback');
  return {
    // The largest WebP: the <img> fallback and the absolute URL in structured data.
    src: webp.srcSet.values.at(-1)?.url ?? webp.src,
    width: src.width,
    height: src.height,
    sources: results.map((r, i) => ({ type: FORMATS[i]!.type, srcset: r.srcSet.attribute })),
  };
}

const favoriteFiles = import.meta.glob<ImageMetadata>('../assets/fotos/favoritos/*.webp', {
  eager: true,
  import: 'default',
});

let pending: Promise<Pictures> | undefined;

/** Every photo, processed once per build however many pages ask for it. */
export function loadPictures(): Promise<Pictures> {
  pending ??= (async () => {
    const favorites = await Promise.all(
      Object.entries(favoriteFiles).map(async ([path, meta]) => {
        const name = path
          .split('/')
          .at(-1)!
          .replace(/\.webp$/, '');
        return [name, await process(meta, FAVORITE_WIDTHS)] as const;
      }),
    );
    return {
      cover: await process(cover, COVER_WIDTHS),
      favorites: Object.fromEntries(favorites),
    };
  })();
  return pending;
}

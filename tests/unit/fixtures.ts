import { FAVORITES } from '../../src/data/menu';
import type { Picture, Pictures } from '../../src/render/picture';

/** Stands in for the image pipeline (src/lib/pictures.ts), which only runs inside the Astro build. */
function fakePicture(name: string, width: number, height: number): Picture {
  return {
    src: `/_astro/${name}-${width}.webp`,
    width,
    height,
    sources: [
      {
        type: 'image/avif',
        srcset: `/_astro/${name}-640.avif 640w, /_astro/${name}-${width}.avif ${width}w`,
      },
      {
        type: 'image/webp',
        srcset: `/_astro/${name}-640.webp 640w, /_astro/${name}-${width}.webp ${width}w`,
      },
    ],
  };
}

export const TEST_PICTURES: Pictures = {
  cover: fakePicture('restaurante', 1600, 900),
  favorites: Object.fromEntries(
    FAVORITES.map(({ image }) => [image, fakePicture(image, 476, 291)]),
  ),
};

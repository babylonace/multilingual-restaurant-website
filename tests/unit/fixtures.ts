import { FAVORITES } from '../../src/data/menu';
import type { InstagramFeed } from '../../src/data/instagram';
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

/** Six posts as scripts/instagram.ts writes them: never read from Meta in a test. */
export const TEST_FEED: InstagramFeed = {
  version: 1,
  fetchedAt: '2026-10-24T04:00:00.000Z',
  posts: [
    ['image', 'Ceviche clásico con camote y choclo', false],
    ['video', 'Así se saltea un lomo', false],
    ['carousel', 'Menú del día: dos primeros y dos segundos', true],
    ['image', '', false],
    ['image', 'Causa limeña', false],
    ['video', 'Papa a la huancaína', false],
  ].map(([kind, label, menu], i) => ({
    id: `1790000000000000${i}`,
    permalink: `https://www.instagram.com/p/TEST${i}/`,
    kind: kind as InstagramFeed['posts'][number]['kind'],
    timestamp: `2026-10-${String(23 - i).padStart(2, '0')}T12:00:00.000Z`,
    label: label as string,
    menu: menu as boolean,
    file: `1790000000000000${i}-0123456789`,
  })),
};

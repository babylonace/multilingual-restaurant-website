/**
 * Builds the web-ready images in `public/assets` from the originals in `assets-src`.
 * The brand logo is shown 50 px tall, so it is exported at 2× (100 px) instead of shipping
 * the 2670×823 px original.
 */
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { COVER_WIDTHS } from '../src/data/cover';

const SRC = 'assets-src';
const OUT = join('public', 'assets');

await mkdir(join(OUT, 'favoritos'), { recursive: true });
await mkdir(join(OUT, 'portada'), { recursive: true });

await sharp(join(SRC, 'logo-brown-trim.png'))
  .resize({ height: 100 })
  .webp({ quality: 92, alphaQuality: 100, effort: 6 })
  .toFile(join(OUT, 'logo.webp'));

for (const file of await readdir(join(SRC, 'favoritos'))) {
  await copyFile(join(SRC, 'favoritos', file), join(OUT, 'favoritos', file));
}

// Cover photo of the dining room: one master, a few widths for `srcset`. 800 px is the mobile LCP image.
for (const width of COVER_WIDTHS) {
  await sharp(join(SRC, 'portada', 'restaurante.webp'))
    .resize({ width })
    .webp({ quality: 72, effort: 6 })
    .toFile(join(OUT, 'portada', `restaurante-${width}.webp`));
}

for (const file of ['logo.webp', ...COVER_WIDTHS.map((w) => `portada/restaurante-${w}.webp`)]) {
  const { size } = await stat(join(OUT, file));
  console.log(`${file}: ${(size / 1024).toFixed(1)} KB`);
}

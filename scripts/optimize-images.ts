/**
 * Builds the web-ready images in `public/assets` from the originals in `assets-src`.
 * The brand logo is shown 50 px tall, so it is exported at 2× (100 px) instead of shipping
 * the 2670×823 px original.
 */
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = 'assets-src';
const OUT = join('public', 'assets');

await mkdir(join(OUT, 'favoritos'), { recursive: true });

await sharp(join(SRC, 'logo-brown-trim.png'))
  .resize({ height: 100 })
  .webp({ quality: 92, alphaQuality: 100, effort: 6 })
  .toFile(join(OUT, 'logo.webp'));

for (const file of await readdir(join(SRC, 'favoritos'))) {
  await copyFile(join(SRC, 'favoritos', file), join(OUT, 'favoritos', file));
}

for (const file of ['logo.webp']) {
  const { size } = await stat(join(OUT, file));
  console.log(`${file}: ${(size / 1024).toFixed(1)} KB`);
}

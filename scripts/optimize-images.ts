/**
 * Builds the logo in `public/assets` from its original in `assets-src`. It is shown 50 px tall,
 * so it is exported at 2× (100 px) instead of shipping the 2670×823 px original.
 *
 * Photos do not go through here: their originals live in `src/assets/fotos` and the build turns
 * them into AVIF and WebP at several widths (src/lib/pictures.ts).
 */
import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const OUT = join('public', 'assets');

await mkdir(OUT, { recursive: true });
await sharp(join('assets-src', 'logo-brown-trim.png'))
  .resize({ height: 100 })
  .webp({ quality: 92, alphaQuality: 100, effort: 6 })
  .toFile(join(OUT, 'logo.webp'));

const { size } = await stat(join(OUT, 'logo.webp'));
console.log(`logo.webp: ${(size / 1024).toFixed(1)} KB`);

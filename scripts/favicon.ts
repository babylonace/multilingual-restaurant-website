/**
 * Builds the browser-tab icons from the official isotypes in `assets-src/brand`, copied unchanged
 * from the design system (same drawing, only the fork's colour differs). Never redrawn or recoloured:
 *
 *   public/favicon.svg           transparent; the browser picks the official variant for its theme:
 *                                inkawasi-icono (brown fork, gold sun) on a light tab bar,
 *                                inkawasi-icono-light (cream fork, gold sun) on a dark one
 *   public/apple-touch-icon.png  180×180 for the iPhone home screen: the -light variant on a
 *                                brand-brown tile, because iOS fills transparency with black
 */
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

/** DS ink-brown, the surface the -light isotype is drawn for. */
const BROWN = '#6E3F31';
const SIZE = 512;

const light = await readFile('assets-src/brand/inkawasi-icono-light.svg', 'utf8');
const regular = await readFile('assets-src/brand/inkawasi-icono.svg', 'utf8');

const viewBox = /viewBox="([^"]+)"/.exec(light)?.[1];
const inner = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(light)?.[1]?.trim();
const forkFill = (svg: string) =>
  /<path[^>]*id="path23"[^>]*>/.exec(svg)?.[0].match(/fill:(#[0-9a-f]{6})/i)?.[1];
const forkOnLight = forkFill(regular);
const forkOnDark = forkFill(light);
if (!viewBox || !inner || !forkOnLight || !forkOnDark) throw new Error('Unexpected isotype SVG');

const [, , vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number) as [
  number,
  number,
  number,
  number,
];

/** The isotype centred in a square, `height` tall. */
function placed(height: number, body: string): string {
  const width = (vbWidth / vbHeight) * height;
  return (
    `<svg x="${((SIZE - width) / 2).toFixed(1)}" y="${((SIZE - height) / 2).toFixed(1)}" ` +
    `width="${width.toFixed(1)}" height="${height.toFixed(1)}" viewBox="${viewBox}">${body}</svg>`
  );
}

// Transparent tab icon: the fork's colour follows the browser theme through a class.
const themed = inner.replace(
  /(<path[^>]*?)\s*style="[^"]*"([^>]*id="path23")/,
  '$1 class="fork"$2',
);
if (!themed.includes('class="fork"')) throw new Error('Could not find the fork in the isotype');
const favicon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
  `<style>.fork{fill:${forkOnLight}}@media (prefers-color-scheme:dark){.fork{fill:${forkOnDark}}}</style>` +
  placed(SIZE, themed) +
  `</svg>\n`;

// Home-screen icon: opaque brown tile, the -light isotype at 78 % of its height.
const tile =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
  `<rect width="${SIZE}" height="${SIZE}" fill="${BROWN}"/>` +
  placed(0.78 * SIZE, inner) +
  `</svg>`;

await writeFile('public/favicon.svg', favicon);
await sharp(Buffer.from(tile))
  .resize(180, 180)
  .png({ compressionLevel: 9 })
  .toFile('public/apple-touch-icon.png');
console.log('Wrote public/favicon.svg and public/apple-touch-icon.png');

/**
 * Builds the browser-tab icon from the official isotype (`assets-src/brand/inkawasi-icono-light.svg`,
 * cream fork and gold sun, copied unchanged from the design system): the isotype centred on a
 * brand-brown tile, as the DS asks for the -light version. Never redrawn or recoloured.
 *
 *   public/favicon.svg           the tab icon (rounded tile)
 *   public/apple-touch-icon.png  180×180 for the iPhone home screen (square: iOS rounds it)
 */
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

/** DS ink-brown, the surface the -light isotype is drawn for. */
const BROWN = '#6E3F31';
const SIZE = 512;
/** The isotype fills 88 % of the tile's height: as large as the rounded corners allow, for 16 px tabs. */
const ICON_HEIGHT = 0.88 * SIZE;

const source = await readFile('assets-src/brand/inkawasi-icono-light.svg', 'utf8');
const viewBox = /viewBox="([^"]+)"/.exec(source)?.[1];
const inner = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(source)?.[1];
if (!viewBox || !inner) throw new Error('Unexpected isotype SVG');

const [, , vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number) as [
  number,
  number,
  number,
  number,
];
const height = ICON_HEIGHT;
const width = (vbWidth / vbHeight) * height;
const x = (SIZE - width) / 2;
const y = (SIZE - height) / 2;

const tile = (radius: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">` +
  `<rect width="${SIZE}" height="${SIZE}" rx="${radius}" fill="${BROWN}"/>` +
  `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" viewBox="${viewBox}">${inner.trim()}</svg>` +
  `</svg>\n`;

await writeFile('public/favicon.svg', tile(96));
await sharp(Buffer.from(tile(0)))
  .resize(180, 180)
  .png({ compressionLevel: 9 })
  .toFile('public/apple-touch-icon.png');
console.log('Wrote public/favicon.svg and public/apple-touch-icon.png');

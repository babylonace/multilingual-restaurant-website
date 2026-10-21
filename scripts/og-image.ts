/**
 * Renders the 1200×630 social preview (`public/og-image.jpg`) with Playwright, in the style of the
 * Instagram pieces from the design system: the photo of the dining room full bleed under a dark
 * brown veil, the light logo lockup, and the gold / terracotta / olive bar. Run it by hand
 * (`npm run build:og`) when the artwork changes; the normal build only copies the PNG.
 * Language-neutral on purpose: the logo already says "Cocina tradicional peruana".
 *
 * Fonts, photo and logo are local files, so nothing is fetched from the network.
 */
import { readFile, stat } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const OUT = 'public/og-image.jpg';

const [font, logo, photo] = await Promise.all([
  readFile('node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2'),
  readFile('assets-src/brand/inkawasi-horizontal-light.svg'),
  // The master is 2400×1350; 1200 px wide keeps the page light and the PNG sharp enough.
  sharp('assets-src/portada/restaurante.webp')
    .resize({ width: WIDTH })
    .jpeg({ quality: 88 })
    .toBuffer(),
]);

const page = `<!doctype html>
<html lang="es">
<style>
  @font-face {
    font-family: Montserrat;
    font-weight: 100 900;
    src: url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');
  }
  * { box-sizing: border-box; margin: 0; }
  body {
    position: relative;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    background: #331a13 url(data:image/jpeg;base64,${photo.toString('base64')}) center 40% / cover;
    font-family: Montserrat, sans-serif;
  }
  /* The veil of the Instagram pieces: brown-900, light in the middle, heavy at the foot. */
  .veil {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgb(51 26 19 / 0.55) 0%, rgb(51 26 19 / 0) 38%, rgb(51 26 19 / 0.93) 100%);
  }
  .text { position: absolute; left: 64px; bottom: 56px; }
  img { display: block; width: 520px; height: auto; }
  p {
    margin-top: 22px;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: #e8cb8a; /* --gold-300 */
  }
  .bar { position: absolute; inset: auto 0 0 0; height: 12px; display: flex; }
  .bar i { flex: 1; }
</style>
<body>
  <div class="veil"></div>
  <div class="text">
    <img alt="" src="data:image/svg+xml;base64,${logo.toString('base64')}" />
    <p>Ferrol · Galicia</p>
  </div>
  <div class="bar"><i style="background:#d19e2b"></i><i style="background:#e27d56"></i><i style="background:#3d5245"></i></div>
</body>
</html>`;

const browser = await chromium.launch();
try {
  const tab = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  await tab.setContent(page);
  await tab.evaluate(() => document.fonts.ready);
  const png = await tab.screenshot({ type: 'png' });
  // WhatsApp skips link previews whose image is over ~300 KB, so this is a JPEG, not a PNG.
  await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toFile(OUT);
} finally {
  await browser.close();
}

const { size } = await stat(OUT);
console.log(`${OUT}: ${WIDTH}×${HEIGHT}, ${(size / 1024).toFixed(1)} KB`);

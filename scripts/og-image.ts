/**
 * Renders the 1200×630 social preview (`public/og-image.png`) with Playwright, in the style of the
 * Instagram pieces from the design system: brand brown, the light logo lockup, and the gold /
 * terracotta / olive bar. Run it by hand (`npm run build:og`) when the artwork changes; the
 * normal build only copies the PNG. Language-neutral on purpose: the logo already says
 * "Cocina tradicional peruana".
 *
 * Fonts and logo are local files, so nothing is fetched from the network.
 */
import { readFile, stat } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;
const OUT = 'public/og-image.png';

const [font, logo] = await Promise.all([
  readFile('node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2'),
  readFile('assets-src/brand/inkawasi-horizontal-light.svg'),
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
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 44px;
    background: #6e3f31; /* --brown-700, brand brown */
    font-family: Montserrat, sans-serif;
  }
  img { width: 780px; height: auto; }
  p {
    font-size: 30px;
    font-weight: 700;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: #e8cb8a; /* --gold-300 */
  }
  .bar { position: fixed; inset: auto 0 0 0; height: 12px; display: flex; }
  .bar i { flex: 1; }
</style>
<body>
  <img alt="" src="data:image/svg+xml;base64,${logo.toString('base64')}" />
  <p>Ferrol · Galicia</p>
  <div class="bar"><i style="background:#d19e2b"></i><i style="background:#e27d56"></i><i style="background:#3d5245"></i></div>
</body>
</html>`;

const browser = await chromium.launch();
try {
  const tab = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  await tab.setContent(page);
  await tab.evaluate(() => document.fonts.ready);
  const png = await tab.screenshot({ type: 'png' });
  // Flat colours: a palette PNG is a fraction of the size and loads faster when shared.
  await sharp(png).png({ palette: true, quality: 95, effort: 10 }).toFile(OUT);
} finally {
  await browser.close();
}

const { size } = await stat(OUT);
console.log(`${OUT}: ${WIDTH}×${HEIGHT}, ${(size / 1024).toFixed(1)} KB`);

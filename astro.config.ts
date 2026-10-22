import { defineConfig, fontProviders } from 'astro/config';
import { getBuildConfig } from './scripts/config';
import { CYRILLIC, LATIN } from './src/data/font-ranges';

const { base, siteUrl } = getBuildConfig();

/** One @font-face of the installed Fontsource package: latin or cyrillic, never the other subsets. */
const face = (
  family: 'montserrat' | 'lora',
  subset: 'latin' | 'cyrillic',
  style: 'normal' | 'italic' = 'normal',
) => ({
  src: [
    `./node_modules/@fontsource-variable/${family}/files/${family}-${subset}-wght-${style}.woff2`,
  ] as [string],
  weight: family === 'lora' ? '400 700' : '100 900',
  style,
  unicodeRange: [subset === 'latin' ? LATIN : CYRILLIC] as [string],
});

export default defineConfig({
  site: siteUrl,
  base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Every page is pre-rendered; there is no server.
  output: 'static',
  fonts: [
    {
      // Titles, labels and buttons. The files come from the installed Fontsource package: no
      // network at build time. Upright only: the English subtitles use a synthesised oblique.
      provider: fontProviders.local(),
      name: 'Montserrat',
      cssVariable: '--font-montserrat',
      fallbacks: ['sans-serif'],
      options: { variants: [face('montserrat', 'latin'), face('montserrat', 'cyrillic')] },
    },
    {
      // The carta, dish names and prose, with its real italic.
      provider: fontProviders.local(),
      name: 'Lora',
      cssVariable: '--font-lora',
      fallbacks: ['serif'],
      options: {
        variants: [
          face('lora', 'latin', 'normal'),
          face('lora', 'cyrillic', 'normal'),
          face('lora', 'latin', 'italic'),
          face('lora', 'cyrillic', 'italic'),
        ],
      },
    },
  ],
});

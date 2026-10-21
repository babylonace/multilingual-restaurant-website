import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { getBuildConfig } from './scripts/config.ts';

const { base, siteUrl } = getBuildConfig();

/**
 * Dev-only: renders the same pre-rendered pages the production build emits, for every
 * language (`/`, `/en/`, …), so what you see in `npm run dev` is what ships.
 */
function renderPagesInDev(): Plugin {
  return {
    name: 'inkawasi:render-pages-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url ?? '/').split('?')[0] ?? '/';
        const match = /^\/(?:([a-z]{2})\/)?(?:index\.html)?$/.exec(pathname);
        if (!match) return next();

        try {
          const { isLangCode, DEFAULT_LANG } = await server.ssrLoadModule('/src/i18n/index.ts');
          const lang = match[1] ?? DEFAULT_LANG;
          if (!isLangCode(lang)) return next();

          const { renderPage } = await server.ssrLoadModule('/src/render/page.ts');
          const { applyTemplate } = await server.ssrLoadModule('/src/render/template.ts');
          const template = await readFile(resolve('index.html'), 'utf8');
          const page = renderPage({ lang, base, siteUrl });
          const html = await server.transformIndexHtml(
            req.url ?? '/',
            applyTemplate(template, page),
          );
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
        } catch (error) {
          server.ssrFixStacktrace(error as Error);
          next(error);
        }
      });
    },
    handleHotUpdate({ file, server }) {
      if (/[\\/]src[\\/](render|data|i18n)[\\/]/.test(file)) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

export default defineConfig({
  base,
  plugins: [renderPagesInDev()],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});

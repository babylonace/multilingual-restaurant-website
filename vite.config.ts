import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { getBuildConfig } from './scripts/config.ts';

const { base, siteUrl } = getBuildConfig();

/**
 * Dev-only: renders the same pre-rendered pages the production build emits, for every
 * language (the home `/en/`, the carta `/en/carta/`, …) and the legal pages, so what you see
 * in `npm run dev` is what ships.
 */
function renderPagesInDev(): Plugin {
  return {
    name: 'inkawasi:render-pages-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url ?? '/').split('?')[0] ?? '/';

        try {
          const { resolveRoute } = await server.ssrLoadModule('/src/render/routes.ts');
          const route = resolveRoute(pathname);
          if (!route) return next();

          const ctx = { lang: route.lang, base, siteUrl };
          let html: string;
          if (route.kind === 'legal') {
            const { renderLegalPage } = await server.ssrLoadModule('/src/render/legal.ts');
            const { applyTemplate } = await server.ssrLoadModule('/src/render/template.ts');
            const { loadPrivate } = await server.ssrLoadModule('/scripts/private-data.ts');
            const template = await readFile(resolve('index.html'), 'utf8');
            const { titular } = loadPrivate({ strict: false });
            html = await server.transformIndexHtml(
              req.url ?? '/',
              applyTemplate(template, renderLegalPage(ctx, route.legal, titular)),
            );
          } else {
            const pages = await server.ssrLoadModule('/src/render/page.ts');
            const { applyTemplate } = await server.ssrLoadModule('/src/render/template.ts');
            const template = await readFile(resolve('index.html'), 'utf8');
            const page = route.kind === 'home' ? pages.renderHomePage(ctx) : pages.renderPage(ctx);
            html = await server.transformIndexHtml(req.url ?? '/', applyTemplate(template, page));
          }
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

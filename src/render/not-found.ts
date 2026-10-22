import { DEFAULT_LANG } from '../i18n';
import { html } from '../lib/html';
import { CONTACT } from './contact';
import { createPage, kindHref, type RenderContext } from './context';
import { footer } from './footer';
import { spriteSheet } from './icons';
import type { RenderedPage } from './page';

/**
 * `404.html`. Cloudflare Pages serves it with a 404 status for any unknown path; without it,
 * Pages would answer every unknown path with the home page and a 200 (a soft 404 for Google).
 * Spanish with an English line, like the printed carta; links use absolute paths because the
 * page is served at whatever URL was requested.
 */
export function renderNotFoundPage(ctx: RenderContext): RenderedPage {
  const page = createPage({ ...ctx, lang: DEFAULT_LANG });
  const home = kindHref(ctx, 'home', DEFAULT_LANG);
  const carta = kindHref(ctx, 'carta', DEFAULT_LANG);

  const head = html`<title>Página no encontrada · ${CONTACT.name}</title>
    <meta name="robots" content="noindex" />`;

  const body = html`${spriteSheet()}
    <a class="skip-link" href="#content">${page.t.skipLink}</a>
    <header class="legal-bar">
      <div class="container">
        <a href="${home}">
          <img src="${ctx.base}assets/logo.webp" width="162" height="50" alt="${CONTACT.name}" />
        </a>
      </div>
    </header>
    <main id="content" class="legal container">
      <h1 class="legal__title">Página no encontrada</h1>
      <p lang="en"><em>Page not found</em></p>
      <p>Esta dirección no existe o ha cambiado. La carta sigue en su sitio de siempre.</p>
      <ul>
        <li><a href="${carta}">Ver la carta</a></li>
        <li><a href="${home}">Ir al inicio</a></li>
      </ul>
    </main>
    ${footer(page)}`;

  return { lang: DEFAULT_LANG, dir: 'ltr', head: head.toString(), body: body.toString() };
}

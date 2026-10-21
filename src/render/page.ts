import { DEFAULT_LANG } from '../i18n';
import { html, type SafeHtml } from '../lib/html';
import { createPage, type Page, type RenderContext } from './context';
import { favorites } from './favorites';
import { footer } from './footer';
import { header } from './header';
import { homeBody } from './home';
import { spriteSheet } from './icons';
import { allergenLegend, reviewCallout } from './info';
import { menu } from './menu';
import { legacyTabScript, redirectScript } from './redirect';
import { head } from './seo';

export interface RenderedPage {
  lang: string;
  dir: 'ltr' | 'rtl';
  /** Content for `<head>` (title, meta, JSON-LD). */
  head: string;
  /** Content for `<body>`. */
  body: string;
}

function cartaBody(page: Page): SafeHtml {
  return html`${spriteSheet()}
    <a class="skip-link" href="#content">${page.t.skipLink}</a>
    ${header(page)} ${favorites(page)}
    <main id="content">
      ${menu(page)}
      <div class="container tail">${allergenLegend(page)} ${reviewCallout(page)}</div>
    </main>
    ${footer(page)}`;
}

/** The carta of one language. Pure function: same context in, same HTML out. */
export function renderPage(ctx: RenderContext): RenderedPage {
  const page = createPage(ctx, 'carta');
  return {
    lang: ctx.lang,
    dir: page.dir,
    head: html`${ctx.lang === DEFAULT_LANG && redirectScript(ctx, 'carta')}${head(page)}`.toString(),
    body: cartaBody(page).toString(),
  };
}

/** The home page of one language: the photo and the ways to reach the restaurant. */
export function renderHomePage(ctx: RenderContext): RenderedPage {
  const page = createPage(ctx, 'home');
  return {
    lang: ctx.lang,
    dir: page.dir,
    head: html`${ctx.lang === DEFAULT_LANG && redirectScript(ctx, 'home')}${legacyTabScript(ctx)}${head(page)}`.toString(),
    body: homeBody(page).toString(),
  };
}

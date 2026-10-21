import { DEFAULT_LANG } from '../i18n';
import { html, type SafeHtml } from '../lib/html';
import { createPage, type Page, type RenderContext } from './context';
import { favorites } from './favorites';
import { footer } from './footer';
import { header } from './header';
import { spriteSheet } from './icons';
import { allergenLegend, reviewCallout } from './info';
import { menu } from './menu';
import { redirectScript } from './redirect';
import { head } from './seo';

export interface RenderedPage {
  lang: string;
  dir: 'ltr' | 'rtl';
  /** Content for `<head>` (title, meta, JSON-LD). */
  head: string;
  /** Content for `<body>`. */
  body: string;
}

function body(page: Page): SafeHtml {
  return html`${spriteSheet()}
    <a class="skip-link" href="#content">${page.t.skipLink}</a>
    ${header(page)} ${favorites(page)}
    <main id="content">
      ${menu(page)}
      <div class="container tail">${allergenLegend(page)} ${reviewCallout(page)}</div>
    </main>
    ${footer(page)}`;
}

/** Pure function: same context in, same HTML out. Used by the dev server and by the build. */
export function renderPage(ctx: RenderContext): RenderedPage {
  const page = createPage(ctx);
  return {
    lang: ctx.lang,
    dir: page.dir,
    head: html`${ctx.lang === DEFAULT_LANG && redirectScript(ctx)}${head(page)}`.toString(),
    body: body(page).toString(),
  };
}

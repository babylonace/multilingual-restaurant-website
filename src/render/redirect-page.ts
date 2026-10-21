import { LOCALES } from '../i18n';
import { html, raw } from '../lib/html';
import { langHref, langUrl, type RenderContext } from './context';

/**
 * Stub for a language root (`/`, `/en/`): sends the visitor to that language's carta.
 * Hosts that support it should also serve a real HTTP redirect (see `_redirects`);
 * this page covers every other case, and keeps a `#tab` fragment from old links.
 */
export function renderRedirectPage(ctx: RenderContext): string {
  const target = langHref(ctx, ctx.lang);
  const canonical = langUrl(ctx, ctx.lang);
  // JSON.stringify output is safe inside <script> once `<` is escaped.
  const script = `location.replace(${JSON.stringify(target).replace(/</g, '\\u003c')}+location.hash)`;

  return html`<!doctype html>
    <html lang="${ctx.lang}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Inkawasi</title>
        <meta http-equiv="refresh" content="0; url=${target}" />
        ${canonical && html`<link rel="canonical" href="${canonical}" />`}
        <script>
          ${raw(script)};
        </script>
      </head>
      <body>
        <p><a href="${target}">${LOCALES[ctx.lang].ui.title}</a></p>
      </body>
    </html>`.toString();
}

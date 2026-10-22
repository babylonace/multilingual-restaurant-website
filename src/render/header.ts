import { LANGS } from '../data/langs';
import { DEFAULT_LANG } from '../i18n';
import { html, type SafeHtml } from '../lib/html';
import { kindHref, type Page } from './context';
import { flagIcon } from './icons';

/** Spanish first, the rest alphabetical by endonym (fixed locale so the build is reproducible). */
const SORTED_LANGS = [...LANGS].sort((a, b) => {
  if (a.code === DEFAULT_LANG) return -1;
  if (b.code === DEFAULT_LANG) return 1;
  return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' });
});

/**
 * Language switcher: a native <details> disclosure whose options are real links to the
 * pre-rendered pages, so it works without JavaScript. `lang-menu.ts` only adds Escape /
 * outside-click closing.
 */
function languageMenu(page: Page): SafeHtml {
  const { ctx, t, langDef, kind } = page;
  return html`<details class="lang" data-lang-menu>
    <summary class="lang__trigger" aria-label="${t.langLabel}: ${langDef.label}">
      ${flagIcon(langDef.flag)}<span class="lang__current">${langDef.label}</span
      ><span class="lang__chevron" aria-hidden="true"></span>
    </summary>
    <ul class="lang__list">
      ${SORTED_LANGS.map(
        (l) =>
          html`<li>
            <a
              class="lang__option"
              href="${kindHref(ctx, kind, l.code)}"
              hreflang="${l.code}"
              lang="${l.code}"
              data-lang="${l.code}"
              ${l.code === ctx.lang && html`aria-current="true"`}
              >${flagIcon(l.flag)}<span>${l.label}</span></a
            >
          </li>`,
      )}
    </ul>
  </details>`;
}

/** Logo (linking to the home page) and language switcher. */
export function mastheadBar(page: Page): SafeHtml {
  const { ctx, kind } = page;
  const logo = html`<a class="masthead__logo" href="${kindHref(ctx, 'home', ctx.lang)}">
    <img
      src="${ctx.base}assets/logo.webp"
      width="162"
      height="50"
      alt="Inkawasi"
      ${kind === 'carta' && html`fetchpriority="high"`}
    />
  </a>`;

  // The carta keeps its 820 px column; the other pages use the wide one. The cuisine, the place
  // and the carta are already in the first screen, so the bar stays quiet: logo and language.
  const width = kind === 'carta' ? 'container' : 'masthead__bar--wide';
  return html`<div class="masthead__bar ${width}">${logo} ${languageMenu(page)}</div>`;
}

export function header(page: Page): SafeHtml {
  const { t } = page;
  return html`<header class="masthead">
    ${mastheadBar(page)}
    <div class="masthead__hero container">
      <p class="eyebrow">${t.eyebrow}</p>
      <h1 class="masthead__title">${t.title}</h1>
      <p class="masthead__quote">${t.quote}</p>
    </div>
  </header>`;
}

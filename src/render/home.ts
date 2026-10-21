import { COVER_SIZE, COVER_WIDTHS, coverPath } from '../data/cover';
import { html, type SafeHtml } from '../lib/html';
import { actions } from './actions';
import { CONTACT, justEatLink } from './contact';
import { kindHref, type Page } from './context';
import { footer } from './footer';
import { mastheadBar } from './header';
import { spriteSheet, uiIcon } from './icons';
import { reviewCallout } from './info';

/**
 * Photo of the dining room, full width. It is the largest thing on the page, so it loads first:
 * `srcset` gives a phone the 800 px file (~47 KB) and `width`/`height` reserve its space.
 */
function cover(page: Page): SafeHtml {
  const { ctx, t } = page;
  const srcset = COVER_WIDTHS.map((w) => `${ctx.base}${coverPath(w)} ${w}w`).join(', ');
  return html`<div class="cover">
    <img
      class="cover__img"
      src="${ctx.base}${coverPath(1200)}"
      srcset="${srcset}"
      sizes="100vw"
      width="${COVER_SIZE.width}"
      height="${COVER_SIZE.height}"
      alt="${t.coverAlt}"
      fetchpriority="high"
      decoding="async"
    />
  </div>`;
}

/**
 * The home page: one photo and the ways to reach the restaurant. The carta is one button among
 * them. Opening hours are not repeated here; "see opening hours" opens the Google Maps card,
 * which is where they are maintained.
 */
export function homeBody(page: Page): SafeHtml {
  const { ctx, t } = page;
  return html`${spriteSheet()}
    <a class="skip-link" href="#content">${t.skipLink}</a>
    <header class="masthead masthead--home">${mastheadBar(page)}</header>
    <main id="content">
      ${cover(page)}
      <div class="home container">
        <div class="home__intro">
          <p class="eyebrow">${t.eyebrow}</p>
          <h1 class="home__title">${CONTACT.name}</h1>
          <p class="masthead__quote">${t.quote}</p>
        </div>
        <a
          class="pill pill--gold pill--lg"
          href="${kindHref(ctx, 'carta', ctx.lang)}"
          data-event="carta_clic"
          >${t.viewMenu}</a
        >
        ${actions(page)}
        <ul class="home__links">
          <li>
            <a
              class="pill pill--outline"
              href="${CONTACT.directionsUrl}"
              target="_blank"
              rel="noopener"
              data-event="llegar_clic"
              >${t.directions}<span class="visually-hidden"> ${t.newTab}</span></a
            >
          </li>
          <li>
            <a
              class="pill pill--outline"
              href="${CONTACT.mapsUrl}"
              target="_blank"
              rel="noopener"
              data-event="horario_clic"
              >${t.viewHours}<span class="visually-hidden"> ${t.newTab}</span></a
            >
          </li>
        </ul>
        <a
          class="actions__secondary"
          href="${justEatLink('home')}"
          target="_blank"
          rel="noopener"
          data-event="justeat_clic"
          data-prop-location="home"
          >${t.justEat}${uiIcon('arrow-right', 'actions__arrow')}<span class="visually-hidden">
            ${t.newTab}</span
          ></a
        >
        ${reviewCallout(page)}
      </div>
    </main>
    ${footer(page)}`;
}

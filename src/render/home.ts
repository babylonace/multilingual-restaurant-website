import { COVER_SIZE, COVER_WIDTHS, coverPath } from '../data/cover';
import { DISHES, FAVORITES } from '../data/menu';
import { formatPrice } from '../lib/format';
import { html, type SafeHtml } from '../lib/html';
import { actions } from './actions';
import { CONTACT, justEatLink } from './contact';
import { kindHref, type Page } from './context';
import { footer } from './footer';
import { mastheadBar } from './header';
import { brandIcon, spriteSheet, uiIcon } from './icons';
import { reviewCallout } from './info';

/**
 * First screen, in the style of the Instagram pieces: the dining room full bleed under a brown
 * veil, the name, the cuisine and two buttons on top of it. The photo is the LCP element: it is
 * never faded in (only scaled), `srcset` gives a phone the 800 px file and `width`/`height`
 * reserve its space.
 */
function hero(page: Page): SafeHtml {
  const { ctx, t } = page;
  const srcset = COVER_WIDTHS.map((w) => `${ctx.base}${coverPath(w)} ${w}w`).join(', ');
  return html`<section class="hero" aria-labelledby="home-title">
    <img
      class="hero__img cover__img"
      src="${ctx.base}${coverPath(1200)}"
      srcset="${srcset}"
      sizes="100vw"
      width="${COVER_SIZE.width}"
      height="${COVER_SIZE.height}"
      alt="${t.coverAlt}"
      fetchpriority="high"
      decoding="async"
    />
    <div class="hero__content">
      <p class="hero__tags">
        <span class="chip chip--brand">${t.eyebrow}</span>
        <span class="chip chip--glass">${uiIcon('map-pin', 'chip__icon')}${t.location}</span>
      </p>
      <h1 class="hero__title" id="home-title">${CONTACT.name}</h1>
      <p class="hero__quote">${t.quote}</p>
      <div class="hero__ctas">
        <a
          class="pill pill--gold pill--lg"
          href="${kindHref(ctx, 'carta', ctx.lang)}"
          data-event="carta_clic"
          >${t.viewMenu}</a
        >
        <a
          class="pill pill--cream pill--lg"
          href="${kindHref(ctx, 'menu', ctx.lang)}"
          data-event="menu_dia_clic"
          >${t.menuDelDia}</a
        >
        <a class="pill pill--ghost" href="#pedir"
          >${brandIcon('whatsapp', 'pill__icon')}${t.waTitle}</a
        >
      </div>
    </div>
  </section>`;
}

/** Gold, terracotta and olive: the bar at the foot of every Instagram piece. */
const brandBar = html`<div class="brand-bar" aria-hidden="true"><i></i><i></i><i></i></div>`;

/** Ordering and getting there, as large tiles on the brand brown, with the isotype as watermark. */
function orderBand(page: Page): SafeHtml {
  const { t } = page;
  return html`<div class="band band--brown" id="pedir">
    <div class="band__inner">
      ${actions(page)}
      <ul class="more">
        <li>
          <a
            class="tile tile--terra"
            href="${justEatLink('home')}"
            target="_blank"
            rel="noopener"
            data-event="justeat_clic"
            data-prop-location="home"
            >${brandIcon('justeat', 'tile__icon')}<span class="tile__label">${t.justEat}</span
            ><span class="visually-hidden"> ${t.newTab}</span></a
          >
        </li>
        <li>
          <a
            class="tile tile--outline"
            href="${CONTACT.directionsUrl}"
            target="_blank"
            rel="noopener"
            data-event="llegar_clic"
            >${uiIcon('navigation', 'tile__icon')}<span class="tile__label">${t.directions}</span
            ><span class="visually-hidden"> ${t.newTab}</span></a
          >
        </li>
        <li>
          <a
            class="tile tile--outline"
            href="${CONTACT.mapsUrl}"
            target="_blank"
            rel="noopener"
            data-event="horario_clic"
            >${uiIcon('clock', 'tile__icon')}<span class="tile__label">${t.viewHours}</span
            ><span class="visually-hidden"> ${t.newTab}</span></a
          >
        </li>
      </ul>
    </div>
  </div>`;
}

/**
 * The house favourites, each one a way into its section of the carta. Set like a line of the
 * printed carta (name, dotted leader, price) rather than as a stack of identical cards.
 */
function dishes(page: Page): SafeHtml {
  const { ctx, t } = page;
  const carta = kindHref(ctx, 'carta', ctx.lang);
  return html`<section class="dishes" aria-labelledby="dishes-title">
    <div class="dishes__inner">
      <h2 class="section-heading" id="dishes-title">${t.favorites}</h2>
      <ul class="dishes__list">
        ${FAVORITES.map(({ dish, section, image }) => {
          const { name, priceCents } = DISHES[dish];
          return html`<li>
            <a class="plate" href="${carta}#${section}">
              <span class="plate__frame">
                <img
                  class="plate__img"
                  src="${ctx.base}assets/favoritos/${image}.webp"
                  width="476"
                  height="291"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span class="plate__line">
                <span class="plate__name">${name}</span>
                <span class="leader" aria-hidden="true"></span>
                <span class="price">${formatPrice(priceCents, ctx.lang)}</span>
              </span>
            </a>
          </li>`;
        })}
      </ul>
    </div>
  </section>`;
}

/**
 * The home page: what the place is and the ways to reach it. The carta is one button among the
 * others. Opening hours are not repeated here: "see opening hours" opens the Google Maps card,
 * where they are maintained.
 */
export function homeBody(page: Page): SafeHtml {
  const { t } = page;
  return html`${spriteSheet()}
    <a class="skip-link" href="#content">${t.skipLink}</a>
    <header class="masthead masthead--home">${mastheadBar(page)}</header>
    <main id="content">
      ${hero(page)} ${brandBar} ${orderBand(page)} ${dishes(page)}
      <div class="band band--olive">
        <div class="band__inner">${reviewCallout(page)}</div>
      </div>
    </main>
    ${footer(page)}`;
}

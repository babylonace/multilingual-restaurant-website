import { DISHES, FAVORITES } from '../data/menu';
import { formatPrice } from '../lib/format';
import { html, type SafeHtml } from '../lib/html';
import type { Page } from './context';
import { orderControl } from './order';
import { picture, pictureOf } from './picture';

/** Cards above the fold load eagerly; the rest are lazy. */
const EAGER_COUNT = 2;

export function favorites(page: Page): SafeHtml {
  const { ctx, t, locale } = page;
  return html`<section class="favorites" aria-labelledby="favorites-title">
    <div class="section-head container">
      <h2 class="section-title" id="favorites-title">${t.favorites}</h2>
      <span class="rule" aria-hidden="true"></span>
    </div>
    <div class="favorites__scroller" role="region" aria-labelledby="favorites-title" tabindex="0">
      <ul class="favorites__track">
        ${FAVORITES.map(({ dish, section, image }, index) => {
          const { name, priceCents } = DISHES[dish];
          return html`<li class="fav">
            ${picture(pictureOf(ctx.pictures, image), {
              class: 'fav__img',
              alt: name,
              // A card is min(232px, 72vw) wide.
              sizes: '232px',
              loading: index < EAGER_COUNT ? 'eager' : 'lazy',
            })}
            <div class="fav__body">
              <p class="eyebrow eyebrow--small">${t[section]}</p>
              <h3 class="fav__name">${name}</h3>
              <p class="fav__desc">${locale.descriptions[dish]}</p>
              <div class="fav__foot">
                <p class="price fav__price">${formatPrice(priceCents, ctx.lang)}</p>
                ${orderControl(page, DISHES[dish], 1)}
              </div>
            </div>
          </li>`;
        })}
      </ul>
    </div>
  </section>`;
}

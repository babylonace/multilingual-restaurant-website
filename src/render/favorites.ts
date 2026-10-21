import { DISHES, FAVORITES } from '../data/menu';
import { formatPrice } from '../lib/format';
import { html, type SafeHtml } from '../lib/html';
import type { Page } from './context';

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
            <img
              class="fav__img"
              src="${ctx.base}assets/favoritos/${image}.webp"
              width="476"
              height="291"
              alt="${name}"
              loading="${index < EAGER_COUNT ? 'eager' : 'lazy'}"
              decoding="async"
            />
            <div class="fav__body">
              <p class="eyebrow eyebrow--small">${t[section]}</p>
              <h3 class="fav__name">${name}</h3>
              <p class="fav__desc">${locale.descriptions[dish]}</p>
              <p class="price fav__price">${formatPrice(priceCents, ctx.lang)}</p>
            </div>
          </li>`;
        })}
      </ul>
    </div>
  </section>`;
}

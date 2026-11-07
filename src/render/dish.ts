import { DISHES } from '../data/menu';
import type { DishId, FoodId } from '../data/types';
import { formatPrice } from '../lib/format';
import { html, type SafeHtml } from '../lib/html';
import type { Page } from './context';
import { allergenIcon } from './icons';
import { orderControl } from './order';

export function dishItem(page: Page, id: FoodId): SafeHtml {
  const dish = DISHES[id];
  const { t, locale, ctx } = page;
  const description = locale.descriptions[id];

  return html`<li class="dish">
    <div class="dish__head">
      <div class="dish__title">
        <h3 class="dish__name">${dish.name}</h3>
        ${
          'availability' in dish &&
          html`<span class="badge badge--under">${t[dish.availability]}</span>`
        }
      </div>
      <span class="leader" aria-hidden="true"></span>
      <span class="price">${formatPrice(dish.priceCents, ctx.lang)}</span>
      ${orderControl(page, dish, 1)}
    </div>
    <p class="dish__desc">${description}</p>
    ${
      dish.allergens.length > 0 &&
      html`<ul class="allergens" aria-label="${t.allergenTitle}">
        ${dish.allergens.map(
          (key) =>
            html`<li class="allergen">
              <span class="allergen__icon">${allergenIcon(key)}</span>${locale.allergens[key]}
            </li>`,
        )}
      </ul>`
    }
  </li>`;
}

/** A name · leader · price row, used for drinks. */
export function priceRow(page: Page, id: DishId): SafeHtml {
  const dish = DISHES[id];
  return html`<li class="row">
    <span class="row__name">${dish.name}</span>
    <span class="leader" aria-hidden="true"></span>
    <span class="price">${formatPrice(dish.priceCents, page.ctx.lang)}</span>
    ${orderControl(page, dish, 0)}
  </li>`;
}

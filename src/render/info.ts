import { ALLERGEN_KEYS } from '../data/menu';
import { html, type SafeHtml } from '../lib/html';
import { CONTACT } from './contact';
import type { Page } from './context';
import { allergenIcon, uiIcon } from './icons';

/** Always-visible allergen key, shared by every tab. */
export function allergenLegend(page: Page): SafeHtml {
  const { t, locale } = page;
  return html`<section class="legend" aria-labelledby="legend-title">
    <h2 class="legend__title" id="legend-title">${t.allergenTitle}</h2>
    <ul class="legend__grid">
      ${ALLERGEN_KEYS.map(
        (key) =>
          html`<li class="legend__item">
            <span class="allergen__icon allergen__icon--lg">${allergenIcon(key)}</span
            >${locale.allergens[key]}
          </li>`,
      )}
    </ul>
    <p class="legend__footer">${t.allergenFooter}</p>
  </section>`;
}

export function reviewCallout(page: Page): SafeHtml {
  const { t } = page;
  return html`<a class="review" href="${CONTACT.reviewUrl}" target="_blank" rel="noopener">
    ${uiIcon('map-pin', 'review__pin')}
    <span class="review__text"><strong>${t.reviewTitle}</strong><br />${t.reviewText}</span>
    ${uiIcon('arrow-right', 'review__arrow')}
    <span class="visually-hidden">${t.newTab}</span>
  </a>`;
}

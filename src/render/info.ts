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
    <p class="legend__footer">${t.allergenTraces}</p>
  </section>`;
}

/** Both places where a review helps: Google Maps and TripAdvisor. */
export function reviewCallout(page: Page): SafeHtml {
  const { t } = page;
  const sites = [
    { id: 'google', name: 'Google Maps', href: CONTACT.reviewUrl },
    { id: 'tripadvisor', name: 'TripAdvisor', href: CONTACT.tripadvisorReviewUrl },
  ] as const;
  return html`<section class="review" aria-labelledby="review-title">
    ${uiIcon('map-pin', 'review__pin')}
    <div class="review__body">
      <h2 class="review__title" id="review-title">${t.reviewTitle}</h2>
      <p class="review__text">${t.reviewText}</p>
      <ul class="review__links">
        ${sites.map(
          (site) =>
            html`<li>
              <a
                class="review__link"
                href="${site.href}"
                target="_blank"
                rel="noopener"
                data-event="resena_clic"
                data-prop-site="${site.id}"
                >${site.name}${uiIcon('arrow-right', 'review__arrow')}<span class="visually-hidden">
                  ${t.newTab}</span
                ></a
              >
            </li>`,
        )}
      </ul>
    </div>
  </section>`;
}

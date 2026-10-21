import { BEERS, SECTIONS, SOFT_DRINKS } from '../data/menu';
import type { SectionId, TabId } from '../data/types';
import { html, type SafeHtml } from '../lib/html';
import type { Page } from './context';
import { dishItem, priceRow } from './dish';

/** Sections whose dishes are sold à la carte rather than as part of the menú del día. */
const A_LA_CARTE: ReadonlySet<SectionId> = new Set(['marino', 'wok', 'criollo']);

export const FIRST_TAB: TabId = 'entrantes';

function tabIds(): TabId[] {
  return [...SECTIONS.map((s) => s.id), 'bebidas'];
}

/**
 * WAI-ARIA tabs. Buttons carry `data-tab`; `tabs.ts` wires keyboard and click behaviour.
 * Only the first panel is visible in the HTML, the rest are `hidden` until selected.
 */
function tabList(page: Page): SafeHtml {
  const { t } = page;
  return html`<div class="tabs-bar">
    <div class="tabs-scroll">
      <div class="tabs" role="tablist" aria-label="${t.tabsLabel}">
        ${tabIds().map(
          (id) =>
            html`<button
              class="tab"
              type="button"
              role="tab"
              id="tab-${id}"
              aria-controls="panel-${id}"
              aria-selected="${id === FIRST_TAB}"
              tabindex="${id === FIRST_TAB ? 0 : -1}"
              data-tab="${id}"
            >
              ${t[id]}
            </button>`,
        )}
      </div>
    </div>
  </div>`;
}

function dishPanel(page: Page, id: SectionId): SafeHtml {
  const { t } = page;
  const section = SECTIONS.find((s) => s.id === id);
  if (!section) throw new Error(`Unknown section: ${id}`);
  return html`${A_LA_CARTE.has(id) && html`<p class="eyebrow eyebrow--terra">${t.alaCarte}</p>`}
    <ul class="dishes">
      ${section.dishes.map((dish) => dishItem(page, dish))}
    </ul>`;
}

function drinksPanel(page: Page): SafeHtml {
  const { t } = page;
  return html`<div class="drinks">
      <section class="drinks__col" aria-labelledby="drinks-soft">
        <h3 class="drinks__title" id="drinks-soft">${t.bebidas}</h3>
        <ul>
          ${SOFT_DRINKS.map((id) => priceRow(page, id))}
        </ul>
      </section>
      <section class="drinks__col" aria-labelledby="drinks-beer">
        <h3 class="drinks__title" id="drinks-beer">${t.cervezas}</h3>
        <ul>
          ${BEERS.map((id) => priceRow(page, id))}
        </ul>
        <p class="note">${t.glutenNote}</p>
      </section>
    </div>
    <div class="extras">
      <section>
        <h3 class="extras__title">${t.dessertsTitle}</h3>
        <p class="extras__text">${t.dessertsText}</p>
      </section>
      <section>
        <h3 class="extras__title">${t.cocktailsTitle}</h3>
        <p class="extras__text">${t.cocktailsText}</p>
      </section>
    </div>`;
}

export function menu(page: Page): SafeHtml {
  return html`${tabList(page)}
    <div class="container panels">
      ${tabIds().map(
        (id) =>
          html`<section
            class="panel"
            role="tabpanel"
            id="panel-${id}"
            aria-labelledby="tab-${id}"
            tabindex="0"
            ${id !== FIRST_TAB && html`hidden`}
          >
            ${id === 'bebidas' ? drinksPanel(page) : dishPanel(page, id)}
          </section>`,
      )}
    </div>`;
}

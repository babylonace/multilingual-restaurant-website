import { formatPrice } from '../lib/format';
import { html, type SafeHtml } from '../lib/html';
import { whatsappIntentLink } from './contact';
import { kindHref, type Page } from './context';
import { footer } from './footer';
import { mastheadBar } from './header';
import { brandIcon, spriteSheet } from './icons';

/** Confirmed by the restaurant: 13,00€ the full menu, 8,00€ the half menu. */
const PRICES = { full: 1300, half: 800 } as const;

/**
 * The menú del día. The prices, set as large type, are the page. Until the daily editor arrives
 * (stage 4) it states what is fixed (hours, structure, prices) and, for the dishes that change
 * every day, offers a WhatsApp message asking what is on today.
 */
export function menuDelDiaBody(page: Page): SafeHtml {
  const { ctx, t } = page;
  return html`${spriteSheet()}
    <a class="skip-link" href="#content">${t.skipLink}</a>
    <header class="masthead masthead--home">${mastheadBar(page)}</header>
    <main id="content" class="mdd">
      <div class="mdd__inner">
        <h1 class="mdd__title">${t.menuDelDia}</h1>
        <p class="mdd__lead">${t.mddLead}</p>
        <dl class="mdd__prices">
          <div class="mdd__price">
            <dt>${t.mddFull}</dt>
            <dd>${formatPrice(PRICES.full, ctx.lang)}</dd>
          </div>
          <div class="mdd__price mdd__price--half">
            <dt>${t.mddHalf}</dt>
            <dd>${formatPrice(PRICES.half, ctx.lang)}</dd>
          </div>
        </dl>
        <p class="mdd__today">${t.mddToday}</p>
        <div class="mdd__ctas">
          <a
            class="pill pill--gold pill--lg"
            href="${whatsappIntentLink('menu', ctx.lang)}"
            target="_blank"
            rel="noopener"
            data-event="whatsapp_clic"
            data-prop-intent="menu"
            >${brandIcon('whatsapp', 'pill__icon')}${t.waMenu}<span class="visually-hidden">
              ${t.newTab}</span
            ></a
          >
          <a class="pill pill--ghost pill--lg" href="${kindHref(ctx, 'carta', ctx.lang)}"
            >${t.viewMenu}</a
          >
        </div>
      </div>
    </main>
    <div class="brand-bar" aria-hidden="true"></div>
    ${footer(page)}`;
}

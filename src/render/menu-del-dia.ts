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
 * The menú del día. Until the daily editor arrives (stage 4) the page states what is fixed (the
 * hours, the structure and the prices) and, for what changes every day, offers a WhatsApp
 * message asking what is on today, as the plan says when there is no menu published.
 */
export function menuDelDiaBody(page: Page): SafeHtml {
  const { ctx, t } = page;
  return html`${spriteSheet()}
    <a class="skip-link" href="#content">${t.skipLink}</a>
    <header class="masthead masthead--home">${mastheadBar(page)}</header>
    <main id="content" class="mdd">
      <div class="mdd__inner">
        <p class="hero__tags"><span class="chip chip--gold">${t.eyebrow}</span></p>
        <h1 class="mdd__title">${t.menuDelDia}</h1>
        <p class="mdd__lead">${t.mddLead}</p>
        <ul class="mdd__prices">
          <li class="price-card">
            <span class="price-card__label">${t.mddFull}</span>
            <span class="price-card__value">${formatPrice(PRICES.full, ctx.lang)}</span>
          </li>
          <li class="price-card price-card--half">
            <span class="price-card__label">${t.mddHalf}</span>
            <span class="price-card__value">${formatPrice(PRICES.half, ctx.lang)}</span>
          </li>
        </ul>
        <p class="mdd__today">${t.mddToday}</p>
        <div class="mdd__ctas">
          <a
            class="pill pill--olive pill--lg"
            href="${whatsappIntentLink('menu', ctx.lang)}"
            target="_blank"
            rel="noopener"
            data-event="whatsapp_clic"
            data-prop-intent="menu"
            >${brandIcon('whatsapp', 'pill__icon')}${t.waMenu}<span class="visually-hidden">
              ${t.newTab}</span
            ></a
          >
          <a class="pill pill--outline pill--lg" href="${kindHref(ctx, 'carta', ctx.lang)}"
            >${t.viewMenu}</a
          >
        </div>
      </div>
    </main>
    <div class="brand-bar" aria-hidden="true"><i></i><i></i><i></i></div>
    ${footer(page)}`;
}

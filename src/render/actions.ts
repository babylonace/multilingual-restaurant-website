import { type HomeIntent } from '../data/whatsapp';
import { html, type SafeHtml } from '../lib/html';
import { whatsappIntentLink } from './contact';
import { kindHref, type Page } from './context';
import { brandIcon, uiIcon } from './icons';

/**
 * The three ways to enjoy it. A question is the fourth thing a visitor wants, but it is a small
 * link (see `home.ts`), not a tile that competes with the ones that bring a table or an order.
 */
const TILE_INTENTS = ['reservar', 'recoger', 'domicilio'] as const satisfies readonly HomeIntent[];

const LABEL = {
  reservar: 'waReservar',
  recoger: 'waRecoger',
  domicilio: 'waDomicilio',
  consulta: 'waConsulta',
} as const satisfies Record<HomeIntent, string>;

const ICON = {
  reservar: 'calendar',
  recoger: 'shopping-bag',
  domicilio: 'bike',
  consulta: 'message-circle',
} as const satisfies Record<HomeIntent, string>;

/**
 * Floating WhatsApp button, phone only (CSS hides it from 900 px): one tap from anywhere on the
 * page to the chat. It reuses a ready-made message rather than adding a new one: the menú del día
 * asks what today's menu is, every other page opens a question.
 */
export function whatsappFab(page: Page): SafeHtml {
  const { ctx, t, kind } = page;
  const intent = kind === 'menu' ? 'menu' : 'consulta';
  // Says what the tap does ("WhatsApp: Hacer una consulta"), not just where it goes.
  const label = kind === 'menu' ? t.waMenu : t.waConsulta;
  return html`<a
    class="wa-fab"
    href="${whatsappIntentLink(intent, ctx.lang)}"
    target="_blank"
    rel="noopener"
    aria-label="WhatsApp: ${label} ${t.newTab}"
    data-event="whatsapp_clic"
    data-prop-intent="${intent}"
    data-prop-origin="flotante"
    >${brandIcon('whatsapp', 'wa-fab__icon')}</a
  >`;
}

/**
 * Where a tile leads. Ordering goes to the carta with the way already chosen (one place to see
 * the dishes and to pick them, like the delivery apps); booking goes to the form when the build
 * has reservations on. Everything else, and every tile without JavaScript, opens WhatsApp with a
 * ready-made message.
 */
export function tileTarget(
  page: Page,
  intent: HomeIntent,
): { href: string; internal: boolean; event: string } {
  const { ctx } = page;
  if (intent === 'domicilio' || intent === 'recoger') {
    return {
      href: `${kindHref(ctx, 'carta', ctx.lang)}?pedido=${intent}`,
      internal: true,
      event: 'pedido_clic',
    };
  }
  if (intent === 'reservar' && ctx.bookings) {
    return { href: kindHref(ctx, 'reservar', ctx.lang), internal: true, event: 'reserva_clic' };
  }
  return { href: whatsappIntentLink(intent, ctx.lang), internal: false, event: 'whatsapp_clic' };
}

/**
 * The main call to action: what the visitor wants, one tap away. Plain links, so it works without
 * JavaScript; the `data-event` attributes are read by `client/track.ts` once an analytics script
 * is present.
 */
export function actions(page: Page): SafeHtml {
  const { t } = page;
  return html`<section class="actions" aria-labelledby="actions-title">
    <h2 class="actions__title" id="actions-title">${t.homeChoose}</h2>
    <ul class="actions__list">
      ${TILE_INTENTS.map((intent) => {
        const { href, internal, event } = tileTarget(page, intent);
        return html`<li>
          <a
            class="tile"
            href="${href}"
            ${!internal && html`target="_blank" rel="noopener"`}
            data-event="${event}"
            data-prop-intent="${intent}"
            >${uiIcon(ICON[intent], 'tile__icon')}<span class="tile__label"
              >${t[LABEL[intent]]}</span
            >${!internal && html`<span class="visually-hidden"> ${t.newTab}</span>`}</a
          >
        </li>`;
      })}
    </ul>
  </section>`;
}

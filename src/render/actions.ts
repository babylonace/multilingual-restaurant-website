import { type HomeIntent, WHATSAPP_INTENTS } from '../data/whatsapp';
import { html, type SafeHtml } from '../lib/html';
import { whatsappIntentLink } from './contact';
import type { Page } from './context';
import { brandIcon, uiIcon } from './icons';

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
 * The main call to action: write to the restaurant on WhatsApp with the message for what the
 * visitor wants already written. Plain links, so it works without JavaScript; the `data-event`
 * attributes are read by `client/track.ts` once an analytics script is present.
 */
export function actions(page: Page): SafeHtml {
  const { ctx, t } = page;
  return html`<section class="actions" aria-labelledby="actions-title">
    <h2 class="actions__title" id="actions-title">
      ${brandIcon('whatsapp', 'actions__icon')}<span>${t.waTitle}</span>
    </h2>
    <ul class="actions__list">
      ${WHATSAPP_INTENTS.map(
        (intent) =>
          html`<li>
            <a
              class="tile"
              href="${whatsappIntentLink(intent, ctx.lang)}"
              target="_blank"
              rel="noopener"
              data-event="whatsapp_clic"
              data-prop-intent="${intent}"
              >${uiIcon(ICON[intent], 'tile__icon')}<span class="tile__label"
                >${t[LABEL[intent]]}</span
              ><span class="visually-hidden"> ${t.newTab}</span></a
            >
          </li>`,
      )}
    </ul>
  </section>`;
}

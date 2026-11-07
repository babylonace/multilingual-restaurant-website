/**
 * The cart of the carta, pre-rendered. The blocks that only work with JavaScript carry
 * `data-js-only`: a script in the head marks the page `js` before anything is painted and CSS
 * hides them otherwise. They are in place from the first paint, so nothing jumps when the script
 * arrives, and without JavaScript the carta looks and works as it always did (the "Pedir a
 * domicilio" link still opens a blank WhatsApp order).
 */
import {
  DEFAULT_ORDER_MODE,
  DELIVERY_FEE_CENTS,
  MENU_ITEMS,
  ORDER_MODES,
  TAPER_CENTS,
  type OrderMode,
} from '../data/order';
import type { Availability } from '../data/types';
import { formatPrice } from '../lib/format';
import { html, type SafeHtml } from '../lib/html';
import { pickupSlots } from '../lib/hours';
import { languageLine } from '../lib/whatsapp';
import { CONTACT, whatsappIntentLink } from './contact';
import type { Page } from './context';
import { uiIcon } from './icons';

/** Fills the `{name}` of a translated label. */
function labelFor(template: string, name: string): string {
  return template.replace('{name}', name);
}

/** What the + button needs to know about something orderable (a `Dish` is one). */
interface Orderable {
  id: string;
  name: string;
  priceCents: number;
  availability?: Availability;
}

/**
 * The + button of a dish or drink (it grows a − and the amount once something is added). The data
 * attributes are all the script needs to know about the item. `tapers` is how many tapers one unit takes (a
 * dish 1, a drink 0); `menu` marks the menú del día.
 */
export function orderControl(page: Page, dish: Orderable, tapers: number, menu = false): SafeHtml {
  const { t } = page;
  return html`<span
    class="qty"
    data-js-only
    data-order-item
    data-id="${dish.id}"
    data-name="${dish.name}"
    data-price="${dish.priceCents}"
    data-tapers="${tapers}"
    ${menu && html`data-menu`}
    ${dish.availability && html`data-badge="${t[dish.availability]}"`}
  >
    <button
      class="qty__btn"
      type="button"
      hidden
      data-qty-minus
      aria-label="${labelFor(t.orderRemove, dish.name)}"
    >
      ${uiIcon('minus', 'qty__icon')}
    </button>
    <output class="qty__n" hidden data-qty-n>0</output>
    <button
      class="qty__btn"
      type="button"
      data-qty-plus
      aria-label="${labelFor(t.orderAdd, dish.name)}"
    >
      ${uiIcon('plus', 'qty__icon')}
    </button>
  </span>`;
}

const MODE_LABEL = {
  domicilio: 'orderModeDelivery',
  recoger: 'orderModePickup',
} as const satisfies Record<OrderMode, string>;

/** The two ways to get the order, as pills. `name` keeps the panel's and the dialog's groups apart. */
function modeChoices(page: Page, name: string, compact = false): SafeHtml {
  const { t } = page;
  return html`<fieldset class="order__mode">
    <legend class="order__legend ${compact && 'visually-hidden'}">${t.orderMode}</legend>
    ${ORDER_MODES.map(
      (mode) =>
        html`<label class="choice">
          <input
            type="radio"
            name="${name}"
            value="${mode}"
            data-order-mode
            ${mode === DEFAULT_ORDER_MODE && html`checked`}
          />
          <span>${t[MODE_LABEL[mode]]}</span>
        </label>`,
    )}
  </fieldset>`;
}

/**
 * Above the dishes: how the customer wants it (the costs of each way are shown before they add
 * anything, not at the end) and one line saying the + buttons are for ordering. Without JavaScript
 * a short line offers the blank WhatsApp orders instead.
 */
export function orderPanel(page: Page): SafeHtml {
  const { ctx, t } = page;
  const costs = (template: string) =>
    template
      .replace('{delivery}', formatPrice(DELIVERY_FEE_CENTS, ctx.lang))
      .replace('{taper}', formatPrice(TAPER_CENTS, ctx.lang));
  return html`<section class="order-panel" id="pedido" data-js-only data-order-panel>
      ${modeChoices(page, 'order-mode-top', true)}
      <p class="order-panel__costs" data-order-costs="domicilio">${costs(t.orderCostsDelivery)}</p>
      <p class="order-panel__costs" data-order-costs="recoger" hidden>
        ${costs(t.orderCostsPickup)}
      </p>
      <p
        class="order-panel__status"
        hidden
        data-kitchen-status
        data-t-open="${t.serviceOpen}"
        data-t-later="${t.serviceLater}"
        data-t-next="${t.serviceNext}"
      ></p>
    </section>
    <noscript>
      <p class="order-hint">
        <a href="${whatsappIntentLink('domicilio', ctx.lang)}">${t.waDomicilio}</a> ·
        <a href="${whatsappIntentLink('recoger', ctx.lang)}">${t.waRecoger}</a>
      </p>
    </noscript>`;
}

/** The bar fixed to the bottom of the screen once the order has something in it. */
export function orderBar(page: Page): SafeHtml {
  return html`<div class="order-bar" hidden data-order-bar>
    <button class="order-bar__btn" type="button" aria-haspopup="dialog" data-order-open>
      <span class="order-bar__count" data-order-count>0</span>
      <span class="order-bar__label">${page.t.orderView}</span>
      <span class="order-bar__total" data-order-bar-total></span>
    </button>
  </div>`;
}

/** The order itself: lines, delivery or pickup, totals and the WhatsApp button. */
export function orderDialog(page: Page): SafeHtml {
  const { ctx, t } = page;
  return html`<dialog
    class="order"
    aria-labelledby="order-title"
    data-order
    data-wa-number="${CONTACT.whatsappNumber}"
    data-lang="${ctx.lang}"
    data-lang-line="${languageLine(ctx.lang)}"
  >
    <div class="order__panel">
      <header class="order__head">
        <h2 class="order__title" id="order-title">${t.orderTitle}</h2>
        <button class="order__close" type="button" data-order-close aria-label="${t.orderClose}">
          ${uiIcon('x', 'qty__icon')}
        </button>
      </header>

      <p class="order__empty" data-order-empty>${t.orderEmpty}</p>

      <form class="order__filled" data-order-filled hidden>
        <ul class="order__lines" data-order-lines></ul>

        ${modeChoices(page, 'order-mode')}

        <fieldset class="order__details">
          <legend class="order__legend">${t.orderDetails}</legend>
          <label class="field">
            <span class="field__label">${t.orderName}</span>
            <input
              class="field__input"
              type="text"
              autocomplete="name"
              maxlength="80"
              required
              data-order-field="name"
            />
          </label>
          <label class="field" data-order-when="domicilio">
            <span class="field__label">${t.orderAddress}</span>
            <input
              class="field__input"
              type="text"
              autocomplete="street-address"
              maxlength="160"
              data-order-field="address"
            />
          </label>
          <div class="field" data-order-when="recoger" hidden>
            <label class="field__label" for="order-time">${t.orderTime}</label>
            <select class="field__input" id="order-time" data-order-field="time">
              <option value="">${t.pickTime}</option>
              ${pickupSlots().map((time) => html`<option value="${time}">${time}</option>`)}
            </select>
          </div>
          <label class="field" data-order-when="menu" hidden>
            <span class="field__label">${t.orderMenuChoice}</span>
            <input class="field__input" type="text" maxlength="160" data-order-field="menu" />
          </label>
        </fieldset>

        <dl class="order__totals">
          <div class="order__row">
            <dt>${t.orderSubtotal}</dt>
            <dd class="order__amount" data-order-subtotal></dd>
          </div>
          <div class="order__row" data-order-tapers-row>
            <dt>
              ${t.orderTapers}
              <span class="order__detail" data-order-tapers-detail></span>
            </dt>
            <dd class="order__amount" data-order-tapers></dd>
          </div>
          <div class="order__row" data-order-delivery-row>
            <dt>${t.orderDeliveryFee}</dt>
            <dd class="order__amount" data-order-delivery></dd>
          </div>
          <div class="order__row order__row--total">
            <dt>${t.orderTotal}</dt>
            <dd class="order__amount" data-order-total></dd>
          </div>
        </dl>

        <p class="order__pay" data-order-pay="domicilio">${t.payDelivery}</p>
        <p class="order__pay" data-order-pay="recoger" hidden>${t.payPickup}</p>

        <div class="order__actions">
          <a
            class="pill pill--olive"
            href="${whatsappIntentLink('domicilio', ctx.lang)}"
            target="_blank"
            rel="noopener"
            data-order-send
            data-event="whatsapp_clic"
            data-prop-intent="domicilio"
            data-prop-origin="carrito"
            >${t.orderSend}<span class="visually-hidden"> ${t.newTab}</span></a
          >
          <button class="pill pill--outline pill--sm" type="button" data-order-clear>
            ${t.orderClear}
          </button>
        </div>
      </form>

      <div class="order__sent" data-order-sent hidden>
        <h3 class="order__sent-title" tabindex="-1" data-order-sent-title>${t.sentTitle}</h3>
        <p class="order__sent-text">${t.orderSentText}</p>
        <div class="order__actions order__actions--wrap">
          <button class="pill pill--outline" type="button" data-order-sent-back>
            ${t.orderSentBack}
          </button>
          <button class="pill pill--outline" type="button" data-order-new>${t.orderSentNew}</button>
        </div>
      </div>
    </div>
  </dialog>`;
}

/**
 * The menú del día as two rows above the dishes, with a reminder that the menu changes every
 * day: the customer looks at today's on Instagram and writes the dishes in the message.
 */
export function menuCard(page: Page): SafeHtml {
  const { ctx, t } = page;
  const names = { menuCompleto: t.mddFull, medioMenu: t.mddHalf } as const;
  return html`<section
    class="menu-card"
    id="pedir-menu"
    aria-labelledby="menu-card-title"
    data-js-only
    data-order-menu-card
  >
    <h3 class="menu-card__title" id="menu-card-title">${t.menuDelDia}</h3>
    <p class="menu-card__hours">${t.orderMenuHours}</p>
    <p
      class="menu-card__status"
      hidden
      data-menu-status
      data-t-open="${t.menuOpen}"
      data-t-soon="${t.menuSoon}"
      data-t-closed="${t.menuClosed}"
    ></p>
    <ul>
      ${MENU_ITEMS.map(
        (item) =>
          html`<li class="row">
            <span class="row__name">${names[item.id]}</span>
            <span class="leader" aria-hidden="true"></span>
            <span class="price">${formatPrice(item.priceCents, ctx.lang)}</span>
            ${orderControl(page, item, item.tapers, true)}
          </li>`,
      )}
    </ul>
    <p class="menu-card__note">
      ${t.orderMenuNote}
      <a
        href="${CONTACT.instagramUrl}"
        target="_blank"
        rel="noopener"
        data-event="instagram_clic"
        data-prop-origin="menu_pedido"
        >${t.orderMenuInstagram}<span class="visually-hidden"> ${t.newTab}</span></a
      >
    </p>
  </section>`;
}

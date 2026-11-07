/**
 * The reservation form. It is built only when the build turns reservations on (`ctx.bookings`),
 * and it is a form that writes the WhatsApp message: no backend, no data leaves the browser until
 * the customer sends the message. The form is `data-js-only` (shown from the first paint when
 * JavaScript is on); without JavaScript a link opens the blank WhatsApp booking.
 */
import { bookingSlots } from '../lib/hours';
import { MAX_GUESTS } from '../lib/reservation';
import { html, type SafeHtml } from '../lib/html';
import { languageLine } from '../lib/whatsapp';
import { CONTACT, whatsappIntentLink } from './contact';
import { kindHref, type Page } from './context';
import { footer } from './footer';
import { mastheadBar } from './header';
import { spriteSheet, uiIcon } from './icons';

const GUESTS = Array.from({ length: MAX_GUESTS }, (_, i) => i + 1);
const DEFAULT_GUESTS = 2;

export function reservarBody(page: Page): SafeHtml {
  const { ctx, t } = page;
  return html`${spriteSheet()}
    <a class="skip-link" href="#content">${t.skipLink}</a>
    <header class="masthead masthead--home">${mastheadBar(page)}</header>
    <main id="content" class="reserve">
      <div class="container reserve__inner">
        <a class="reserve__back" href="${kindHref(ctx, 'home', ctx.lang)}"
          >${uiIcon('arrow-left', 'reserve__back-icon')}${t.home}</a
        >
        <h1 class="reserve__title">${t.resTitle}</h1>
        <p class="reserve__lead">${t.resLead}</p>

        <form
          class="reserve__form"
          data-js-only
          data-reserve
          data-wa-number="${CONTACT.whatsappNumber}"
          data-lang-line="${languageLine(ctx.lang)}"
        >
          <label class="field">
            <span class="field__label">${t.resName}</span>
            <input
              class="field__input"
              type="text"
              name="name"
              autocomplete="name"
              maxlength="80"
              required
            />
          </label>
          <label class="field">
            <span class="field__label">${t.resPhone}</span>
            <input
              class="field__input"
              type="tel"
              name="phone"
              autocomplete="tel"
              inputmode="tel"
              maxlength="20"
              pattern="[0-9+\\(\\) .\\-]{9,20}"
            />
          </label>
          <div class="reserve__row">
            <label class="field">
              <span class="field__label">${t.resDate}</span>
              <input class="field__input" type="date" name="date" required data-reserve-date />
            </label>
            <!-- Label outside the field: wrapped, the name would take in the "Elige una hora" option. -->
            <div class="field">
              <label class="field__label" for="res-time">${t.resTime}</label>
              <select class="field__input" id="res-time" name="time" required>
                <option value="">${t.pickTime}</option>
                ${bookingSlots().map((time) => html`<option value="${time}">${time}</option>`)}
              </select>
            </div>
          </div>
          <p class="field__hint reserve__closed" hidden data-reserve-closed>${t.resClosedMonday}</p>
          <!-- These two keep their hint outside the label, so the name of the field stays short. -->
          <div class="field">
            <label class="field__label" for="res-guests">${t.resGuests}</label>
            <select
              class="field__input"
              id="res-guests"
              name="guests"
              required
              aria-describedby="res-guests-hint"
            >
              ${GUESTS.map(
                (n) =>
                  html`<option value="${n}" ${n === DEFAULT_GUESTS && html`selected`}>
                    ${n}
                  </option>`,
              )}
            </select>
            <span class="field__hint" id="res-guests-hint"
              >${t.resLarge.replace('{n}', String(MAX_GUESTS))}</span
            >
          </div>
          <div class="field">
            <label class="field__label" for="res-notes">${t.resNotes}</label>
            <textarea
              class="field__input"
              id="res-notes"
              name="notes"
              rows="2"
              maxlength="160"
              aria-describedby="res-notes-hint"
            ></textarea>
            <span class="field__hint" id="res-notes-hint">${t.resNotesHint}</span>
          </div>

          <a
            class="pill pill--olive pill--lg reserve__send"
            href="${whatsappIntentLink('reservar', ctx.lang)}"
            target="_blank"
            rel="noopener"
            data-reserve-send
            data-event="whatsapp_clic"
            data-prop-intent="reservar"
            data-prop-origin="formulario"
            >${t.resSend}<span class="visually-hidden"> ${t.newTab}</span></a
          >
        </form>

        <div class="reserve__sent" data-reserve-sent hidden>
          <h2 class="reserve__sent-title" tabindex="-1" data-reserve-sent-title>${t.sentTitle}</h2>
          <p class="reserve__lead">${t.resSentText}</p>
          <button class="pill pill--outline" type="button" data-reserve-back>
            ${t.resSentBack}
          </button>
        </div>

        <p class="reserve__cross">
          <a
            href="${kindHref(ctx, 'carta', ctx.lang)}?pedido=domicilio"
            data-event="pedido_clic"
            data-prop-origin="reserva"
            >${t.crossToOrder}</a
          >
        </p>

        <noscript>
          <p class="reserve__lead">
            <a href="${whatsappIntentLink('reservar', ctx.lang)}">${t.waReservar}</a>
          </p>
        </noscript>
      </div>
    </main>
    <div class="brand-bar" aria-hidden="true"></div>
    ${footer(page)}`;
}

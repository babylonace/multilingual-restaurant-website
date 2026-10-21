import { html, type SafeHtml } from '../lib/html';
import { CONTACT, justEatLink, whatsappIntentLink } from './contact';
import type { Page } from './context';
import { brandIcon, uiIcon } from './icons';

export function footer(page: Page): SafeHtml {
  const { ctx, t } = page;
  return html`<footer class="footer">
    <div class="footer__inner container">
      <address class="footer__contact">
        <span class="footer__item"
          >${uiIcon('map-pin', 'icon icon--gold')}${CONTACT.streetAddress} ·
          ${CONTACT.locality}</span
        >
        <a
          class="footer__item"
          href="${whatsappIntentLink('consulta', ctx.lang)}"
          target="_blank"
          rel="noopener"
          data-event="whatsapp_clic"
          data-prop-intent="consulta"
        >
          ${brandIcon('whatsapp', 'icon icon--gold')}<span dir="ltr">${CONTACT.phoneDisplay}</span>
          <span class="visually-hidden">WhatsApp — ${t.newTab}</span>
        </a>
        <a
          class="footer__item"
          href="${CONTACT.directionsUrl}"
          target="_blank"
          rel="noopener"
          data-event="llegar_clic"
        >
          ${uiIcon('navigation', 'icon icon--gold')}${t.directions}
          <span class="visually-hidden">${t.newTab}</span>
        </a>
        <a
          class="footer__item"
          href="${justEatLink('pie')}"
          target="_blank"
          rel="noopener"
          data-event="justeat_clic"
          data-prop-location="pie"
        >
          ${t.justEat}
          <span class="visually-hidden">${t.newTab}</span>
        </a>
      </address>
      <ul class="footer__social">
        <li>
          <a
            class="social"
            href="${CONTACT.instagramUrl}"
            target="_blank"
            rel="noopener"
            aria-label="Instagram — ${t.newTab}"
            >${brandIcon('instagram', 'icon')}</a
          >
        </li>
        <li>
          <a
            class="social"
            href="${CONTACT.facebookUrl}"
            target="_blank"
            rel="noopener"
            aria-label="Facebook — ${t.newTab}"
            >${brandIcon('facebook', 'icon')}</a
          >
        </li>
      </ul>
      <nav class="footer__legal" aria-label="${t.legalNotice} · ${t.privacy}">
        <a href="${ctx.base}aviso-legal/" hreflang="es">${t.legalNotice}</a>
        <span aria-hidden="true">·</span>
        <a href="${ctx.base}privacidad/" hreflang="es">${t.privacy}</a>
      </nav>
    </div>
  </footer>`;
}

import { html, type SafeHtml } from '../lib/html';
import { CONTACT } from './contact';
import type { Page } from './context';
import { brandIcon, uiIcon } from './icons';

export function footer(page: Page): SafeHtml {
  const { t } = page;
  return html`<footer class="footer">
    <div class="footer__inner container">
      <address class="footer__contact">
        <span class="footer__item"
          >${uiIcon('map-pin', 'icon icon--gold')}${CONTACT.streetAddress} ·
          ${CONTACT.locality}</span
        >
        <span class="footer__sep" aria-hidden="true">·</span>
        <a class="footer__item" href="${CONTACT.whatsappUrl}" target="_blank" rel="noopener">
          ${brandIcon('whatsapp', 'icon icon--gold')}<span dir="ltr">${CONTACT.phoneDisplay}</span>
          <span class="visually-hidden">WhatsApp — ${t.newTab}</span>
        </a>
        <span class="footer__sep" aria-hidden="true">·</span>
        <a class="footer__item" href="${CONTACT.mapsUrl}" target="_blank" rel="noopener">
          ${uiIcon('navigation', 'icon icon--gold')}${t.directions}
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
    </div>
  </footer>`;
}

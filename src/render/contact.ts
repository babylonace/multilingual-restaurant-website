import type { LangCode } from '../data/types';
import type { WhatsappIntent } from '../data/whatsapp';
import { intentMessage, whatsappLink } from '../lib/whatsapp';

/** Business details shared by the footer, the legal pages and the structured data. */
export const CONTACT = {
  name: 'Inkawasi',
  streetAddress: 'Rúa Nova de Caranza, 88-90',
  /** Full address as written in contracts and notices. */
  fullAddress: 'Rúa Nova de Caranza, 88-90, bajo izquierdo, 15404 Ferrol (A Coruña)',
  postalCode: '15404',
  locality: 'Ferrol',
  region: 'A Coruña',
  country: 'ES',
  latitude: 43.4878407,
  longitude: -8.2178932,
  /** Cloudflare Email Routing forwards it to owner@example.com (docs/deployment.md). */
  email: 'contacto@inkawasi.es',
  phoneDisplay: '+34 614 92 21 83',
  phoneE164: '+34614922183',
  whatsappNumber: '34614922183',
  /** Place card on Google Maps: shows whether it is open now and the full opening hours. */
  mapsUrl: 'https://maps.app.goo.gl/xJ61NGccX21LAM6b9',
  /** Opens turn-by-turn directions to the door in the Google Maps app or site. */
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=43.4878407,-8.2178932',
  reviewUrl: 'https://g.page/r/CdLbyRjbHjW8EAE/review',
  tripadvisorReviewUrl: 'https://www.tripadvisor.com.pe/UserReviewEdit-d34747578?m=68676',
  tripadvisorUrl:
    'https://www.tripadvisor.com/Restaurant_Review-g642225-d34747578-Reviews-Inkawasi-Ferrol_Province_of_A_Coruna_Galicia.html',
  instagramUrl: 'https://www.instagram.com/inkawasi.ferrol',
  facebookUrl: 'https://www.facebook.com/share/18PNbdmeux/',
  justEatUrl: 'https://www.just-eat.es/restaurants-inkawasi-ferrol/menu',
} as const;

/** Where on the site a Just Eat link sits; it ends up in `utm_content` and in the click event. */
export type JustEatLocation = 'cabecera' | 'home' | 'carta' | 'pie';

export function justEatLink(location: JustEatLocation): string {
  const params = new URLSearchParams({
    utm_source: 'inkawasi.es',
    utm_medium: 'web',
    utm_campaign: 'pedido',
    utm_content: location,
  });
  return `${CONTACT.justEatUrl}?${params}`;
}

/** WhatsApp chat with the message of an intent already written. */
export function whatsappIntentLink(intent: WhatsappIntent, lang: LangCode): string {
  return whatsappLink(CONTACT.whatsappNumber, intentMessage(intent, lang));
}

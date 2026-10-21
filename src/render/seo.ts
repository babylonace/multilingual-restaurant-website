import { OPENING_HOURS } from '../data/hours';
import { LANGS } from '../data/langs';
import { BEERS, DISHES, SECTIONS, SOFT_DRINKS } from '../data/menu';
import type { DishId, FoodId } from '../data/types';
import { DEFAULT_LANG } from '../i18n';
import { html, raw, type SafeHtml } from '../lib/html';
import { CONTACT } from './contact';
import { langUrl, type Page } from './context';

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** schema.org has no `24:00`; midnight is `00:00`. */
const schemaTime = (time: string) => (time === '24:00' ? '00:00' : time);

const OG_LOCALE = {
  es: 'es_ES',
  en: 'en_GB',
  fr: 'fr_FR',
  it: 'it_IT',
  de: 'de_DE',
  pt: 'pt_PT',
  gl: 'gl_ES',
  ar: 'ar_AR',
  zh: 'zh_CN',
  ru: 'ru_RU',
} as const;

function offer(id: DishId) {
  return {
    '@type': 'Offer',
    price: (DISHES[id].priceCents / 100).toFixed(2),
    priceCurrency: 'EUR',
  };
}

function menuItem(page: Page, id: FoodId) {
  return {
    '@type': 'MenuItem',
    name: DISHES[id].name,
    description: page.locale.descriptions[id],
    offers: offer(id),
  };
}

/** schema.org Restaurant + Menu, so search engines can read the carta as data, not just as text. */
function structuredData(page: Page): unknown {
  const { t, ctx } = page;
  const sections = [
    ...SECTIONS.map((s) => ({
      '@type': 'MenuSection',
      name: t[s.id],
      hasMenuItem: s.dishes.map((id) => menuItem(page, id)),
    })),
    {
      '@type': 'MenuSection',
      name: t.bebidas,
      hasMenuItem: [...SOFT_DRINKS, ...BEERS].map((id) => ({
        '@type': 'MenuItem',
        name: DISHES[id].name,
        offers: offer(id),
      })),
    },
  ];
  const url = langUrl(ctx, ctx.lang);
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: CONTACT.name,
    servesCuisine: 'Peruvian',
    inLanguage: ctx.lang,
    ...(url && { url }),
    telephone: CONTACT.phoneE164,
    address: {
      '@type': 'PostalAddress',
      streetAddress: CONTACT.streetAddress,
      postalCode: CONTACT.postalCode,
      addressLocality: CONTACT.locality,
      addressRegion: CONTACT.region,
      addressCountry: CONTACT.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: CONTACT.latitude,
      longitude: CONTACT.longitude,
    },
    hasMap: CONTACT.mapsUrl,
    openingHoursSpecification: OPENING_HOURS.map((slot) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: slot.days.map((day) => DAY_NAMES[day - 1]),
      opens: schemaTime(slot.open),
      closes: schemaTime(slot.close),
    })),
    // Reservations are taken by phone and WhatsApp; there is no booking page to point to.
    acceptsReservations: true,
    sameAs: [CONTACT.instagramUrl, CONTACT.facebookUrl],
    hasMenu: { '@type': 'Menu', name: t.title, inLanguage: ctx.lang, hasMenuSection: sections },
  };
}

/** Escapes `<` so a `</script>` inside the data can never close the JSON-LD block. */
function jsonLd(data: unknown): SafeHtml {
  return raw(
    `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`,
  );
}

/** Social preview image: one language-neutral 1200×630 picture. Needs an absolute URL. */
export function ogImage({ ctx, t }: Page): SafeHtml | false {
  if (!ctx.siteUrl) return false;
  const url = `${ctx.siteUrl}${ctx.base}og-image.png`;
  return html`<meta property="og:image" content="${url}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${CONTACT.name} · ${t.eyebrow}" />
    <meta name="twitter:card" content="summary_large_image" />`;
}

export function head(page: Page): SafeHtml {
  const { t, ctx } = page;
  const canonical = langUrl(ctx, ctx.lang);

  return html`<title>${t.metaTitle}</title>
    <meta name="description" content="${t.metaDescription}" />
    <meta property="og:type" content="restaurant.menu" />
    <meta property="og:site_name" content="${CONTACT.name}" />
    <meta property="og:title" content="${t.metaTitle}" />
    <meta property="og:description" content="${t.metaDescription}" />
    <meta property="og:locale" content="${OG_LOCALE[ctx.lang]}" />
    ${ogImage(page)}
    ${
      canonical &&
      html`<link rel="canonical" href="${canonical}" />
        <meta property="og:url" content="${canonical}" />
        ${LANGS.map(
          (l) => html`<link rel="alternate" hreflang="${l.code}" href="${langUrl(ctx, l.code)}" />`,
        )}
        <link rel="alternate" hreflang="x-default" href="${langUrl(ctx, DEFAULT_LANG)}" />`
    }
    ${jsonLd(structuredData(page))}`;
}

import { LANGS } from '../data/langs';
import { BEERS, DISHES, SECTIONS, SOFT_DRINKS } from '../data/menu';
import type { DishId, FoodId } from '../data/types';
import { DEFAULT_LANG } from '../i18n';
import { escapeHtml, html, raw, type SafeHtml } from '../lib/html';
import { CONTACT } from './contact';
import { kindUrl, type Page } from './context';

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

function menuData(page: Page) {
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
  return { '@type': 'Menu', name: t.title, inLanguage: ctx.lang, hasMenuSection: sections };
}

/**
 * schema.org Restaurant. The carta page also carries the whole Menu as data; the home page
 * points at the carta instead. Opening hours are deliberately absent: Google Business Profile
 * is where they are kept, and the site links to it rather than repeating them.
 */
function structuredData(page: Page): unknown {
  const { ctx, kind } = page;
  const url = kindUrl(ctx, kind, ctx.lang);
  const cartaUrl = kindUrl(ctx, 'carta', ctx.lang);
  const image = ctx.siteUrl && new URL(ctx.pictures.cover.src, ctx.siteUrl).href;
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: CONTACT.name,
    servesCuisine: 'Peruvian',
    inLanguage: ctx.lang,
    ...(url && { url }),
    ...(image && { image }),
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
    // Reservations are taken by phone and WhatsApp; there is no booking page to point to.
    acceptsReservations: true,
    sameAs: [CONTACT.instagramUrl, CONTACT.facebookUrl, CONTACT.tripadvisorUrl],
    ...(kind === 'carta' ? { hasMenu: menuData(page) } : cartaUrl && { hasMenu: cartaUrl }),
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
  const url = `${ctx.siteUrl}${ctx.base}og-image.jpg`;
  return html`<meta property="og:image" content="${url}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${CONTACT.name} · ${t.eyebrow}" />
    <meta name="twitter:card" content="summary_large_image" />`;
}

/** One `hreflang` alternate, kept on a single line so it reads the same in every build. */
function alternate(hreflang: string, href: string | undefined): SafeHtml {
  return raw(`<link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href ?? '')}" />`);
}

export function head(page: Page): SafeHtml {
  const { t, ctx, kind } = page;
  const canonical = kindUrl(ctx, kind, ctx.lang);
  const title = {
    home: t.homeMetaTitle,
    carta: t.metaTitle,
    menu: `${t.menuDelDia} · ${CONTACT.name}`,
  }[kind];
  const description = {
    home: t.homeMetaDescription,
    carta: t.metaDescription,
    menu: t.mddMetaDescription,
  }[kind];

  return html`<title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="${kind === 'carta' ? 'restaurant.menu' : 'website'}" />
    <meta property="og:site_name" content="${CONTACT.name}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:locale" content="${OG_LOCALE[ctx.lang]}" />
    ${ogImage(page)}
    ${
      canonical &&
      html`<link rel="canonical" href="${canonical}" />
        <meta property="og:url" content="${canonical}" />
        ${LANGS.map((l) => alternate(l.code, kindUrl(ctx, kind, l.code)))}
        ${alternate('x-default', kindUrl(ctx, kind, DEFAULT_LANG))}`
    }
    ${jsonLd(structuredData(page))}`;
}

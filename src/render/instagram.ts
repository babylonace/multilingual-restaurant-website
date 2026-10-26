import { DISHES, FAVORITES } from '../data/menu';
import {
  FEED_DIR,
  IMAGE_DIR,
  IMAGE_FORMATS,
  IMAGE_WIDTHS,
  POST_COUNT,
  imageHeight,
  imageName,
  type InstagramPost,
} from '../data/instagram';
import { formatShortDate } from '../lib/format';
import { html, type SafeHtml } from '../lib/html';
import { CONTACT } from './contact';
import type { Page } from './context';
import { brandIcon, uiIcon } from './icons';
import { PLATE_SIZES, picture, pictureOf, type Picture } from './picture';

export const INSTAGRAM_HANDLE = '@inkawasi.ferrol';

/** 280 px in the swipe row of phones and tablets, a sixth of the 1100 px column from 900 px. */
const POST_SIZES = '(min-width: 1100px) 170px, (min-width: 900px) 16vw, 280px';

const TYPES = { avif: 'image/avif', webp: 'image/webp' } as const;

/** The copies written by scripts/instagram.ts, served from the site under `/instagram/img/`. */
function postPicture(base: string, post: InstagramPost, widths: number[]): Picture {
  const url = (width: number, format: (typeof IMAGE_FORMATS)[number]) =>
    `${base}${FEED_DIR}/${IMAGE_DIR}/${imageName(post.file, width, format)}`;
  const largest = widths.at(-1)!;
  return {
    src: url(largest, 'webp'),
    width: largest,
    height: imageHeight(largest),
    sources: IMAGE_FORMATS.map((format) => ({
      type: TYPES[format],
      srcset: widths.map((w) => `${url(w, format)} ${w}w`).join(', '),
    })),
  };
}

interface Tile {
  href: string;
  picture: Picture;
  sizes: string;
  badge?: SafeHtml;
  /** The small line under the photo: date and kind of post ("25 oct · Reel"). */
  meta: SafeHtml;
  /**
   * Under it: the start of the post's text, or the dish of a fallback tile. Always Spanish, so the
   * clamped box itself carries `lang` and `dir`: on the Arabic page the cut and its ellipsis
   * then fall at the end of the Spanish line, not at its start.
   */
  caption?: string;
  /** Only for screen readers, after the visible text; the photo itself has an empty alt. */
  details?: SafeHtml;
  location: 'post' | 'reserva';
}

function postTile(page: Page, post: InstagramPost): Tile {
  const { ctx, t } = page;
  const kind = post.kind === 'video' ? t.igReel : post.kind === 'carousel' ? t.igCarousel : '';
  // The year only for posts from another year than the latest read, so the line stays short.
  const fetched = ctx.instagram?.fetchedAt ?? post.timestamp;
  const date = formatShortDate(
    post.timestamp,
    ctx.lang,
    post.timestamp.slice(0, 4) !== fetched.slice(0, 4),
  );
  return {
    href: post.permalink,
    picture: postPicture(ctx.base, post, ctx.instagram?.widths ?? [...IMAGE_WIDTHS]),
    sizes: POST_SIZES,
    badge:
      post.kind === 'image'
        ? undefined
        : uiIcon(post.kind === 'video' ? 'play' : 'copy', 'insta__icon'),
    // The text comes from the post, in Spanish, whatever the page language.
    meta: html`<time datetime="${post.timestamp}">${date}</time>${kind && html` · ${kind}`}`,
    caption: post.label || undefined,
    details: post.label ? undefined : html`${t.igPost}`,
    location: 'post',
  };
}

/** Until there are posts (tests, previews, a new account): the favourites, linked to the profile. */
function reserveTile(page: Page, index: number): Tile | undefined {
  const favourite = FAVORITES[index % FAVORITES.length];
  if (!favourite) return undefined;
  return {
    href: CONTACT.instagramUrl,
    picture: pictureOf(page.ctx.pictures, favourite.image),
    // Same as the favourites section above, so the browser reuses the file it already has.
    sizes: PLATE_SIZES,
    meta: html`Instagram`,
    caption: DISHES[favourite.dish].name,
    details: html`${page.t.igProfile}`,
    location: 'reserva',
  };
}

/** Always `POST_COUNT` tiles: the latest posts, topped up with the favourites if there are fewer. */
function tiles(page: Page): Tile[] {
  const posts = (page.ctx.instagram?.posts ?? [])
    .slice(0, POST_COUNT)
    .map((p) => postTile(page, p));
  const reserve = Array.from({ length: POST_COUNT - posts.length }, (_, i) => reserveTile(page, i));
  return [...posts, ...reserve.filter((tile): tile is Tile => tile !== undefined)];
}

/**
 * "Novedades": the six latest Instagram posts, each photo with the start of its text and linking
 * to the post, and a way to follow the account. The images are served from the site itself: no
 * embed, no script, nothing from Meta. The text is cleaned of emoji and hashtags and cut to three
 * lines, to make people want to open the post.
 */
export function instagramSection(page: Page): SafeHtml {
  const { t } = page;
  return html`<section class="insta" aria-labelledby="insta-title">
    <div class="insta__inner">
      <div class="insta__head">
        <h2 class="section-heading" id="insta-title">${t.igTitle}</h2>
        <a
          class="insta__handle"
          href="${CONTACT.instagramUrl}"
          target="_blank"
          rel="noopener"
          data-event="instagram_clic"
          data-prop-location="usuario"
          dir="ltr"
          >${INSTAGRAM_HANDLE}<span class="visually-hidden"> ${t.newTab}</span></a
        >
      </div>
      <ul class="insta__grid">
        ${tiles(page).map(
          (tile) =>
            html`<li>
              <a
                class="insta__post"
                href="${tile.href}"
                target="_blank"
                rel="noopener"
                data-event="instagram_clic"
                data-prop-location="${tile.location}"
              >
                <span class="insta__frame">
                  ${picture(tile.picture, {
                    class: 'insta__img',
                    alt: '',
                    sizes: tile.sizes,
                    loading: 'lazy',
                  })}
                  ${tile.badge && html`<span class="insta__badge">${tile.badge}</span>`}
                </span>
                <span class="insta__meta">${tile.meta}</span>
                ${tile.caption && html`<span class="insta__caption" lang="es" dir="auto">${tile.caption}</span>`}
                <span class="visually-hidden"
                  >${tile.details && html`, ${tile.details}`} ${t.newTab}</span
                >
              </a>
            </li>`,
        )}
      </ul>
      <p class="insta__follow">
        <a
          class="pill pill--cream"
          href="${CONTACT.instagramUrl}"
          target="_blank"
          rel="noopener"
          data-event="instagram_clic"
          data-prop-location="seguir"
          >${brandIcon('instagram', 'pill__icon')}${t.igFollow}<span class="visually-hidden">
            ${t.newTab}</span
          ></a
        >
      </p>
    </div>
  </section>`;
}

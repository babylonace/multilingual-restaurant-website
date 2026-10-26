/**
 * The Instagram section of the home page: the latest posts of @inkawasi.ferrol.
 *
 * A daily build (scripts/instagram.ts, run by .github/workflows/contenido.yml) reads them from
 * the Instagram API with Instagram login, keeps the newest six, crops each photo to 4:5 and
 * writes AVIF and WebP copies plus `feed.json` to `public/instagram/`, so they are served from
 * the site itself and the browser never contacts Meta. Without that folder (tests, CI, branch
 * previews) the section shows the house favourites, linked to the profile, so it always has six
 * images. Everything here is pure: the script, the build and the tests share it.
 */

/** How many posts the section shows. */
export const POST_COUNT = 6;

/** At most this many posts of the menú del día, so the daily menu cannot fill the section. */
export const MAX_MENU_POSTS = 1;

/**
 * Widths of the copies a new feed gets, in px. A post is about 280 px wide in the phone's swipe
 * row (720 covers a 2.6× screen) and about 170 px in the desktop row.
 */
export const IMAGE_WIDTHS = [240, 360, 480, 720] as const;

/** Feeds written before the swipe row (26 October 2026) have no `widths`: they had these. */
export const LEGACY_WIDTHS = [240, 360, 480] as const;

/** Every copy is cropped to 4:5, the shape of a post in the Instagram feed. */
export function imageHeight(width: number): number {
  return Math.round((width * 5) / 4);
}

export const IMAGE_FORMATS = ['avif', 'webp'] as const;

export type ImageFormat = (typeof IMAGE_FORMATS)[number];

/** Folder under `public/` and under the site root. */
export const FEED_DIR = 'instagram';

/** The feed, at `/instagram/feed.json`: the next build compares against it or falls back to it. */
export const FEED_FILE = 'feed.json';

/** The images, at `/instagram/img/…`, apart from the feed so each can have its own caching. */
export const IMAGE_DIR = 'img';

/** File name of one copy: `<file>-<width>.<format>`, inside `IMAGE_DIR`. */
export function imageName(file: string, width: number, format: ImageFormat): string {
  return `${file}-${width}.${format}`;
}

/** A video is shown with its cover and a play badge; an album with a "several photos" badge. */
export type PostKind = 'image' | 'video' | 'carousel';

export interface InstagramPost {
  id: string;
  /** The post on instagram.com. */
  permalink: string;
  kind: PostKind;
  /** ISO 8601, UTC. */
  timestamp: string;
  /** Start of the post's text, cleaned (no emoji, hashtags or line breaks), shown under the photo; may be empty. */
  label: string;
  /** Marked as a post of the menú del día. */
  menu: boolean;
  /** Base name of the image copies: `<id>-<first 10 hex digits of the source's SHA-256>`. */
  file: string;
}

export interface InstagramFeed {
  version: 1;
  /** When the posts were read from Instagram, ISO 8601. */
  fetchedAt: string;
  /** Newest first, between 1 and `POST_COUNT`. */
  posts: InstagramPost[];
  /**
   * Widths of this feed's copies, ascending. Stored with the feed, so a build can serve the posts
   * already published even after `IMAGE_WIDTHS` changes, until the next daily run rewrites them.
   */
  widths: number[];
}

/** A post read from the API, before its image is downloaded. */
export interface Candidate extends Omit<InstagramPost, 'file'> {
  /** Where Meta serves the photo (or the video's cover). Used at build time only. */
  imageUrl: string;
}

const LABEL_MAX = 140;

/**
 * The start of a post's text, fit to show under its photo and to name its link: emoji, hashtags,
 * mentions, links and line breaks out (the design system has no emoji, and a screen reader would
 * spell them all out), cut at a word near 140 characters.
 */
export function cleanLabel(text: string): string {
  const cleaned = text
    .normalize('NFC')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/@[\p{L}\p{N}_.]+/gu, ' ')
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}]/gu, ' ')
    .replace(/\u200D|\uFE0E|\uFE0F|\u20E3/g, '')
    // "<3" and the like: escaped anyway, but the feed check refuses angle brackets outright.
    .replace(/[<>]/g, ' ')
    // A line that ends without punctuation before one that starts a new sentence ("\u2026en Ferrol"
    // then "Direcci\u00F3n: \u2026"): keep them apart with a full stop once the lines are joined.
    .replace(
      /([^\s.,;:!?\u2026\u00B7|\-\u2013\u2014])[ \t]*\n\s*(?=[\p{Lu}\u00A1\u00BF])/gu,
      '$1. ',
    )
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?)»])/g, '$1')
    .replace(/^[\s.,;:·|\-–—]+|[\s,;:·|\-–—]+$/g, '');
  if (cleaned.length <= LABEL_MAX) return cleaned;
  const cut = cleaned.slice(0, LABEL_MAX);
  const space = cut.lastIndexOf(' ');
  return `${(space > LABEL_MAX / 2 ? cut.slice(0, space) : cut).replace(/[\s.,;:·|\-–—]+$/, '')}…`;
}

/**
 * A post of the menú del día: `#menudeldia` in its caption or alt text, with or without accents
 * or capitals. Only the hashtag: a post that just mentions the menu ("pregunta por el menú del
 * día") is not one.
 */
export function isMenuText(text: string): boolean {
  const plain = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return /#menudeldia(?![\p{L}\p{N}_])/u.test(plain);
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/** `https://www.instagram.com/p/…/` without its query string, or undefined for anything else. */
function instagramUrl(value: unknown): string | undefined {
  const text = str(value);
  if (!text) return undefined;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || url.hostname !== 'www.instagram.com') return undefined;
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

/** Meta writes `2026-10-20T12:34:56+0000`; returns it as ISO 8601, or undefined. */
function isoTime(value: unknown): string | undefined {
  const text = str(value)?.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const time = text ? Date.parse(text) : NaN;
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}

/** Image of a media object: the photo itself, or the cover of a video. */
function imageOf(media: Record<string, unknown>): string | undefined {
  if (media.media_type === 'IMAGE') return str(media.media_url);
  if (media.media_type === 'VIDEO') return str(media.thumbnail_url);
  return undefined;
}

const KINDS: Record<string, PostKind> = {
  IMAGE: 'image',
  VIDEO: 'video',
  CAROUSEL_ALBUM: 'carousel',
};

/**
 * The posts of a `GET /me/media` answer that can be shown, newest first. Skipped: anything
 * without an id, link or date, and videos or albums without an image. A video with licensed
 * music comes without `media_url` (Meta says to treat it as optional): its cover is enough.
 */
export function toCandidates(response: unknown): Candidate[] {
  const data = (response as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];
  const candidates: Candidate[] = [];
  for (const item of data as Record<string, unknown>[]) {
    if (!item || typeof item !== 'object') continue;
    const id = str(item.id);
    const kind = KINDS[String(item.media_type)];
    const permalink = instagramUrl(item.permalink);
    const timestamp = isoTime(item.timestamp);
    if (!id || !/^\d{1,30}$/.test(id) || !kind || !permalink || !timestamp) continue;
    let imageUrl = imageOf(item);
    if (kind === 'carousel') {
      const children = (item.children as { data?: unknown } | undefined)?.data;
      const first = Array.isArray(children)
        ? (children as Record<string, unknown>[]).map(imageOf).find(Boolean)
        : undefined;
      imageUrl = first ?? str(item.media_url);
    }
    if (!imageUrl) continue;
    const caption = str(item.caption) ?? '';
    const altText = str(item.alt_text) ?? '';
    candidates.push({
      id,
      permalink,
      kind,
      timestamp,
      label: cleanLabel(caption) || cleanLabel(altText),
      menu: isMenuText(caption) || isMenuText(altText),
      imageUrl,
    });
  }
  return candidates.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/**
 * Walks the candidates newest first and keeps the first `POST_COUNT` whose image could be
 * processed, with at most `MAX_MENU_POSTS` of the menú del día. `process` turns a candidate into
 * its image base name, or returns undefined (bad download, not an image) to skip it.
 */
export async function pickPosts(
  candidates: Candidate[],
  process: (candidate: Candidate) => Promise<string | undefined>,
): Promise<InstagramPost[]> {
  const posts: InstagramPost[] = [];
  let menus = 0;
  for (const candidate of candidates) {
    if (posts.length === POST_COUNT) break;
    if (candidate.menu && menus >= MAX_MENU_POSTS) continue;
    const file = await process(candidate);
    if (!file) continue;
    if (candidate.menu) menus++;
    const { id, permalink, kind, timestamp, label, menu } = candidate;
    posts.push({ id, permalink, kind, timestamp, label, menu, file });
  }
  return posts;
}

const FILE_PATTERN = /^(\d{1,30})-[0-9a-f]{10}$/;

/**
 * Validates a feed: the one this build wrote, or the one published on the live site, which the
 * next build downloads when Instagram does not answer. Anything unexpected throws, so a tampered
 * or truncated file never reaches a page.
 */
export function parseFeed(json: unknown): InstagramFeed {
  const feed = json as Partial<InstagramFeed> | null;
  if (!feed || typeof feed !== 'object' || feed.version !== 1) {
    throw new Error('instagram feed: unknown version');
  }
  const fetchedAt = isoTime(feed.fetchedAt);
  if (!fetchedAt) throw new Error('instagram feed: bad "fetchedAt"');
  if (!Array.isArray(feed.posts) || feed.posts.length < 1 || feed.posts.length > POST_COUNT) {
    throw new Error(`instagram feed: needs 1 to ${POST_COUNT} posts`);
  }
  const widths: unknown = feed.widths ?? [...LEGACY_WIDTHS];
  const known: readonly number[] = IMAGE_WIDTHS;
  if (
    !Array.isArray(widths) ||
    widths.length < 1 ||
    !widths.every((w, i) => known.includes(w) && (i === 0 || w > widths[i - 1]))
  ) {
    throw new Error('instagram feed: bad "widths"');
  }
  const seen = new Set<string>();
  const posts = feed.posts.map((raw, index): InstagramPost => {
    const p = raw as Partial<Record<keyof InstagramPost, unknown>>;
    const where = `instagram feed: post ${index}`;
    const id = str(p.id);
    if (!id || !/^\d{1,30}$/.test(id) || seen.has(id)) throw new Error(`${where}: bad id`);
    seen.add(id);
    const permalink = instagramUrl(p.permalink);
    if (!permalink || permalink !== p.permalink) throw new Error(`${where}: bad permalink`);
    const kind = Object.values(KINDS).find((k) => k === p.kind);
    if (!kind) throw new Error(`${where}: bad kind`);
    const timestamp = isoTime(p.timestamp);
    if (!timestamp) throw new Error(`${where}: bad timestamp`);
    if (typeof p.label !== 'string' || p.label.length > LABEL_MAX + 1 || /[<>]/.test(p.label)) {
      throw new Error(`${where}: bad label`);
    }
    if (typeof p.menu !== 'boolean') throw new Error(`${where}: bad menu flag`);
    const file = str(p.file);
    if (!file || FILE_PATTERN.exec(file)?.[1] !== id) throw new Error(`${where}: bad file`);
    return { id, permalink, kind, timestamp, label: p.label, menu: p.menu, file };
  });
  if (posts.filter((p) => p.menu).length > MAX_MENU_POSTS) {
    throw new Error('instagram feed: too many posts of the menú del día');
  }
  return { version: 1, fetchedAt, posts, widths: widths as number[] };
}

/** Same posts, same images and same widths: nothing to deploy. */
export function samePosts(a: InstagramFeed, b: InstagramFeed): boolean {
  const key = (feed: InstagramFeed) =>
    JSON.stringify(
      feed.posts.map(({ id, permalink, kind, label, menu, file }) => [
        id,
        permalink,
        kind,
        label,
        menu,
        file,
      ]),
    ) + feed.widths.join();
  return key(a) === key(b);
}

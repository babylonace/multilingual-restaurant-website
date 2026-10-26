/**
 * Fills `public/instagram/` with the latest posts of @inkawasi.ferrol (see src/data/instagram.ts).
 *
 *   npm run instagram                      Reads the posts from the Instagram API. Needs the
 *                                          INSTAGRAM_TOKEN environment variable (never a file).
 *   npm run instagram -- --publicado       Copies the posts already live on SITE_URL (default
 *                                          https://inkawasi.es), so a deploy from a push keeps
 *                                          them. Never calls Meta; on any doubt it leaves the
 *                                          folder empty and the page falls back to the favourites.
 *   npm run instagram -- --renovar --salida <archivo>
 *                                          Renews the token and writes the new one to that file,
 *                                          for the workflow to store as a secret. Prints nothing
 *                                          of it.
 *
 * Exit codes, read by .github/workflows/contenido.yml: 0 done, 2 Meta did not answer (try again
 * tomorrow), 3 the token is refused (a person has to generate a new one), 4 anything else.
 * The token never appears in a log or an error message: URLs that carry it are never printed.
 */
import { createHash } from 'node:crypto';
import { appendFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import {
  FEED_DIR,
  FEED_FILE,
  IMAGE_DIR,
  IMAGE_FORMATS,
  IMAGE_WIDTHS,
  imageHeight,
  imageName,
  parseFeed,
  pickPosts,
  samePosts,
  toCandidates,
  type Candidate,
  type InstagramFeed,
} from '../src/data/instagram';

/** Pinned so a new Graph API version cannot change the answers under us. */
export const API = 'https://graph.instagram.com/v26.0';

/** Enough posts to find six usable ones, even after skipping old menus of the day. */
const MEDIA_LIMIT = 25;

const CHILD_FIELDS = 'children{media_type,media_url,thumbnail_url}';
const BASE_FIELDS = `id,media_type,media_url,thumbnail_url,permalink,timestamp,alt_text,${CHILD_FIELDS}`;

/** Photos straight from Meta's CDN; anything bigger is not a post photo. */
const SOURCE_MAX_BYTES = 15 * 1024 * 1024;
const SOURCE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SOURCE_HOSTS = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/;

/** Our own copies, as published: a 480 px AVIF or WebP is about 20 KB. */
const COPY_MAX_BYTES = 300 * 1024;

const TIMEOUT_MS = 20_000;

export const DEFAULT_ORIGIN = 'https://inkawasi.es';

export type FailureKind = 'transient' | 'auth' | 'fatal';

export class InstagramError extends Error {
  constructor(
    message: string,
    readonly kind: FailureKind,
  ) {
    super(message);
  }
}

export const EXIT_CODES: Record<FailureKind, number> = { transient: 2, auth: 3, fatal: 4 };

type Fetch = typeof fetch;

/** Graph API error codes: 190 bad or expired token, 10 and 200–299 missing permission. */
function isAuthCode(code: number): boolean {
  return code === 190 || code === 10 || (code >= 200 && code < 300);
}

/** Throttling and temporary errors: 1, 2, 4, 17, 32, 341 and 613. */
const TRANSIENT_CODES = new Set([1, 2, 4, 17, 32, 341, 613]);

interface GraphError {
  message?: string;
  code?: number;
}

/** GET on the Graph API with the token as a query parameter, as Meta documents it. */
async function graphGet(
  path: string,
  params: Record<string, string>,
  token: string,
  fetchFn: Fetch,
): Promise<unknown> {
  const url = new URL(`${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('access_token', token);
  let response: Response;
  try {
    response = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    throw new InstagramError(`Instagram did not answer (${(error as Error).name})`, 'transient');
  }
  const body = (await response.json().catch(() => undefined)) as { error?: GraphError } | undefined;
  if (response.ok && body && !body.error) return body;
  const code = body?.error?.code ?? 0;
  // Meta's messages never contain the token, but redact it anyway in case one ever echoes it.
  const message = `${body?.error?.message ?? 'no error message'}`.replaceAll(token, '[token]');
  const detail = `Instagram answered ${response.status}, code ${code}: ${message}`;
  if (response.status === 401 || response.status === 403 || isAuthCode(code)) {
    throw new InstagramError(detail, 'auth');
  }
  if (response.status >= 500 || response.status === 429 || TRANSIENT_CODES.has(code)) {
    throw new InstagramError(detail, 'transient');
  }
  throw new InstagramError(detail, 'fatal');
}

/**
 * The account's latest media. Meta documents `caption` only for the Facebook-login API; if this
 * API refuses the field (code 100), asks again without it and goes by the alt text alone.
 */
export async function fetchMedia(token: string, fetchFn: Fetch = fetch): Promise<unknown> {
  const params = (fields: string) => ({ fields, limit: String(MEDIA_LIMIT) });
  try {
    return await graphGet(`${API}/me/media`, params(`caption,${BASE_FIELDS}`), token, fetchFn);
  } catch (error) {
    if (
      error instanceof InstagramError &&
      error.kind === 'fatal' &&
      /code 100\b/.test(error.message)
    ) {
      console.warn('Instagram refused the caption field; reading the posts without it.');
      return graphGet(`${API}/me/media`, params(BASE_FIELDS), token, fetchFn);
    }
    throw error;
  }
}

/**
 * Renews a long-lived token (it must be at least 24 hours old and not expired). The new one is
 * valid for another 60 days.
 */
export async function refreshToken(
  token: string,
  fetchFn: Fetch = fetch,
): Promise<{ token: string; expiresIn: number }> {
  const body = (await graphGet(
    'https://graph.instagram.com/refresh_access_token',
    { grant_type: 'ig_refresh_token' },
    token,
    fetchFn,
  )) as { access_token?: unknown; expires_in?: unknown };
  if (typeof body.access_token !== 'string' || body.access_token.length < 20) {
    throw new InstagramError('Instagram returned no new token', 'fatal');
  }
  return {
    token: body.access_token,
    expiresIn: typeof body.expires_in === 'number' ? body.expires_in : 0,
  };
}

/** Downloads a file, refusing other types and anything over `maxBytes`. */
async function download(
  url: string,
  fetchFn: Fetch,
  types: string[],
  maxBytes: number,
): Promise<Buffer> {
  const response = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
  if (!types.includes(type)) throw new Error(`unexpected type "${type}"`);
  if (Number(response.headers.get('content-length') ?? 0) > maxBytes) throw new Error('too big');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxBytes) throw new Error('too big');
  return bytes;
}

/**
 * Crops a photo to 4:5 around its centre and writes every width in AVIF and WebP. Metadata
 * (EXIF, location) is dropped. Returns the base name of the copies.
 */
export async function writeCopies(source: Buffer, id: string, imageDir: string): Promise<string> {
  const file = `${id}-${createHash('sha256').update(source).digest('hex').slice(0, 10)}`;
  const image = sharp(source, { limitInputPixels: 60_000_000, failOn: 'error' }).rotate();
  for (const width of IMAGE_WIDTHS) {
    const resized = image
      .clone()
      .resize(width, imageHeight(width), { fit: 'cover', position: 'centre' });
    await resized
      .clone()
      .avif({ quality: 55 })
      .toFile(join(imageDir, imageName(file, width, 'avif')));
    await resized
      .clone()
      .webp({ quality: 72 })
      .toFile(join(imageDir, imageName(file, width, 'webp')));
  }
  return file;
}

/** Writes into a fresh folder next to `outDir` and swaps it in only when everything is there. */
async function replaceFolder(
  outDir: string,
  fill: (imageDir: string) => Promise<InstagramFeed>,
): Promise<InstagramFeed> {
  const tmp = `${outDir}.tmp`;
  await rm(tmp, { recursive: true, force: true });
  await mkdir(join(tmp, IMAGE_DIR), { recursive: true });
  try {
    const feed = await fill(join(tmp, IMAGE_DIR));
    await writeFile(join(tmp, FEED_FILE), `${JSON.stringify(feed, null, 2)}\n`);
    // Only the current posts survive: older images go with the old folder (Meta's terms ask to
    // keep platform data no longer than needed).
    await rm(outDir, { recursive: true, force: true });
    await rename(tmp, outDir);
    return feed;
  } catch (error) {
    await rm(tmp, { recursive: true, force: true });
    throw error;
  }
}

/** Reads the posts from Instagram and writes them, with their images, to `outDir`. */
export async function buildFromApi(options: {
  token: string;
  outDir: string;
  fetchFn?: Fetch;
  now?: Date;
}): Promise<InstagramFeed> {
  const fetchFn = options.fetchFn ?? fetch;
  const candidates = toCandidates(await fetchMedia(options.token, fetchFn));
  return replaceFolder(options.outDir, async (imageDir) => {
    const process = async (candidate: Candidate) => {
      try {
        const host = new URL(candidate.imageUrl).hostname;
        if (!SOURCE_HOSTS.test(host)) throw new Error(`unexpected host ${host}`);
        const source = await download(candidate.imageUrl, fetchFn, SOURCE_TYPES, SOURCE_MAX_BYTES);
        return await writeCopies(source, candidate.id, imageDir);
      } catch (error) {
        // The image URL is signed by Meta but carries no token of ours: the id is enough here.
        console.warn(`Skipping post ${candidate.id}: ${(error as Error).message}`);
        return undefined;
      }
    };
    const posts = await pickPosts(candidates, process);
    if (posts.length === 0) throw new InstagramError('No post with a usable image', 'fatal');
    return {
      version: 1,
      fetchedAt: (options.now ?? new Date()).toISOString(),
      posts,
      widths: [...IMAGE_WIDTHS],
    };
  });
}

/** The feed live on `origin`, validated, or undefined if there is none or it does not pass. */
export async function fetchPublishedFeed(
  origin: string,
  fetchFn: Fetch = fetch,
): Promise<InstagramFeed | undefined> {
  try {
    const response = await fetchFn(`${origin}/${FEED_DIR}/${FEED_FILE}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return undefined;
    return parseFeed(await response.json());
  } catch (error) {
    console.warn(`The published feed on ${origin} is not usable: ${(error as Error).message}`);
    return undefined;
  }
}

const COPY_TYPES: Record<string, { type: string; format: string }> = {
  avif: { type: 'image/avif', format: 'heif' },
  webp: { type: 'image/webp', format: 'webp' },
};

/**
 * Copies the posts live on `origin` to `outDir`, checking that every image is a real AVIF or WebP
 * of the expected size. Any problem leaves `outDir` empty: the page then shows the favourites.
 */
export async function recoverPublished(options: {
  origin: string;
  outDir: string;
  fetchFn?: Fetch;
}): Promise<InstagramFeed | undefined> {
  const fetchFn = options.fetchFn ?? fetch;
  const published = await fetchPublishedFeed(options.origin, fetchFn);
  if (!published) {
    await rm(options.outDir, { recursive: true, force: true });
    return undefined;
  }
  try {
    return await replaceFolder(options.outDir, async (imageDir) => {
      for (const post of published.posts) {
        for (const width of published.widths) {
          for (const ext of IMAGE_FORMATS) {
            const name = imageName(post.file, width, ext);
            const expected = COPY_TYPES[ext]!;
            const url = `${options.origin}/${FEED_DIR}/${IMAGE_DIR}/${name}`;
            const bytes = await download(url, fetchFn, [expected.type], COPY_MAX_BYTES);
            const meta = await sharp(bytes).metadata();
            if (
              meta.format !== expected.format ||
              meta.width !== width ||
              meta.height !== imageHeight(width)
            ) {
              throw new Error(`${name} is not a ${width} px ${ext}`);
            }
            await writeFile(join(imageDir, name), bytes);
          }
        }
      }
      return published;
    });
  } catch (error) {
    console.warn(`Could not copy the published posts: ${(error as Error).message}`);
    await rm(options.outDir, { recursive: true, force: true });
    return undefined;
  }
}

function summary(feed: InstagramFeed): string {
  const menus = feed.posts.filter((p) => p.menu).length;
  return `${feed.posts.length} posts (${menus} of the menú del día)`;
}

/** A step output for GitHub Actions. Does nothing elsewhere. */
async function output(name: string, value: string, env: NodeJS.ProcessEnv): Promise<void> {
  if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

export async function main(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
  fetchFn: Fetch = fetch,
): Promise<number> {
  const outDir = resolve('public', FEED_DIR);
  const origin = env.SITE_URL?.trim().replace(/\/+$/, '') || DEFAULT_ORIGIN;
  try {
    if (argv.includes('--publicado')) {
      const feed = await recoverPublished({ origin, outDir, fetchFn });
      console.log(
        feed
          ? `Copied the published Instagram posts from ${origin}: ${summary(feed)}.`
          : 'No usable published posts: the page will show the favourites.',
      );
      return 0;
    }

    const token = env.INSTAGRAM_TOKEN?.trim();
    if (!token) throw new InstagramError('INSTAGRAM_TOKEN is not set', 'auth');

    if (argv.includes('--renovar')) {
      const target = argv[argv.indexOf('--salida') + 1];
      if (!argv.includes('--salida') || !target) {
        throw new InstagramError('--renovar needs --salida <file>', 'fatal');
      }
      const renewed = await refreshToken(token, fetchFn);
      // Masked before anything else can print it.
      if (env.GITHUB_ACTIONS) console.log(`::add-mask::${renewed.token}`);
      await writeFile(target, renewed.token, { mode: 0o600 });
      const days = Math.floor(renewed.expiresIn / 86_400);
      console.log(`Token renewed${days ? `, valid for ${days} days` : ''}.`);
      return 0;
    }

    const feed = await buildFromApi({ token, outDir, fetchFn });
    const published = await fetchPublishedFeed(origin, fetchFn);
    const changed = !published || !samePosts(feed, published);
    await output('changed', String(changed), env);
    console.log(`Read ${summary(feed)} from Instagram; ${changed ? 'new' : 'same as'} ${origin}.`);
    return 0;
  } catch (error) {
    const kind = error instanceof InstagramError ? error.kind : 'fatal';
    console.error(`Instagram (${kind}): ${(error as Error).message}`);
    return EXIT_CODES[kind];
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}

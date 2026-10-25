import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IMAGE_FORMATS,
  IMAGE_WIDTHS,
  cleanLabel,
  imageHeight,
  imageName,
  isMenuText,
  parseFeed,
  pickPosts,
  samePosts,
  toCandidates,
  type Candidate,
  type InstagramFeed,
} from '../../src/data/instagram';
import { loadInstagram } from '../../src/lib/instagram';
import {
  API,
  buildFromApi,
  fetchMedia,
  main,
  recoverPublished,
  refreshToken,
  type InstagramError,
} from '../../scripts/instagram';
import { TEST_FEED } from './fixtures';

const TOKEN = 'IGAAtest-token-that-must-never-be-printed-1234567890';

/** One media object as `GET /me/media` returns it. */
function media(i: number, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `1790000000000000${i}`,
    media_type: 'IMAGE',
    media_url: `https://scontent.cdninstagram.com/v/photo${i}.jpg?sig=abc`,
    permalink: `https://www.instagram.com/p/POST${i}/?utm_source=ig_web`,
    timestamp: `2026-10-${String(23 - i).padStart(2, '0')}T12:00:00+0000`,
    caption: `Foto ${i} #peru`,
    ...extra,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

let jpeg: Buffer;

/** A fake of everything the script fetches: the Graph API, Meta's CDN and the live site. */
function fakeFetch(routes: Record<string, () => Response | Promise<Response>>) {
  const calls: string[] = [];
  const fn = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    calls.push(url.toString());
    // The most specific route wins.
    const key = Object.keys(routes)
      .filter((k) => `${url.origin}${url.pathname}`.startsWith(k))
      .sort((a, b) => b.length - a.length)[0];
    if (!key) return new Response('not found', { status: 404 });
    return routes[key]!();
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

function image(bytes: Buffer, type = 'image/jpeg'): Response {
  return new Response(new Uint8Array(bytes), { headers: { 'content-type': type } });
}

beforeEach(async () => {
  jpeg ??= await sharp({
    create: { width: 1080, height: 1350, channels: 3, background: { r: 209, g: 158, b: 43 } },
  })
    .jpeg()
    .toBuffer();
});

describe('cleanLabel', () => {
  it('drops emoji, hashtags, mentions, links and line breaks', () => {
    expect(
      cleanLabel(
        '¡Hoy ceviche! 🐟🍋\n\nVen a probarlo 👉 @inkawasi.ferrol #ceviche #ferrol https://x.y/z',
      ),
    ).toBe('¡Hoy ceviche! Ven a probarlo');
  });

  it('removes skin tones, joiners and keycaps, and angle brackets', () => {
    expect(cleanLabel('Gracias 👍🏽 familia 👨‍👩‍👧 1️⃣ <3')).toBe('Gracias familia 1 3');
  });

  it('cuts long captions at a word, with an ellipsis', () => {
    const label = cleanLabel(`${'palabra '.repeat(40)}final`);
    expect(label.length).toBeLessThanOrEqual(141);
    expect(label.endsWith('palabra…')).toBe(true);
  });

  it('leaves nothing when there is only decoration', () => {
    expect(cleanLabel('🔥🔥 #inkawasi')).toBe('');
  });
});

describe('isMenuText', () => {
  it.each(['#menudeldia', '#MenúDelDía de hoy', 'Hoy: ceviche. #menudeldia #ferrol'])(
    'spots "%s"',
    (text) => expect(isMenuText(text)).toBe(true),
  );

  it.each([
    'Ceviche del día, en la carta',
    // A real post of the account: it mentions the menu but is not one.
    '¡Pide tu sello con nosotros! Y no olvides preguntar por el menú del día',
    '#menudeldiasiguiente',
  ])('ignores "%s"', (text) => expect(isMenuText(text)).toBe(false));
});

describe('toCandidates', () => {
  it('reads photos, videos by their cover and albums by their first image, newest first', () => {
    const candidates = toCandidates({
      data: [
        media(2, {
          media_type: 'VIDEO',
          media_url: undefined,
          thumbnail_url: 'https://scontent.cdninstagram.com/v/cover.jpg',
        }),
        media(1),
        media(3, {
          media_type: 'CAROUSEL_ALBUM',
          media_url: undefined,
          children: {
            data: [
              {
                media_type: 'VIDEO',
                thumbnail_url: 'https://scontent.cdninstagram.com/v/child-cover.jpg',
              },
            ],
          },
        }),
      ],
    });
    expect(candidates.map((c) => [c.id.at(-1), c.kind])).toEqual([
      ['1', 'image'],
      ['2', 'video'],
      ['3', 'carousel'],
    ]);
    expect(candidates[1]!.imageUrl).toContain('cover.jpg');
    expect(candidates[2]!.imageUrl).toContain('child-cover.jpg');
  });

  it('keeps the permalink without tracking and the time as ISO 8601', () => {
    const [candidate] = toCandidates({ data: [media(1)] });
    expect(candidate!.permalink).toBe('https://www.instagram.com/p/POST1/');
    expect(candidate!.timestamp).toBe('2026-10-22T12:00:00.000Z');
  });

  it('names a post by its alt text first, then its caption, and flags the menú del día', () => {
    const [byAlt, byCaption] = toCandidates({
      data: [
        media(1, { alt_text: 'Plato de ceviche', caption: '#menudeldia 🍋' }),
        media(2, { alt_text: '' }),
      ],
    });
    expect(byAlt).toMatchObject({ label: 'Plato de ceviche', menu: true });
    expect(byCaption).toMatchObject({ label: 'Foto 2', menu: false });
  });

  it('works without captions, as the Instagram-login API may answer', () => {
    const [candidate] = toCandidates({ data: [media(1, { caption: undefined })] });
    expect(candidate).toMatchObject({ label: '', menu: false });
  });

  it('skips anything it cannot show or link', () => {
    expect(
      toCandidates({
        data: [
          media(1, { media_type: 'VIDEO', media_url: 'https://x.cdninstagram.com/v.mp4' }),
          media(2, { permalink: 'https://evil.example/p/1/' }),
          media(3, { id: 'not-a-number' }),
          media(4, { timestamp: 'yesterday' }),
          media(5, { media_type: 'STORY' }),
          null,
        ],
      }),
    ).toEqual([]);
    expect(toCandidates({ error: { code: 190 } })).toEqual([]);
  });
});

describe('pickPosts', () => {
  const candidates = (menus: number[]): Candidate[] =>
    Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      permalink: `https://www.instagram.com/p/${i}/`,
      kind: 'image',
      timestamp: `2026-10-${String(20 - i).padStart(2, '0')}T12:00:00.000Z`,
      label: '',
      menu: menus.includes(i),
      imageUrl: `https://scontent.cdninstagram.com/${i}.jpg`,
    }));

  it('keeps six, with at most one post of the menú del día', async () => {
    const posts = await pickPosts(candidates([0, 1, 2]), async (c) => `${c.id}-0123456789`);
    expect(posts.map((p) => p.id)).toEqual(['0', '3', '4', '5', '6', '7']);
    expect(posts.every((p) => !('imageUrl' in p))).toBe(true);
  });

  it('takes the next post when an image cannot be used, also for the menu', async () => {
    const posts = await pickPosts(candidates([0, 1]), async (c) =>
      c.id === '0' || c.id === '2' ? undefined : `${c.id}-0123456789`,
    );
    expect(posts.map((p) => p.id)).toEqual(['1', '3', '4', '5', '6', '7']);
    expect(posts[0]!.menu).toBe(true);
  });
});

describe('parseFeed', () => {
  const tampered = (change: (feed: InstagramFeed) => void) => {
    const copy = structuredClone(TEST_FEED);
    change(copy);
    return () => parseFeed(copy);
  };

  it('accepts a feed as the script writes it', () => {
    expect(parseFeed(structuredClone(TEST_FEED))).toEqual(TEST_FEED);
  });

  it.each([
    ['another version', (f: InstagramFeed) => Object.assign(f, { version: 2 })],
    ['no posts', (f: InstagramFeed) => (f.posts = [])],
    ['seven posts', (f: InstagramFeed) => f.posts.push({ ...f.posts[0]!, id: '1' })],
    [
      'a link elsewhere',
      (f: InstagramFeed) => (f.posts[0]!.permalink = 'https://evil.example/p/1/'),
    ],
    ['a link with a query', (f: InstagramFeed) => (f.posts[0]!.permalink += '?x=1')],
    ['an image of another post', (f: InstagramFeed) => (f.posts[0]!.file = '1-0123456789')],
    ['a path in the file name', (f: InstagramFeed) => (f.posts[0]!.file = '../../index')],
    ['markup in a label', (f: InstagramFeed) => (f.posts[0]!.label = '<script>')],
    ['a repeated post', (f: InstagramFeed) => (f.posts[1]!.id = f.posts[0]!.id)],
    ['two menus', (f: InstagramFeed) => (f.posts[0]!.menu = true)],
    ['an unknown kind', (f: InstagramFeed) => Object.assign(f.posts[0]!, { kind: 'story' })],
  ])('refuses %s', (_, change) => {
    expect(tampered(change)).toThrow(/instagram feed/);
  });
});

describe('samePosts', () => {
  it('ignores when the posts were read, not what they are', () => {
    const later = { ...structuredClone(TEST_FEED), fetchedAt: '2026-10-25T04:00:00.000Z' };
    expect(samePosts(TEST_FEED, later)).toBe(true);
    later.posts[0]!.file = `${later.posts[0]!.id}-fedcba9876`;
    expect(samePosts(TEST_FEED, later)).toBe(false);
  });
});

describe('Graph API calls', () => {
  it('asks for the latest media with the token, and never puts it in an error', async () => {
    const { fn, calls } = fakeFetch({
      [`${API}/me/media`]: () => json({ error: { code: 190, message: `Bad token ${TOKEN}` } }, 400),
    });
    const error = (await fetchMedia(TOKEN, fn).catch((e) => e)) as InstagramError;
    expect(calls[0]).toContain('graph.instagram.com/v26.0/me/media');
    expect(new URL(calls[0]!).searchParams.get('access_token')).toBe(TOKEN);
    expect(error.kind).toBe('auth');
    expect(error.message).not.toContain(TOKEN);
  });

  it('asks again without captions if the API refuses the field', async () => {
    let first = true;
    const { fn, calls } = fakeFetch({
      [`${API}/me/media`]: () => {
        if (!first) return json({ data: [media(1)] });
        first = false;
        return json(
          { error: { code: 100, message: 'Tried accessing nonexisting field (caption)' } },
          400,
        );
      },
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(fetchMedia(TOKEN, fn)).resolves.toEqual({ data: [media(1)] });
    expect(new URL(calls[1]!).searchParams.get('fields')).not.toContain('caption');
  });

  it.each([
    ['a server error', () => json({}, 500), 'transient'],
    ['throttling', () => json({ error: { code: 4, message: 'limit' } }, 400), 'transient'],
    ['a refused permission', () => json({ error: { code: 10, message: 'no' } }, 400), 'auth'],
    ['an unknown error', () => json({ error: { code: 1234, message: '?' } }, 400), 'fatal'],
  ])('classifies %s', async (_, respond, kind) => {
    const { fn } = fakeFetch({ [`${API}/me/media`]: respond });
    await expect(fetchMedia(TOKEN, fn)).rejects.toMatchObject({ kind });
  });

  it('treats a network failure as temporary', async () => {
    const fn = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    await expect(fetchMedia(TOKEN, fn)).rejects.toMatchObject({ kind: 'transient' });
  });

  it('renews the token', async () => {
    const { fn, calls } = fakeFetch({
      'https://graph.instagram.com/refresh_access_token': () =>
        json({ access_token: `${TOKEN}-new`, token_type: 'bearer', expires_in: 5_184_000 }),
    });
    await expect(refreshToken(TOKEN, fn)).resolves.toEqual({
      token: `${TOKEN}-new`,
      expiresIn: 5_184_000,
    });
    expect(new URL(calls[0]!).searchParams.get('grant_type')).toBe('ig_refresh_token');
  });
});

describe('the script', () => {
  let dir: string;
  let site: string;
  const cwd = process.cwd();

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'inkawasi-ig-'));
    site = join(dir, 'site');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const api = (items: Record<string, unknown>[]) => ({
    [`${API}/me/media`]: () => json({ data: items }),
    'https://scontent.cdninstagram.com/': () => image(jpeg),
  });

  it('writes six posts with every image cropped to 4:5, in AVIF and WebP', async () => {
    const items = Array.from({ length: 8 }, (_, i) => media(i));
    const { fn } = fakeFetch(api(items));
    const feed = await buildFromApi({ token: TOKEN, outDir: site, fetchFn: fn });
    expect(feed.posts).toHaveLength(6);
    expect(parseFeed(JSON.parse(readFileSync(join(site, 'feed.json'), 'utf8')))).toEqual(feed);
    const files = readdirSync(join(site, 'img'));
    expect(files).toHaveLength(6 * IMAGE_WIDTHS.length * IMAGE_FORMATS.length);
    const meta = await sharp(
      join(site, 'img', imageName(feed.posts[0]!.file, 360, 'avif')),
    ).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['heif', 360, imageHeight(360)]);
  });

  it('skips images from elsewhere or that are not images, and keeps only the current posts', async () => {
    const items = [
      media(0, { media_url: 'https://evil.example/photo.jpg' }),
      ...Array.from({ length: 7 }, (_, i) => media(i + 1)),
    ];
    const { fn } = fakeFetch({
      ...api(items),
      'https://scontent.cdninstagram.com/v/photo1': () =>
        new Response('<html>', { headers: { 'content-type': 'text/html' } }),
    });
    const feed = await buildFromApi({ token: TOKEN, outDir: site, fetchFn: fn });
    expect(feed.posts.map((p) => p.id.at(-1))).toEqual(['2', '3', '4', '5', '6', '7']);
    const again = await buildFromApi({
      token: TOKEN,
      outDir: site,
      fetchFn: fakeFetch(api([media(5)])).fn,
    });
    expect(again.posts).toHaveLength(1);
    expect(readdirSync(join(site, 'img'))).toHaveLength(IMAGE_WIDTHS.length * IMAGE_FORMATS.length);
  });

  it('leaves the folder as it was when Instagram fails', async () => {
    await buildFromApi({ token: TOKEN, outDir: site, fetchFn: fakeFetch(api([media(1)])).fn });
    const before = readFileSync(join(site, 'feed.json'), 'utf8');
    const { fn } = fakeFetch({ [`${API}/me/media`]: () => json({}, 503) });
    await expect(buildFromApi({ token: TOKEN, outDir: site, fetchFn: fn })).rejects.toMatchObject({
      kind: 'transient',
    });
    expect(readFileSync(join(site, 'feed.json'), 'utf8')).toBe(before);
  });

  /** Serves a folder written by the script as if it were https://inkawasi.es/instagram/. */
  function liveSite(folder: string, change?: (name: string, bytes: Buffer) => Buffer) {
    return (async (input: string | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/instagram/feed.json') {
        return json(JSON.parse(readFileSync(join(folder, 'feed.json'), 'utf8')));
      }
      const name = url.pathname.replace('/instagram/img/', '');
      const path = join(folder, 'img', name);
      if (!existsSync(path)) return new Response('', { status: 404 });
      const bytes = readFileSync(path);
      const type = name.endsWith('.avif') ? 'image/avif' : 'image/webp';
      return image(change ? change(name, bytes) : bytes, type);
    }) as unknown as typeof fetch;
  }

  it('copies the published posts, checking every image', async () => {
    const live = join(dir, 'live');
    const written = await buildFromApi({
      token: TOKEN,
      outDir: live,
      fetchFn: fakeFetch(api([media(1), media(2)])).fn,
    });
    const copied = await recoverPublished({
      origin: 'https://inkawasi.es',
      outDir: site,
      fetchFn: liveSite(live),
    });
    expect(copied).toEqual(written);
    expect(readdirSync(join(site, 'img')).sort()).toEqual(readdirSync(join(live, 'img')).sort());
  });

  it('falls back to nothing if a published image is not what the feed says', async () => {
    const live = join(dir, 'live');
    await buildFromApi({ token: TOKEN, outDir: live, fetchFn: fakeFetch(api([media(1)])).fn });
    const copied = await recoverPublished({
      origin: 'https://inkawasi.es',
      outDir: site,
      fetchFn: liveSite(live, (name, bytes) => (name.includes('-480.') ? jpeg : bytes)),
    });
    expect(copied).toBeUndefined();
    expect(existsSync(site)).toBe(false);
  });

  it('falls back to nothing without a published feed', async () => {
    const { fn } = fakeFetch({});
    await expect(
      recoverPublished({ origin: 'https://inkawasi.es', outDir: site, fetchFn: fn }),
    ).resolves.toBeUndefined();
  });

  describe('exit codes and outputs', () => {
    beforeEach(() => process.chdir(dir));

    it('says "changed" when the posts differ from the live site', async () => {
      const output = join(dir, 'output.txt');
      const code = await main(
        [],
        { INSTAGRAM_TOKEN: TOKEN, GITHUB_OUTPUT: output },
        fakeFetch(api([media(1)])).fn,
      );
      expect(code).toBe(0);
      expect(readFileSync(output, 'utf8')).toBe('changed=true\n');
      expect(loadInstagram(join(dir, 'public', 'instagram'))?.posts).toHaveLength(1);
    });

    it('exits 3 without a token or with a refused one, and 2 when Meta is down', async () => {
      expect(await main([], {}, fakeFetch({}).fn)).toBe(3);
      const refused = fakeFetch({ [`${API}/me/media`]: () => json({ error: { code: 190 } }, 400) });
      expect(await main([], { INSTAGRAM_TOKEN: TOKEN }, refused.fn)).toBe(3);
      const down = fakeFetch({ [`${API}/me/media`]: () => json({}, 502) });
      expect(await main([], { INSTAGRAM_TOKEN: TOKEN }, down.fn)).toBe(2);
    });

    it('writes the renewed token to its file and prints it nowhere but the mask', async () => {
      const target = join(dir, 'token');
      const { fn } = fakeFetch({
        'https://graph.instagram.com/refresh_access_token': () =>
          json({ access_token: `${TOKEN}-new`, expires_in: 5_184_000 }),
      });
      const log = vi.mocked(console.log);
      expect(await main(['--renovar', '--salida', target], { INSTAGRAM_TOKEN: TOKEN }, fn)).toBe(0);
      expect(readFileSync(target, 'utf8')).toBe(`${TOKEN}-new`);
      expect(log.mock.calls.flat().join('\n')).not.toContain(TOKEN);

      await main(
        ['--renovar', '--salida', target],
        { INSTAGRAM_TOKEN: TOKEN, GITHUB_ACTIONS: 'true' },
        fn,
      );
      const printed = log.mock.calls.flat().filter((line) => String(line).includes(TOKEN));
      expect(printed).toEqual([`::add-mask::${TOKEN}-new`]);
    });

    it('never calls Meta when copying the published posts', async () => {
      const { fn, calls } = fakeFetch({});
      expect(await main(['--publicado'], { INSTAGRAM_TOKEN: TOKEN }, fn)).toBe(0);
      expect(calls.every((url) => url.startsWith('https://inkawasi.es/'))).toBe(true);
    });
  });
});

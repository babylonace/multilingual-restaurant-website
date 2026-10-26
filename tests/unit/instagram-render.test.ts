import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/data/langs';
import { DISHES, FAVORITES } from '../../src/data/menu';
import { LOCALES } from '../../src/i18n';
import { escapeHtml } from '../../src/lib/html';
import { renderLegalPage } from '../../src/render/legal';
import { renderHomePage, renderMenuDelDiaPage, renderPage } from '../../src/render/page';
import { sitemapXml } from '../../src/render/sitemap';
import { TEST_FEED, TEST_PICTURES } from './fixtures';

const PROFILE = 'https://www.instagram.com/inkawasi.ferrol';

/** The Instagram section of a rendered page, or '' if it has none. */
function section(body: string): string {
  return body.match(/<section class="insta"[\s\S]*?<\/section>/)?.[0] ?? '';
}

function postLinks(html: string): string[] {
  return [...html.matchAll(/<a\s+class="insta__post"[\s\S]*?<\/a>/g)].map((m) => m[0]);
}

describe.each(LANGS)('Instagram section "$code"', ({ code }) => {
  const ui = LOCALES[code].ui;
  const ctx = { lang: code, base: '/', pictures: TEST_PICTURES };
  const withPosts = section(renderHomePage({ ...ctx, instagram: TEST_FEED }).body);
  const reserve = section(renderHomePage(ctx).body);

  it('comes after the review band, before the footer, with its title and a way to follow', () => {
    const body = renderHomePage({ ...ctx, instagram: TEST_FEED }).body;
    const olive = body.indexOf('band--olive');
    expect(olive).toBeGreaterThan(0);
    expect(body.indexOf('class="insta"')).toBeGreaterThan(olive);
    expect(body.indexOf('class="insta"')).toBeLessThan(body.indexOf('<footer'));
    expect(withPosts).toContain(`>${ui.igTitle}</h2>`);
    expect(withPosts).toContain(ui.igFollow);
    expect(withPosts).toContain('@inkawasi.ferrol');
  });

  it('links each of the six posts, in a new tab, with photos served from the site', () => {
    const links = postLinks(withPosts);
    expect(links).toHaveLength(6);
    TEST_FEED.posts.forEach((post, i) => {
      expect(links[i]).toContain(`href="${post.permalink}"`);
      expect(links[i]).toContain('target="_blank"');
      expect(links[i]).toContain(escapeHtml(ui.newTab));
      expect(links[i]).toContain(`/instagram/img/${post.file}-480.webp`);
      expect(links[i]).toMatch(/type="image\/avif" srcset="\/instagram\/img\/\S+-240\.avif 240w/);
    });
    // Nothing on the page points the browser at Meta.
    expect(withPosts).not.toMatch(/(src|srcset)="[^"]*(cdninstagram|fbcdn)/);
    expect(withPosts).not.toContain('<script');
    expect(withPosts).not.toContain('<iframe');
  });

  it('lazy-loads every photo with its size reserved, and leaves the alt to the link text', () => {
    const imgs = withPosts.match(/<img[^>]*>/g) ?? [];
    expect(imgs).toHaveLength(6);
    for (const img of imgs) {
      expect(img).toContain('loading="lazy"');
      expect(img).toContain('width="480"');
      expect(img).toContain('height="600"');
      expect(img).toContain('alt=""');
    }
  });

  it('names each link by the post text (in Spanish), its kind and its date', () => {
    const [photo, video, carousel, unnamed] = postLinks(withPosts);
    expect(photo).toContain(
      '<span lang="es" dir="auto">Ceviche clásico con camote y choclo</span>',
    );
    expect(video).toContain(`, ${ui.igReel}, `);
    expect(carousel).toContain(`, ${ui.igCarousel}, `);
    expect(unnamed).toContain(ui.igPost);
    const date = new Intl.DateTimeFormat(code === 'ar' ? 'ar-u-nu-latn' : code, {
      dateStyle: 'long',
      timeZone: 'Europe/Madrid',
    }).format(new Date(TEST_FEED.posts[0]!.timestamp));
    expect(photo).toContain(date.slice(0, 2));
  });

  it('shows the start of each post text under its photo, inside the link', () => {
    const links = postLinks(withPosts);
    expect(links[0]).toContain(
      '<span class="insta__caption"><span lang="es" dir="auto">Ceviche clásico con camote y choclo</span></span>',
    );
    // A post without text shows only its photo, and is still named for screen readers.
    expect(links[3]).not.toContain('insta__caption');
    expect(postLinks(reserve)[0]).toContain(
      `<span class="insta__caption">${DISHES[FAVORITES[0]!.dish].name}</span>`,
    );
  });

  it('marks Reels and albums with a decorative badge, photos with none', () => {
    const [photo, video, carousel] = postLinks(withPosts);
    expect(photo).not.toContain('insta__badge');
    expect(video).toMatch(/insta__badge"><svg[^>]*aria-hidden="true"[\s\S]*polygon/);
    expect(carousel).toMatch(/insta__badge"><svg[^>]*aria-hidden="true"[\s\S]*<rect/);
  });

  it('shows six favourites linked to the profile when there are no posts', () => {
    const links = postLinks(reserve);
    expect(links).toHaveLength(6);
    links.forEach((link, i) => {
      expect(link).toContain(`href="${PROFILE}"`);
      expect(link).toContain(DISHES[FAVORITES[i]!.dish].name);
      expect(link).toContain(ui.igProfile);
      expect(link).toContain('data-prop-location="reserva"');
    });
  });

  it('tops the posts up with favourites, so there are always six', () => {
    const two = { ...TEST_FEED, posts: TEST_FEED.posts.slice(0, 2) };
    const links = postLinks(section(renderHomePage({ ...ctx, instagram: two }).body));
    expect(links).toHaveLength(6);
    expect(links.filter((l) => l.includes(`href="${PROFILE}"`))).toHaveLength(4);
  });

  it('stays off the carta and the menú del día', () => {
    expect(section(renderPage({ ...ctx, instagram: TEST_FEED }).body)).toBe('');
    expect(section(renderMenuDelDiaPage({ ...ctx, instagram: TEST_FEED }).body)).toBe('');
  });
});

describe('Instagram around the site', () => {
  it('keeps the feed out of the sitemap', () => {
    const sitemap = sitemapXml({ base: '/', siteUrl: 'https://example.test' });
    expect(sitemap).not.toContain('instagram');
  });

  it('tells in the privacy policy how the posts are shown', () => {
    const { body } = renderLegalPage(
      { lang: 'es', base: '/', pictures: TEST_PICTURES },
      'privacidad',
      { nombre: 'Ana Pérez', nie: 'X1234567L', domicilio: 'Calle Falsa 1, Ferrol' },
    );
    expect(body).toContain('<h2>5. Publicaciones de Instagram</h2>');
    expect(body.replace(/\s+/g, ' ')).toContain('no contacta con Instagram ni con Meta');
    expect(body).toMatch(/<h2>8\. Tus derechos<\/h2>/);
  });
});

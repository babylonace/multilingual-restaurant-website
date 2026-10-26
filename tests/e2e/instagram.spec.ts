import { expect, test } from '@playwright/test';

// The e2e build has no Instagram data (it never calls Meta), so the section shows its fallback:
// the six favourites, linked to the profile. Real posts are covered by the unit tests.
const HOMES = ['/', '/en/', '/fr/', '/it/', '/de/', '/pt/', '/gl/', '/ar/', '/zh/', '/ru/'];

test.describe('Instagram section', () => {
  test('always shows six photos, each a link to Instagram in a new tab', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('section.insta');
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole('heading', { name: 'Novedades' })).toBeVisible();
    const posts = section.locator('a.insta__post');
    await expect(posts).toHaveCount(6);
    for (const post of await posts.all()) {
      await expect(post).toHaveAttribute('href', /^https:\/\/www\.instagram\.com\//);
      await expect(post).toHaveAttribute('target', '_blank');
      const img = post.locator('img');
      await expect(img).toHaveJSProperty('complete', true);
      expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    }
    await expect(section.getByRole('link', { name: /Seguir en Instagram/ })).toBeVisible();
  });

  for (const path of HOMES) {
    test(`${path} loads nothing from another origin, even scrolled to the end`, async ({
      page,
      baseURL,
    }) => {
      const foreign: string[] = [];
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.protocol.startsWith('http') && url.origin !== new URL(baseURL!).origin) {
          foreign.push(url.origin);
        }
      });
      await page.goto(path);
      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.waitForLoadState('networkidle');
      expect(foreign).toEqual([]);
    });
  }

  test('sets no cookies and stores nothing', async ({ page, context }) => {
    await page.goto('/');
    await page.locator('section.insta').scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => Object.keys(localStorage).length)).toBe(0);
    expect(await page.evaluate(() => Object.keys(sessionStorage).length)).toBe(0);
  });

  test('reaches every photo with the keyboard, with a visible focus ring', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('a.insta__post').first();
    await first.scrollIntoViewIfNeeded();
    // Focus the link just before the section, then tab into it.
    await page.locator('.band--olive .review__link').last().focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('.insta__handle')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(first).toBeFocused();
    const outline = await first.evaluate((a) => getComputedStyle(a).outlineStyle);
    expect(outline).toBe('solid');
  });

  test('mirrors in Arabic, with the handle kept left to right', async ({ page }) => {
    await page.goto('/ar/');
    const section = page.locator('section.insta');
    await expect(section).toHaveCSS('direction', 'rtl');
    await expect(section.locator('.insta__handle')).toHaveAttribute('dir', 'ltr');
  });

  test('adds no motion for anyone who asks for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const img = page.locator('.insta__img').first();
    // The base styles cut every transition to 0.01 ms; this one is off altogether.
    const duration = await img.evaluate((i) => parseFloat(getComputedStyle(i).transitionDuration));
    expect(duration).toBeLessThan(0.001);
  });
});

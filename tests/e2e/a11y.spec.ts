import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = [
  '/',
  '/en/',
  '/ar/',
  '/carta/',
  '/en/carta/',
  '/ar/carta/',
  '/zh/carta/',
  '/ru/carta/',
  '/menu-del-dia/',
  '/ar/menu-del-dia/',
  '/aviso-legal/',
  '/privacidad/',
  '/404.html',
];
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

for (const path of PAGES) {
  test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });
}

test('every tab panel passes WCAG A/AA when shown', async ({ page }) => {
  await page.goto('/carta/');
  const tabs = page.getByRole('tab');
  const count = await tabs.count();
  for (let i = 0; i < count; i++) {
    await tabs.nth(i).click();
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    const name = await tabs.nth(i).innerText();
    expect(
      results.violations.map((v) => `${v.id}: ${v.help}`),
      `tab "${name}"`,
    ).toEqual([]);
  }
});

test('the language menu passes WCAG A/AA when open', async ({ page }) => {
  await page.goto('/carta/');
  await page.locator('[data-lang-menu] summary').click();
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

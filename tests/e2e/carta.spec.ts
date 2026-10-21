import { expect, test } from '@playwright/test';

test.describe('carta', () => {
  test('loads the Spanish carta with the first tab open', async ({ page }) => {
    await page.goto('/carta/');
    await expect(page).toHaveTitle(/La Carta · Inkawasi/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('La Carta');
    await expect(page.getByRole('tab', { name: 'Entrantes' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('heading', { name: 'Tamal de cerdo' })).toBeVisible();
  });

  test('switches tabs with the mouse and records them in the URL', async ({ page }) => {
    await page.goto('/carta/');
    await page.getByRole('tab', { name: 'Marino' }).click();
    const panel = page.getByRole('tabpanel', { name: 'Marino' });
    await expect(panel.getByRole('heading', { name: 'Ceviche', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tamal de cerdo' })).toBeHidden();
    await expect(page).toHaveURL(/#marino$/);
  });

  test('moves between tabs with the arrow keys, Home and End', async ({ page }) => {
    await page.goto('/carta/');
    const tabs = page.getByRole('tab');
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(tabs.last()).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.first()).toBeFocused();
  });

  test('opens a tab from a deep link', async ({ page }) => {
    await page.goto('/carta/#criollo');
    await expect(page.getByRole('tab', { name: 'Criollo' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const panel = page.getByRole('tabpanel', { name: 'Criollo' });
    await expect(panel.getByRole('heading', { name: 'Lomo Saltado' })).toBeVisible();
  });

  test('shows drinks, beers and the gluten note', async ({ page }) => {
    await page.goto('/carta/#bebidas');
    await expect(page.getByText('Inka Kola')).toBeVisible();
    await expect(page.getByText('Estrella de Galicia')).toBeVisible();
    await expect(page.getByText('Contienen gluten')).toBeVisible();
  });
});

test.describe('URLs', () => {
  test('forwards the site root to the carta, keeping the tab fragment', async ({ page }) => {
    await page.goto('/#marino');
    await expect(page).toHaveURL(/\/carta\/#marino$/);
    await expect(page.getByRole('tab', { name: 'Marino' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('forwards a language root to that language’s carta', async ({ page }) => {
    await page.goto('/fr/');
    await expect(page).toHaveURL(/\/fr\/carta\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('forwards the root even without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/carta\/$/);
    await context.close();
  });
});

test.describe('languages', () => {
  test('changes language from the switcher and navigates to its own URL', async ({ page }) => {
    await page.goto('/carta/');
    await page.locator('[data-lang-menu] summary').click();
    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en\/carta\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Menu');
    await expect(page.getByText('Sundays').first()).toBeAttached();
  });

  test('closes the switcher with Escape and returns focus to its button', async ({ page }) => {
    await page.goto('/carta/');
    const summary = page.locator('[data-lang-menu] summary');
    await summary.click();
    await expect(page.locator('[data-lang-menu]')).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-lang-menu]')).not.toHaveAttribute('open', '');
    await expect(summary).toBeFocused();
  });

  test('renders Arabic right-to-left', async ({ page }) => {
    await page.goto('/ar/carta/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });

  test('remembers an explicit choice and redirects the Spanish carta there', async ({
    browser,
  }) => {
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 Chrome/130 Safari/537.36' });
    const page = await context.newPage();
    await page.goto('/en/carta/');
    await page.locator('[data-lang-menu] summary').click();
    await page.getByRole('link', { name: 'Galego' }).click();
    await expect(page).toHaveURL(/\/gl\/carta\/$/);
    await page.goto('/carta/');
    await expect(page).toHaveURL(/\/gl\/carta\/$/);
    await context.close();
  });

  test('sends a QR scan from an English phone straight to /en/carta/', async ({ browser }) => {
    const context = await browser.newContext({
      locale: 'en-US',
      userAgent: 'Mozilla/5.0 Chrome/130 Safari/537.36',
    });
    const page = await context.newPage();
    await page.goto('/carta/');
    await expect(page).toHaveURL(/\/en\/carta\/$/);
    await context.close();
  });

  test('also reaches the English carta through the site root', async ({ browser }) => {
    const context = await browser.newContext({
      locale: 'en-US',
      userAgent: 'Mozilla/5.0 Chrome/130 Safari/537.36',
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/en\/carta\/$/);
    await context.close();
  });

  test('never redirects crawlers away from the Spanish carta', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US', userAgent: 'Googlebot/2.1' });
    const page = await context.newPage();
    await page.goto('/carta/');
    await expect(page).toHaveURL(/localhost:\d+\/carta\/$/);
    await context.close();
  });
});

test.describe('WhatsApp and orders', () => {
  test('offers one ready-made WhatsApp message per intent', async ({ page }) => {
    await page.goto('/carta/');
    const links = page.locator('.actions a[data-event="whatsapp_clic"]');
    await expect(links).toHaveCount(4);
    const intents = await links.evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.propIntent),
    );
    expect(intents).toEqual(['reservar', 'recoger', 'domicilio', 'consulta']);
    const hrefs = await links.evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
    for (const href of hrefs) expect(href).toMatch(/^https:\/\/wa\.me\/34614922183\?text=Hola/);
    expect(decodeURIComponent(hrefs[0] ?? '')).toContain('Nombre: \nDía: \nHora: \nPersonas: ');
  });

  test('tells the staff which language the visitor speaks', async ({ page }) => {
    await page.goto('/en/carta/');
    const href = await page.locator('.actions a[data-prop-intent="reservar"]').getAttribute('href');
    expect(decodeURIComponent(href ?? '')).toMatch(/\nIdioma: English$/);
  });

  test('links Just Eat with its tracking tags, in a new tab', async ({ page }) => {
    await page.goto('/carta/');
    const link = page.getByRole('link', { name: /Pedir en Just Eat/ }).first();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute(
      'href',
      /^https:\/\/www\.just-eat\.es\/restaurants-inkawasi-ferrol\/menu\?.*utm_content=carta/,
    );
  });

  test('lists all 14 allergens in the legend', async ({ page }) => {
    await page.goto('/carta/');
    await expect(page.locator('.legend__item')).toHaveCount(14);
    await expect(page.locator('.legend')).toContainText('Frutos de cáscara');
    await expect(page.locator('.legend')).toContainText('Altramuces');
  });

  test('prints the opening hours', async ({ page }) => {
    await page.goto('/carta/');
    const hours = page.locator('.hours');
    await expect(hours).toContainText('Lunes');
    await expect(hours).toContainText('Cerrado');
    await expect(hours).toContainText('11:00–23:00');
  });
});

test.describe('legal pages', () => {
  for (const [path, title] of [
    ['/aviso-legal/', 'Aviso legal'],
    ['/privacidad/', 'Política de privacidad'],
  ] as const) {
    test(`${path} loads as a noindex draft`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page.getByRole('note')).toContainText('Borrador');
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('is reachable from the footer of every carta', async ({ page }) => {
    await page.goto('/gl/carta/');
    await page.getByRole('link', { name: 'Aviso legal' }).click();
    await expect(page).toHaveURL(/\/aviso-legal\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('keeps the WhatsApp links working', async ({ page }) => {
    await page.goto('/carta/');
    await expect(page.getByRole('link', { name: /Reservar mesa/ })).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\/34614922183\?text=/,
    );
  });

  test('still prints the menu and keeps the language links working', async ({ page }) => {
    await page.goto('/carta/');
    await expect(page.getByRole('heading', { name: 'Tamal de cerdo' })).toBeVisible();
    await page.locator('[data-lang-menu] summary').click();
    await page.getByRole('link', { name: 'Deutsch' }).click();
    await expect(page).toHaveURL(/\/de\/carta\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Die Speisekarte');
  });
});

test.describe('page quality', () => {
  test('uses no third-party hosts', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const { hostname } = new URL(request.url());
      if (hostname !== 'localhost') external.push(request.url());
    });
    await page.goto('/carta/', { waitUntil: 'networkidle' });
    expect(external).toEqual([]);
  });

  test('has no horizontal overflow', async ({ page }) => {
    await page.goto('/carta/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('keeps images from shifting layout (explicit dimensions)', async ({ page }) => {
    await page.goto('/carta/');
    const missing = await page.locator('img:not([width]), img:not([height])').count();
    expect(missing).toBe(0);
  });
});

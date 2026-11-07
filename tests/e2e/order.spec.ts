import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function add(page: Page, tab: string, dish: string, times = 1): Promise<void> {
  await page.getByRole('tab', { name: tab }).click();
  // Inside the open tab: a favourite has a + in the carousel above as well.
  const button = page
    .getByRole('tabpanel', { name: tab })
    .getByRole('button', { name: `Añadir ${dish} al pedido` });
  for (let i = 0; i < times; i++) await button.click();
}

/** 2 ceviches (29 €) + 1 arroz chaufa (11 €) + 1 Inka Kola (3 €): 43 €, 3 dishes. */
async function fillOrder(page: Page): Promise<void> {
  await add(page, 'Marino', 'Ceviche', 2);
  await add(page, 'Wok · Chifa', 'Arroz Chaufa');
  await add(page, 'Bebidas', 'Inka Kola');
}

async function openOrder(page: Page) {
  await page.getByRole('button', { name: /Ver pedido/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Tu pedido' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** The text of the message the WhatsApp button would open. */
async function sentMessage(page: Page): Promise<string> {
  const href = await page.locator('[data-order-send]').getAttribute('href');
  expect(href?.startsWith('https://wa.me/34614922183?text=')).toBe(true);
  return new URL(href ?? '').searchParams.get('text') ?? '';
}

/** Keeps the tests from reaching the real WhatsApp when the button opens its tab. */
async function stubWhatsapp(page: Page): Promise<void> {
  await page.context().route('https://wa.me/**', (route) => route.fulfill({ body: 'ok' }));
}

test.describe('order without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the same carta and offers the blank WhatsApp', async ({ page }) => {
    await page.goto('/carta/');
    await expect(page.getByRole('heading', { name: 'Tamal de cerdo' })).toBeVisible();
    await expect(page.getByRole('button', { name: /al pedido/ })).toHaveCount(0);
    await expect(page.locator('[data-order-bar]')).toBeHidden();
    await expect(page.locator('[data-order-panel]')).toBeHidden();
    await expect(page.getByRole('link', { name: 'Pedir a domicilio' })).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\/34614922183\?text=Hola/,
    );
  });
});

test.describe('the order in the carta', () => {
  test('shows the way of getting it and what it costs before anything is added', async ({
    page,
  }) => {
    await page.goto('/carta/');
    const panel = page.locator('[data-order-panel]');
    await expect(panel).toBeVisible();
    await expect(panel.getByLabel('A domicilio')).toBeChecked();
    await expect(
      panel.getByText(
        /^Envío 5\s€ a toda Ferrolterra, sin pedido mínimo · Envase y cubiertos 0,50\s€ por plato$/,
      ),
    ).toBeVisible();
    await panel.getByLabel('Para recoger').check();
    await expect(panel.getByText(/Sin envío · Envase y cubiertos 0,50\s€ por plato/)).toBeVisible();
    await expect(panel.getByText(/^Envío 5/)).toBeHidden();
    await expect(page.getByRole('button', { name: /^Quitar/ })).toHaveCount(0);
    await expect(page.locator('[data-order-bar]')).toBeHidden();
  });

  test('makes the + and − buttons finger-sized (44 px)', async ({ page }) => {
    await page.goto('/carta/');
    const plus = page.getByRole('button', { name: 'Añadir Tamal de cerdo al pedido' });
    await plus.click();
    const minus = page.getByRole('button', { name: 'Quitar Tamal de cerdo del pedido' });
    for (const button of [plus, minus]) {
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('adds dishes and drinks, and the bar shows units and total', async ({ page }) => {
    await page.goto('/carta/');
    await fillOrder(page);
    const bar = page.locator('[data-order-bar]');
    await expect(bar).toBeVisible();
    await expect(bar.locator('[data-order-count]')).toHaveText('4');
    // 43 € + 5 € de envío + 3 tapers (1,50 €), a domicilio por defecto.
    await expect(bar.locator('[data-order-bar-total]')).toHaveText(/^49,50\s€$/);
  });

  test('asks for name and address for delivery, and the message carries the total', async ({
    page,
  }) => {
    await page.goto('/carta/');
    await fillOrder(page);
    const dialog = await openOrder(page);

    await expect(dialog.locator('[data-order-subtotal]')).toHaveText(/^43\s€$/);
    await expect(dialog.locator('[data-order-delivery]')).toHaveText(/^5\s€$/);
    await expect(dialog.locator('[data-order-tapers-detail]')).toHaveText(/^3 × 0,50\s€$/);
    await expect(dialog.locator('[data-order-total]')).toHaveText(/^49,50\s€$/);

    await expect(dialog.getByLabel('Dirección de entrega')).toBeVisible();
    await expect(dialog.getByLabel('Hora de recogida')).toBeHidden();
    await dialog.getByLabel('Nombre').fill('Ana Pérez');
    await dialog.getByLabel('Dirección de entrega').fill('Rúa Real 12, 2B');

    expect((await sentMessage(page)).normalize('NFKC')).toBe(
      [
        'Hola, quiero hacer un pedido a domicilio.',
        'Nombre: Ana Pérez',
        'Dirección: Rúa Real 12, 2B',
        'Pedido:',
        '- 2 x Ceviche: 29 €',
        '- 1 x Arroz Chaufa: 11 €',
        '- 1 x Inka Kola: 3 €',
        'Platos y bebidas: 43 €',
        'Envase y cubiertos: 1,50 €',
        'Envío: 5 €',
        'Total: 49,50 €',
      ].join('\n'),
    );
  });

  test('says once that the menú del día changes, and links to Instagram', async ({ page }) => {
    await page.goto('/carta/');
    await page.getByRole('tab', { name: 'Menú del día' }).click();
    const card = page.locator('[data-order-menu-card]');
    await expect(card.getByText('Cambia cada día.')).toBeVisible();
    await expect(card.getByRole('link', { name: /Ver el menú de hoy en Instagram/ })).toBeVisible();
    await expect(card.getByText(/Mira el de hoy/)).toHaveCount(0);
    await expect(page.getByText('Consulta siempre con nuestro personal.')).toHaveCount(1);
    await expect(page.getByText(/Puede haber trazas/)).toHaveCount(0);
  });

  test('puts send and clear on one row, with no extra notes', async ({ page }) => {
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    const dialog = await openOrder(page);
    const send = await dialog.locator('[data-order-send]').boundingBox();
    const clear = await dialog.getByRole('button', { name: 'Vaciar pedido' }).boundingBox();
    expect(send && clear).toBeTruthy();
    // Same row: the two boxes overlap vertically, and the clear button sits beside the send one.
    expect(Math.abs((send?.y ?? 0) - (clear?.y ?? 99))).toBeLessThan(
      (send?.height ?? 0) / 2 + (clear?.height ?? 0) / 2,
    );
    expect((clear?.x ?? 0) >= (send?.x ?? 0) + (send?.width ?? 0) - 1).toBe(true);
    await expect(dialog.getByText(/Se abre WhatsApp con tu pedido/)).toHaveCount(0);
    await expect(dialog.getByText(/Cambia cada día/)).toHaveCount(0);
  });

  test('does not open WhatsApp without the name or address: it says so and goes to the field', async ({
    page,
  }) => {
    await stubWhatsapp(page);
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    const dialog = await openOrder(page);
    let opened = false;
    page.on('popup', () => (opened = true));

    await dialog.locator('[data-order-send]').click();
    await expect(dialog.getByLabel('Nombre')).toBeFocused();
    await dialog.getByLabel('Nombre').fill('Ana');
    await dialog.locator('[data-order-send]').click();
    await expect(dialog.getByLabel('Dirección de entrega')).toBeFocused();
    expect(opened).toBe(false);

    await dialog.getByLabel('Dirección de entrega').fill('Rúa Real 12');
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      dialog.locator('[data-order-send]').click(),
    ]);
    expect(popup.url()).toMatch(/^https:\/\/wa\.me\/34614922183\?text=/);
  });

  test('asks for the time instead of the address for pickup, with no delivery fee', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date('2026-11-04T12:00:00Z'));
    await page.goto('/carta/');
    await fillOrder(page);
    const dialog = await openOrder(page);
    await dialog.getByLabel('Para recoger').check();

    await expect(dialog.getByLabel('Dirección de entrega')).toBeHidden();
    await expect(dialog.getByLabel('Hora de recogida')).toBeVisible();
    await expect(dialog.locator('[data-order-delivery-row]')).toBeHidden();
    await expect(dialog.locator('[data-order-total]')).toHaveText(/^44,50\s€$/);
    await dialog.getByLabel('Nombre').fill('Ana');
    await dialog.getByLabel('Hora de recogida').selectOption('14:30');
    const message = await sentMessage(page);
    expect(message).toContain('para recoger.\nNombre: Ana\nHora: 14:30\nPedido:\n');
    expect(message).not.toMatch(/Dirección|Envío/);
    expect(message).toMatch(/Platos y bebidas: 43 €\nEnvase y cubiertos: 1,50 €\nTotal: 44,50 €$/);
    await dialog.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.locator('[data-order-bar-total]')).toHaveText(/^44,50\s€$/);
  });

  test('charges no taper for drinks alone', async ({ page }) => {
    await page.goto('/carta/');
    await add(page, 'Bebidas', 'Coca Cola', 2);
    const dialog = await openOrder(page);
    await expect(dialog.locator('[data-order-tapers-row]')).toBeHidden();
    // 2 x 2,50 € + 5 € de envío.
    await expect(dialog.locator('[data-order-total]')).toHaveText(/^10\s€$/);
  });

  test('removes items from the carta and from the order', async ({ page }) => {
    await page.goto('/carta/');
    await add(page, 'Marino', 'Ceviche', 2);
    await page
      .getByRole('tabpanel', { name: 'Marino' })
      .getByRole('button', { name: 'Quitar Ceviche del pedido' })
      .click();
    await expect(page.locator('[data-order-count]')).toHaveText('1');

    const dialog = await openOrder(page);
    await dialog.getByRole('button', { name: 'Quitar Ceviche del pedido' }).click();
    // Last unit gone: the order is empty and the keyboard focus is still inside the dialog.
    await expect(dialog.getByText('Aún no has añadido nada.')).toBeVisible();
    await expect(dialog.locator('[data-order-filled]')).toBeHidden();
    await expect(dialog.getByRole('button', { name: 'Cerrar' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.locator('[data-order-bar]')).toBeHidden();
  });

  test('clears the order and closes it', async ({ page }) => {
    await page.goto('/carta/');
    await fillOrder(page);
    await openOrder(page);
    await page.getByRole('button', { name: 'Vaciar pedido' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('[data-order-bar]')).toBeHidden();
  });

  test('closes the order on Escape and returns focus to the bar', async ({ page }) => {
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    await openOrder(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('button', { name: /Ver pedido/ })).toBeFocused();
  });

  test('keeps the order and the typed details across a reload and a language change', async ({
    page,
  }) => {
    await page.goto('/carta/');
    await fillOrder(page);
    const dialog = await openOrder(page);
    await dialog.getByLabel('Nombre').fill('Ana Pérez');
    await dialog.getByLabel('Dirección de entrega').fill('Rúa Real 12');
    await page.reload();
    await expect(page.locator('[data-order-count]')).toHaveText('4');
    await page.getByRole('button', { name: /Ver pedido/ }).click();
    await expect(page.getByLabel('Nombre')).toHaveValue('Ana Pérez');

    await page.goto('/en/carta/');
    await expect(page.locator('[data-order-count]')).toHaveText('4');
    await expect(page.locator('[data-order-bar-total]')).toHaveText(/49\.50/);
    await page.getByRole('button', { name: 'View order' }).click();
    // The message stays in Spanish for the staff and says which language the customer reads.
    const message = await sentMessage(page);
    expect(message).toContain('Nombre: Ana Pérez\nDirección: Rúa Real 12\n');
    expect(message).toContain('- 2 x Ceviche: 29');
    expect(message).toMatch(/\nIdioma: English$/);
  });

  test('survives a saved order with broken data', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'inkawasi_pedido',
        '{"mode":"barco","cart":{"nada":3,"ceviche":"x"},"details":{"name":7}}',
      );
    });
    await page.goto('/carta/');
    await expect(page.getByRole('heading', { name: 'Tamal de cerdo' })).toBeVisible();
    await expect(page.locator('[data-order-bar]')).toBeHidden();
  });

  test('tracks the send click with the intent and the total', async ({ page }) => {
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    await openOrder(page);
    const send = page.locator('[data-order-send]');
    await expect(send).toHaveAttribute('data-event', 'whatsapp_clic');
    await expect(send).toHaveAttribute('data-prop-origin', 'carrito');
    await expect(send).toHaveAttribute('data-prop-intent', 'domicilio');
    await expect(send).toHaveAttribute('data-prop-total', '10.50');
    await expect(send).toHaveAttribute('data-prop-items', '1');
  });
});

test.describe('from the home page and the menú del día', () => {
  test('opens the carta for pickup from the home page and cleans the address', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Pedir para recoger' }).click();
    await expect(page).toHaveURL(/\/carta\/$/);
    await expect(page.locator('[data-order-panel]').getByLabel('Para recoger')).toBeChecked();
    await expect(page.locator('[data-order-panel]')).toBeInViewport();
  });

  test('opens the carta for delivery from the home page', async ({ page }) => {
    await page.goto('/en/');
    await page.locator('.actions a[data-prop-intent="domicilio"]').click();
    await expect(page).toHaveURL(/\/en\/carta\/$/);
    await expect(page.locator('[data-order-panel]').getByLabel('Delivery')).toBeChecked();
  });

  test('goes from the menú del día page to the menu block', async ({ page }) => {
    await page.goto('/menu-del-dia/');
    await page.getByRole('link', { name: 'Pedir el menú' }).click();
    await expect(page).toHaveURL(/\/carta\/#pedir-menu$/);
    const card = page.getByRole('region', { name: 'Menú del día' });
    await expect(card).toBeVisible();
    await expect(card).toBeInViewport();
  });
});

test.describe('favourites with a + button', () => {
  test('adds the dish from a favourite, and its row in the list shows the same', async ({
    page,
  }) => {
    await page.goto('/carta/');
    const card = page.locator('.fav', { hasText: 'Lomo Saltado' });
    await card.getByRole('button', { name: 'Añadir Lomo Saltado al pedido' }).click();
    await expect(card.locator('[data-qty-n]')).toHaveText('1');
    await expect(page.locator('[data-order-count]').first()).toHaveText('1');

    await page.getByRole('tab', { name: 'Criollo' }).click();
    const row = page.getByRole('tabpanel', { name: 'Criollo' }).locator('li.dish', {
      hasText: 'Lomo Saltado',
    });
    await expect(row.locator('[data-qty-n]')).toHaveText('1');

    // The dish is one line of the order, not two.
    const dialog = await openOrder(page);
    await expect(dialog.locator('li.order__line:not([hidden])')).toHaveCount(1);
  });

  test('fits the + of a favourite in its card with the quantity showing', async ({ page }) => {
    await page.goto('/carta/');
    const card = page.locator('.fav', { hasText: 'Ceviche' });
    const plus = card.getByRole('button', { name: 'Añadir Ceviche al pedido' });
    await plus.click();
    await plus.click();
    const [cardBox, plusBox] = [await card.boundingBox(), await plus.boundingBox()];
    expect((plusBox?.x ?? 0) + (plusBox?.width ?? 0)).toBeLessThanOrEqual(
      (cardBox?.x ?? 0) + (cardBox?.width ?? 0),
    );
    expect(plusBox?.width).toBeGreaterThanOrEqual(44);
  });
});

test.describe('the "Domingos" label in the carta', () => {
  test('sits on a second line under the name, not between the name and the price', async ({
    page,
  }) => {
    await page.goto('/carta/');
    await page.getByRole('tab', { name: 'Marino' }).click();
    const dish = page
      .getByRole('tabpanel', { name: 'Marino' })
      .locator('li.dish', { hasText: 'Causa Acevichada' });
    const name = await dish.locator('.dish__name').boundingBox();
    const badge = await dish.locator('.badge').boundingBox();
    const price = await dish.locator('.price').boundingBox();
    // Under the name, starting at its left edge and close to it...
    expect(badge?.y ?? 0).toBeGreaterThanOrEqual((name?.y ?? 0) + (name?.height ?? 0) - 1);
    expect((badge?.y ?? 0) - ((name?.y ?? 0) + (name?.height ?? 0))).toBeLessThanOrEqual(8);
    expect(Math.abs((badge?.x ?? 0) - (name?.x ?? 0))).toBeLessThanOrEqual(1);
    // ...and the price stays on the name's line, to the right of it.
    expect(price?.y ?? 0).toBeLessThan((badge?.y ?? 0) - 1);
    expect(price?.x ?? 0).toBeGreaterThan((name?.x ?? 0) + (name?.width ?? 0));
  });

  test('keeps the name "Causa Acevichada" on one line on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'only about the narrow screen');
    await page.goto('/carta/');
    await page.getByRole('tab', { name: 'Marino' }).click();
    const name = page
      .getByRole('tabpanel', { name: 'Marino' })
      .locator('li.dish', { hasText: 'Causa Acevichada' })
      .locator('.dish__name');
    const box = await name.boundingBox();
    // One line of 1.125rem text is well under 30 px tall.
    expect(box?.height).toBeLessThan(30);
  });
});

test.describe('the menú del día in the order', () => {
  test('has its own tab: the carta opens on Entrantes and the menu stays hidden until chosen', async ({
    page,
  }) => {
    await page.goto('/carta/');
    const card = page.getByRole('region', { name: 'Menú del día' });
    await expect(page.getByRole('tab', { name: 'Entrantes' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(card).toBeHidden();
    await page.getByRole('tab', { name: 'Menú del día' }).click();
    await expect(card).toBeVisible();
    await expect(page).toHaveURL(/#menu$/);
    await expect(page.getByRole('heading', { name: 'Tamal de cerdo' })).toBeHidden();
  });

  test("gives the days and hours on one line, and points to today's menu", async ({ page }) => {
    await page.goto('/carta/');
    await page.getByRole('tab', { name: 'Menú del día' }).click();
    const card = page.getByRole('region', { name: 'Menú del día' });
    await expect(card.getByText('Martes a viernes, de 13:00 a 16:00')).toBeVisible();
    await expect(card.getByText(/Cambia cada día/)).toBeVisible();
    await expect(
      card.getByRole('link', { name: /Ver el menú de hoy en Instagram/ }),
    ).toHaveAttribute('href', 'https://www.instagram.com/inkawasi.ferrol');
  });

  test('adds with its price and tapers, and asks which first and second dish', async ({ page }) => {
    // A Wednesday at 14:00 in Ferrol: the menu is on, so its + buttons work.
    await page.clock.setFixedTime(new Date('2026-11-04T13:00:00Z'));
    await page.goto('/carta/');
    await page.getByRole('tab', { name: 'Menú del día' }).click();
    await page.getByRole('button', { name: 'Añadir Menú del día completo al pedido' }).click();
    await page.getByRole('button', { name: 'Añadir Medio menú del día al pedido' }).click();
    const dialog = await openOrder(page);

    // 13 € + 8 € = 21 €; 2 + 1 tapers = 1,50 €; 5 € de envío.
    await expect(dialog.locator('[data-order-subtotal]')).toHaveText(/^21\s€$/);
    await expect(dialog.locator('[data-order-tapers-detail]')).toHaveText(/^3 × 0,50\s€$/);
    await expect(dialog.locator('[data-order-total]')).toHaveText(/^27,50\s€$/);
    await expect(dialog.getByText(/Cambia cada día/)).toHaveCount(0);

    await dialog.getByLabel('Nombre').fill('Ana');
    await dialog.getByLabel('Dirección de entrega').fill('Rúa Real 12');
    await dialog.getByLabel('Tu primero y segundo del menú').fill('Ensalada y lomo');
    expect(await sentMessage(page)).toContain(
      'Menú del día (primero y segundo): Ensalada y lomo\n',
    );
  });

  test('asks and shows nothing about the menu without one in the order', async ({ page }) => {
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    const dialog = await openOrder(page);
    await expect(dialog.getByLabel('Tu primero y segundo del menú')).toBeHidden();
    await expect(dialog.getByText(/Cambia cada día/)).toBeHidden();
    expect(await sentMessage(page)).not.toContain('primero y segundo');
  });
});

test.describe('pedido accesible', () => {
  test('has no WCAG A/AA failures with an order under way and the dialog open', async ({
    page,
  }) => {
    await page.goto('/carta/');
    await fillOrder(page);
    let results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await openOrder(page);
    results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('has none in right-to-left Arabic either', async ({ page }) => {
    await page.goto('/ar/carta/');
    await page
      .getByRole('button', { name: /^إضافة / })
      .first()
      .click();
    await page.locator('[data-order-open]').click();
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('no layout shift', () => {
  test('paints the panel, the menu tab and the + buttons first, without waiting for the script', async ({
    page,
  }) => {
    // The page script never arrives: whatever shows now is what shows before it arrives.
    await page.route('**/_astro/**/*.js', (route) => route.abort());
    await page.goto('/carta/');
    await expect(page.locator('[data-order-panel]')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Menú del día' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Añadir Tamal de cerdo al pedido' }),
    ).toBeVisible();
  });

  test('keeps the dish list still when the script finishes loading', async ({ page }) => {
    await page.goto('/carta/');
    const shift = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as unknown as {
              value: number;
              hadRecentInput: boolean;
            }[])
              if (!entry.hadRecentInput) total += entry.value;
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => resolve(total), 800);
        }),
    );
    expect(shift).toBeLessThan(0.02);
  });
});

/** Ferrol time is UTC+1 in November, so a Wednesday 14:00 there is 13:00 UTC. 2 Nov 2026 is a Monday. */
const WEDNESDAY_LUNCH = '2026-11-04T13:00:00Z';
const WEDNESDAY_AFTERNOON = '2026-11-04T16:30:00Z';
const MONDAY_LUNCH = '2026-11-02T13:00:00Z';
const SATURDAY_NIGHT = '2026-11-07T22:30:00Z';
const AFTER_THE_PICKUP = '2026-11-04T13:20:00Z';

test.describe('the kitchen and the menu by the hour in Ferrol', () => {
  test('says at lunchtime that the kitchen is open and there is a menu', async ({ page }) => {
    await page.clock.setFixedTime(new Date(WEDNESDAY_LUNCH));
    await page.goto('/carta/');
    await expect(page.locator('[data-kitchen-status]')).toHaveText(
      'Cocina abierta hasta las 16:00',
    );
    await page.getByRole('tab', { name: 'Menú del día' }).click();
    await expect(page.locator('[data-menu-status]')).toHaveText(
      'Hoy hay menú del día, hasta las 16:00',
    );
    await expect(
      page.getByRole('button', { name: 'Añadir Menú del día completo al pedido' }),
    ).toBeEnabled();
  });

  test('says when it opens between services, and the menu can no longer be added', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(WEDNESDAY_AFTERNOON));
    await page.goto('/carta/');
    await expect(page.locator('[data-kitchen-status]')).toHaveText(
      'Cocina cerrada ahora. Abrimos hoy a las 20:00',
    );
    await page.getByRole('tab', { name: 'Menú del día' }).click();
    await expect(page.locator('[data-menu-status]')).toHaveText(
      'Hoy no hay menú del día. Vuelve el jueves',
    );
    await expect(
      page.getByRole('button', { name: 'Añadir Menú del día completo al pedido' }),
    ).toBeDisabled();
    // The dishes of the carta can still be ordered ahead.
    await page.getByRole('tab', { name: 'Entrantes' }).click();
    await expect(
      page.getByRole('button', { name: 'Añadir Tamal de cerdo al pedido' }),
    ).toBeEnabled();
  });

  test('says it is closed on Monday and points to Tuesday', async ({ page }) => {
    await page.clock.setFixedTime(new Date(MONDAY_LUNCH));
    await page.goto('/carta/');
    await expect(page.locator('[data-kitchen-status]')).toHaveText(
      'Cocina cerrada. Abrimos el martes a las 13:00',
    );
    await page.getByRole('tab', { name: 'Menú del día' }).click();
    await expect(page.locator('[data-menu-status]')).toHaveText(
      'Hoy no hay menú del día. Vuelve el martes',
    );
  });

  test('speaks the language of the page, day names included', async ({ page }) => {
    await page.clock.setFixedTime(new Date(MONDAY_LUNCH));
    await page.goto('/en/carta/');
    await expect(page.locator('[data-kitchen-status]')).toHaveText(
      'Kitchen closed. We open on Tuesday at 13:00',
    );
  });

  test('says at night that the kitchen has closed, not the place', async ({ page }) => {
    await page.clock.setFixedTime(new Date(SATURDAY_NIGHT));
    await page.goto('/carta/');
    await expect(page.locator('[data-kitchen-status]')).toHaveText(
      'Cocina cerrada. Abrimos el domingo a las 13:00',
    );
  });
});

test.describe('payment and pickup time', () => {
  test('says cash or Bizum for delivery, and anything for pickup', async ({ page }) => {
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    const dialog = await openOrder(page);
    await expect(dialog.getByText('Pago a domicilio: efectivo o Bizum.')).toBeVisible();
    await expect(dialog.getByText(/^Pago al recoger/)).toBeHidden();
    await dialog.getByLabel('Para recoger').check();
    await expect(dialog.getByText('Pago al recoger: tarjeta, efectivo, Bizum…')).toBeVisible();
    await expect(dialog.getByText(/^Pago a domicilio/)).toBeHidden();
  });

  test('offers pickup times inside the kitchen hours, every 15 minutes', async ({ page }) => {
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    const dialog = await openOrder(page);
    await dialog.getByLabel('Para recoger').check();
    const times = await dialog
      .getByLabel('Hora de recogida')
      .locator('option')
      .evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value));
    expect(times[0]).toBe('');
    expect(times).toContain('13:00');
    expect(times).toContain('15:45');
    expect(times).not.toContain('16:00');
    expect(times).not.toContain('17:00');
    expect(times).toContain('20:00');
    expect(times).toContain('21:45');
    expect(times).not.toContain('22:00');
  });

  test('turns off the pickup times that have gone by today', async ({ page }) => {
    await page.clock.setFixedTime(new Date(WEDNESDAY_LUNCH));
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    const dialog = await openOrder(page);
    await dialog.getByLabel('Para recoger').check();
    const select = dialog.getByLabel('Hora de recogida');
    await expect(select.locator('option[value="13:45"]')).toBeDisabled();
    await expect(select.locator('option[value="14:00"]')).toBeDisabled();
    await expect(select.locator('option[value="14:15"]')).toBeEnabled();
    await expect(select.locator('option[value="20:00"]')).toBeEnabled();
  });

  test('asks again for a saved time that has gone by', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-04T12:30:00Z'));
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    const first = await openOrder(page);
    await first.getByLabel('Para recoger').check();
    await first.getByLabel('Hora de recogida').selectOption('13:45');
    await page.clock.setFixedTime(new Date(WEDNESDAY_LUNCH));
    await page.reload();
    const dialog = await openOrder(page);
    await expect(dialog.getByLabel('Hora de recogida')).toHaveValue('');
    expect(await sentMessage(page)).not.toContain('13:45');
  });

  test('leaves every time on when the kitchen is done for today', async ({ page }) => {
    await page.clock.setFixedTime(new Date(SATURDAY_NIGHT));
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    const dialog = await openOrder(page);
    await dialog.getByLabel('Para recoger').check();
    await expect(
      dialog.getByLabel('Hora de recogida').locator('option[value="13:00"]'),
    ).toBeEnabled();
  });

  /** Ready to send at 14:15, with the clock at 14:00 in Ferrol. */
  async function pickupAt1415(page: Page) {
    await stubWhatsapp(page);
    await page.clock.setFixedTime(new Date(WEDNESDAY_LUNCH));
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    const dialog = await openOrder(page);
    await dialog.getByLabel('Para recoger').check();
    await dialog.getByLabel('Nombre').fill('Ana');
    await dialog.getByLabel('Hora de recogida').selectOption('14:15');
    return dialog;
  }

  const backToThePage = (page: Page) =>
    page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

  test('asks again for a time that went by while the phone was locked', async ({ page }) => {
    const dialog = await pickupAt1415(page);
    await page.clock.setFixedTime(new Date(AFTER_THE_PICKUP));
    await backToThePage(page);
    await expect(dialog.getByLabel('Hora de recogida')).toHaveValue('');
  });

  test('does not send an order with a time that has just gone by', async ({ page }) => {
    const dialog = await pickupAt1415(page);
    await page.clock.setFixedTime(new Date(AFTER_THE_PICKUP));
    await page.locator('[data-order-send]').click();
    await expect(dialog.getByRole('heading', { name: 'Último paso en WhatsApp' })).toBeHidden();
    await expect(dialog.getByLabel('Hora de recogida')).toHaveValue('');
  });

  test('stays on the last step if the time goes by after sending', async ({ page }) => {
    const dialog = await pickupAt1415(page);
    await page.locator('[data-order-send]').click();
    const title = dialog.getByRole('heading', { name: 'Último paso en WhatsApp' });
    await expect(title).toBeVisible();
    await page.clock.setFixedTime(new Date(AFTER_THE_PICKUP));
    await backToThePage(page);
    await expect(title).toBeVisible();
  });

  test('leaves every time on when the kitchen is open but no time is left', async ({ page }) => {
    // Wednesday, 21:50 in Ferrol: the last pickup of the day was at 21:45.
    await page.clock.setFixedTime(new Date('2026-11-04T20:50:00Z'));
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    const dialog = await openOrder(page);
    await dialog.getByLabel('Para recoger').check();
    const options = dialog.getByLabel('Hora de recogida').locator('option[value="13:00"]');
    await expect(options).toBeEnabled();
  });

  test('does not send a pickup without a time', async ({ page }) => {
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    const dialog = await openOrder(page);
    await dialog.getByLabel('Para recoger').check();
    await dialog.getByLabel('Nombre').fill('Ana');
    await dialog.locator('[data-order-send]').click();
    await expect(dialog.getByLabel('Hora de recogida')).toBeFocused();
    await expect(dialog.getByRole('heading', { name: 'Último paso en WhatsApp' })).toBeHidden();
  });
});

test.describe('the last step after sending the order', () => {
  async function sendOrder(page: Page) {
    await stubWhatsapp(page);
    await page.goto('/carta/');
    await add(page, 'Entrantes', 'Tamal de cerdo');
    const dialog = await openOrder(page);
    await dialog.getByLabel('Nombre').fill('Ana');
    await dialog.getByLabel('Dirección de entrega').fill('Rúa Real 12');
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      dialog.locator('[data-order-send]').click(),
    ]);
    expect(popup.url()).toMatch(/^https:\/\/wa\.me\/34614922183\?text=/);
    return dialog;
  }

  test('says after sending that the last step is in WhatsApp', async ({ page }) => {
    const dialog = await sendOrder(page);
    const title = dialog.getByRole('heading', { name: 'Último paso en WhatsApp' });
    await expect(title).toBeVisible();
    await expect(title).toBeFocused();
    await expect(dialog.getByText(/Hemos abierto WhatsApp con tu pedido/)).toBeVisible();
    // The form and its send button are gone, so the same order cannot go twice by accident.
    await expect(dialog.locator('[data-order-send]')).toBeHidden();
  });

  test('shows both buttons of the last step in full', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const dialog = await sendOrder(page);
    for (const name of ['Volver al pedido', 'Hacer otro pedido']) {
      const fits = await dialog
        .getByRole('button', { name })
        .evaluate(
          (button) => button.scrollWidth <= button.clientWidth && button.clientWidth >= 150,
        );
      expect(fits).toBe(true);
    }
  });

  test('goes back to the order untouched', async ({ page }) => {
    const dialog = await sendOrder(page);
    await dialog.getByRole('button', { name: 'Volver al pedido' }).click();
    await expect(dialog.locator('[data-order-send]')).toBeVisible();
    await expect(dialog.getByLabel('Nombre')).toHaveValue('Ana');
    await expect(page.locator('[data-order-count]').first()).toHaveText('1');
  });

  test('empties the cart and closes for another order', async ({ page }) => {
    const dialog = await sendOrder(page);
    await dialog.getByRole('button', { name: 'Hacer otro pedido' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-order-bar]')).toBeHidden();
  });

  test('shows the form again if the order changes', async ({ page }) => {
    const dialog = await sendOrder(page);
    await dialog.getByRole('button', { name: 'Cerrar' }).click();
    await add(page, 'Entrantes', 'Tamal de cerdo');
    await openOrder(page);
    await expect(dialog.locator('[data-order-send]')).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Último paso en WhatsApp' })).toBeHidden();
  });
});

test.describe('links between ordering and booking', () => {
  test('keeps the order bar clear of the WhatsApp button in Arabic', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the floating button exists only on phones');
    await page.goto('/ar/carta/');
    await page.locator('[role="tabpanel"]:visible [data-qty-plus]:visible').first().click();
    const bar = await page.locator('[data-order-bar]').boundingBox();
    const fab = await page.locator('.wa-fab').boundingBox();
    expect((bar?.x ?? 0) + (bar?.width ?? 0)).toBeLessThanOrEqual(fab?.x ?? 0);
  });

  test('links to booking from the foot of the open tab', async ({ page }) => {
    await page.goto('/carta/');
    const link = page.getByRole('link', { name: '¿Mesa en el local? Reserva aquí' });
    await expect(link).toHaveAttribute('href', '/reservar/');
  });

  test('opens the carta for delivery from the hero, with the panel in view', async ({ page }) => {
    await page.goto('/');
    await page.locator('.hero__ctas').getByRole('link', { name: 'Pedir' }).click();
    await expect(page).toHaveURL(/\/carta\/$/);
    await expect(page.locator('[data-order-panel]').getByLabel('A domicilio')).toBeChecked();
    await expect(page.locator('[data-order-panel]')).toBeInViewport();
  });
});

test.describe('the first dish on the first screen of a phone', () => {
  test('shows the first dish under the order panel and the tab bar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'about the phone screen');
    await page.goto('/carta/');
    const height = page.viewportSize()?.height ?? 0;
    const firstDish = await page.locator('#panel-entrantes .dish__name').first().boundingBox();
    expect(firstDish?.y ?? Infinity).toBeLessThan(height);
  });
});

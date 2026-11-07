import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Keeps the tests from reaching the real WhatsApp when the button opens its tab. */
async function stubWhatsapp(page: Page): Promise<void> {
  await page.context().route('https://wa.me/**', (route) => route.fulfill({ body: 'ok' }));
}

async function fillForm(page: Page): Promise<void> {
  await page.getByLabel('Nombre').fill('Ana Pérez');
  await page.getByLabel('Teléfono de contacto').fill('+34 600 111 222');
  // 14 March 2030 is a Thursday.
  await page.getByLabel('Día').fill('2030-03-14');
  await page.getByLabel('Hora').selectOption('21:00');
  await page.getByLabel('Personas').selectOption('4');
}

async function sentMessage(page: Page): Promise<string> {
  const href = await page.locator('[data-reserve-send]').getAttribute('href');
  expect(href?.startsWith('https://wa.me/34614922183?text=')).toBe(true);
  return new URL(href ?? '').searchParams.get('text') ?? '';
}

test.describe('booking without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('offers the blank WhatsApp, not a dead form', async ({ page }) => {
    await page.goto('/reservar/');
    await expect(page.getByRole('heading', { level: 1, name: 'Reservar mesa' })).toBeVisible();
    await expect(page.locator('[data-reserve]')).toBeHidden();
    await expect(page.getByRole('link', { name: 'Reservar mesa', exact: true })).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\/34614922183\?text=Hola/,
    );
  });
});

test.describe('booking form', () => {
  test('asks for name, day, time and guests; phone and notes are optional', async ({ page }) => {
    await page.goto('/reservar/');
    await expect(page).toHaveTitle('Reservar mesa · Inkawasi');
    for (const label of ['Nombre', 'Día', 'Hora', 'Personas']) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
      await expect(page.getByLabel(label, { exact: true })).toHaveAttribute('required', '');
    }
    // The message comes from the customer's own WhatsApp, which shows the number already.
    await expect(page.getByLabel('Teléfono de contacto (opcional)')).toBeVisible();
    await expect(page.getByLabel('Teléfono de contacto (opcional)')).not.toHaveAttribute(
      'required',
      '',
    );
    await expect(page.getByLabel('Notas (opcional)')).not.toHaveAttribute('required', '');
    await expect(page.getByLabel('Personas')).toHaveValue('2');
    await expect(page.getByText('¿Más de 20 personas? Escríbenos y lo organizamos.')).toBeVisible();
  });

  test('says in one line how it is confirmed, and takes up to 20 guests', async ({ page }) => {
    await page.goto('/reservar/');
    await expect(
      page.getByText(
        'Rellena tus datos y selecciona la fecha que deseas. Te confirmaremos la disponibilidad por WhatsApp.',
      ),
    ).toBeVisible();
    await expect(page.getByText(/Se abre WhatsApp con tu reserva/)).toHaveCount(0);
    const options = page.getByLabel('Personas').locator('option');
    await expect(options).toHaveCount(20);
    await expect(options.last()).toHaveText('20');
  });

  test('does not allow a past day', async ({ page }) => {
    await page.goto('/reservar/');
    const date = page.getByLabel('Día');
    await expect(date).toHaveAttribute('min', /^\d{4}-\d{2}-\d{2}$/);
    await date.fill('2020-01-01');
    expect(await date.evaluate((el) => (el as HTMLInputElement).validity.rangeUnderflow)).toBe(
      true,
    );
  });

  test('writes the booking into the WhatsApp message', async ({ page }) => {
    await page.goto('/reservar/');
    await fillForm(page);
    expect(await sentMessage(page)).toBe(
      [
        'Hola, quiero reservar una mesa en Inkawasi.',
        'Nombre: Ana Pérez',
        'Teléfono: +34 600 111 222',
        'Día: jueves 14/03/2030',
        'Hora: 21:00',
        'Personas: 4',
      ].join('\n'),
    );
    await page.getByLabel('Notas (opcional)').fill('Una trona');
    expect(await sentMessage(page)).toMatch(/Personas: 4\nNotas: Una trona$/);
  });

  test('does not open WhatsApp with details missing, and goes to the first one', async ({
    page,
  }) => {
    await stubWhatsapp(page);
    await page.goto('/reservar/');
    let opened = false;
    page.on('popup', () => (opened = true));
    const send = page.getByRole('link', { name: /Enviar reserva por WhatsApp/ });

    await send.click();
    await expect(page.getByLabel('Nombre')).toBeFocused();
    await page.getByLabel('Nombre').fill('Ana');
    // The phone may stay empty, but if it is there it has to look like one.
    await page.getByLabel('Teléfono de contacto').fill('abc');
    await send.click();
    await expect(page.getByLabel('Teléfono de contacto')).toBeFocused();
    await page.getByLabel('Teléfono de contacto').fill('');
    await send.click();
    await expect(page.getByLabel('Día')).toBeFocused();
    expect(opened).toBe(false);

    await fillForm(page);
    const [popup] = await Promise.all([page.waitForEvent('popup'), send.click()]);
    expect(popup.url()).toMatch(/^https:\/\/wa\.me\/34614922183\?text=/);
  });

  test('tells the staff which language to answer in', async ({ page }) => {
    await page.goto('/en/reservar/');
    await page.getByLabel('Name').fill('Ana');
    await page.getByLabel('Contact phone').fill('600111222');
    await page.getByLabel('Date').fill('2030-03-14');
    await page.getByLabel('Time').selectOption('21:00');
    const message = await sentMessage(page);
    expect(message).toMatch(/\nIdioma: English$/);
    expect(message).toContain('Día: jueves 14/03/2030');
  });

  test('goes to the form from the home page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Reservar mesa' }).first().click();
    await expect(page).toHaveURL(/\/reservar\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reservar mesa');
  });

  test('makes the fields and the button finger-sized', async ({ page }) => {
    await page.goto('/reservar/');
    for (const locator of [
      page.getByLabel('Nombre'),
      page.getByLabel('Teléfono de contacto'),
      page.getByLabel('Día'),
      page.getByLabel('Hora'),
      page.getByLabel('Personas'),
      page.getByRole('link', { name: /Enviar reserva por WhatsApp/ }),
    ]) {
      expect((await locator.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('accessible booking form', () => {
  for (const path of ['/reservar/', '/en/reservar/', '/ar/reservar/', '/zh/reservar/']) {
    test(`${path} has no WCAG A/AA failures`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('[data-reserve]')).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});

test.describe('hours, Mondays and the last step of the booking', () => {
  test('offers times inside the kitchen hours, every half hour', async ({ page }) => {
    await page.goto('/reservar/');
    const times = await page
      .getByLabel('Hora')
      .locator('option')
      .evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value));
    expect(times).toEqual([
      '',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '20:00',
      '20:30',
      '21:00',
      '21:30',
    ]);
  });

  test('turns off the times gone by for today, and none for another day', async ({ page }) => {
    // Wednesday 4 November 2026, 14:00 in Ferrol.
    await page.clock.setFixedTime(new Date('2026-11-04T13:00:00Z'));
    await page.goto('/reservar/');
    const hora = page.getByLabel('Hora');
    await hora.selectOption('13:30');

    await page.getByLabel('Día').fill('2026-11-04');
    await expect(hora.locator('option[value="13:30"]')).toBeDisabled();
    await expect(hora.locator('option[value="14:30"]')).toBeEnabled();
    await expect(hora).toHaveValue('');

    await page.getByLabel('Día').fill('2026-11-05');
    await expect(hora.locator('option[value="13:30"]')).toBeEnabled();
  });

  test('does not send a booking for today with a time that has just gone by', async ({ page }) => {
    await stubWhatsapp(page);
    await page.clock.setFixedTime(new Date('2026-11-04T13:00:00Z'));
    await page.goto('/reservar/');
    await page.getByLabel('Nombre').fill('Ana');
    await page.getByLabel('Día').fill('2026-11-04');
    await page.getByLabel('Hora').selectOption('14:30');
    await page.clock.setFixedTime(new Date('2026-11-04T13:45:00Z'));
    await page.locator('[data-reserve-send]').click();
    await expect(page.getByRole('heading', { name: 'Último paso en WhatsApp' })).toBeHidden();
    await expect(page.getByLabel('Hora')).toHaveValue('');
  });

  test('goes back to the top after sending, with the title in view', async ({ page }) => {
    await stubWhatsapp(page);
    await page.goto('/reservar/');
    await fillForm(page);
    await page.locator('[data-reserve-send]').click();
    await expect(page.getByRole('heading', { name: 'Último paso en WhatsApp' })).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('says Mondays are closed under the fields, and does not send', async ({ page }) => {
    await stubWhatsapp(page);
    await page.goto('/reservar/');
    let opened = false;
    page.on('popup', () => (opened = true));
    await fillForm(page);
    // 11 March 2030 is a Monday.
    await page.getByLabel('Día').fill('2030-03-11');
    await expect(page.getByText('Los lunes estamos cerrados. Elige otro día.')).toBeVisible();
    await page.getByRole('link', { name: /Enviar reserva por WhatsApp/ }).click();
    await expect(page.getByLabel('Día')).toBeFocused();
    expect(opened).toBe(false);
    // Another day clears it.
    await page.getByLabel('Día').fill('2030-03-12');
    await expect(page.getByText('Los lunes estamos cerrados. Elige otro día.')).toBeHidden();
  });

  test('books without a phone, and leaves it out of the message', async ({ page }) => {
    await page.goto('/reservar/');
    await page.getByLabel('Nombre').fill('Ana Pérez');
    await page.getByLabel('Día').fill('2030-03-14');
    await page.getByLabel('Hora').selectOption('21:00');
    const message = await sentMessage(page);
    expect(message).not.toContain('Teléfono');
    expect(message).toContain('Nombre: Ana Pérez\nDía: jueves 14/03/2030');
    const valid = await page
      .locator('[data-reserve]')
      .evaluate((form) => (form as HTMLFormElement).checkValidity());
    expect(valid).toBe(true);
  });

  test('says after sending that the last step is in WhatsApp, with a way back', async ({
    page,
  }) => {
    await stubWhatsapp(page);
    await page.goto('/reservar/');
    await fillForm(page);
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('link', { name: /Enviar reserva por WhatsApp/ }).click(),
    ]);
    expect(popup.url()).toMatch(/^https:\/\/wa\.me\/34614922183\?text=/);
    const title = page.getByRole('heading', { name: 'Último paso en WhatsApp' });
    await expect(title).toBeVisible();
    await expect(title).toBeFocused();
    await expect(page.locator('[data-reserve]')).toBeHidden();
    await page.getByRole('button', { name: 'Volver al formulario' }).click();
    await expect(page.locator('[data-reserve]')).toBeVisible();
    await expect(page.getByLabel('Nombre')).toHaveValue('Ana Pérez');
  });

  test('links to ordering', async ({ page }) => {
    await page.goto('/reservar/');
    await page.getByRole('link', { name: '¿Prefieres que te lo llevemos? Pide aquí' }).click();
    await expect(page).toHaveURL(/\/carta\/$/);
  });
});

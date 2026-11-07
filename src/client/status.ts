/**
 * Says what the opening hours mean right now. The HTML carries the translated sentences, hidden,
 * in `data-t-*` attributes; this module picks the one that fits the minute in Ferrol (`lib/hours.ts`)
 * and shows it, and keeps it right if the page stays open across a closing time.
 *
 * Two places: the line under the way of getting the order ("Cocina abierta hasta las 16:00") and
 * the menú del día card. On the menu card the + buttons are off when there is no menu to order
 * (a Monday, a weekend, after 16:00); before 13:00 they stay on so the order can be made ahead.
 *
 * It also turns off the pickup times that have gone by today. Once there are none left they all
 * stay on: the order is then for the next day it opens, agreed in the chat. Timers sleep while the
 * phone is locked, so all of this runs again on coming back and just before an order goes out.
 */
import { fill, isPastTime, kitchenStatus, menuStatus, weekdayName } from '../lib/hours';

export function initStatus(): void {
  const kitchen = document.querySelector<HTMLElement>('[data-kitchen-status]');
  const menu = document.querySelector<HTMLElement>('[data-menu-status]');
  if (!kitchen && !menu) return;

  const lang = document.documentElement.lang || 'es';
  const pickup = document.querySelector<HTMLSelectElement>('[data-order-field="time"]');
  const orderSent = document.querySelector<HTMLElement>('[data-order-sent]');
  const menuButtons = [
    ...document.querySelectorAll<HTMLButtonElement>('[data-order-menu-card] [data-qty-plus]'),
  ];

  function show(el: HTMLElement, text: string, state: 'open' | 'closed'): void {
    el.textContent = text;
    el.dataset.state = state;
    el.hidden = text === '';
  }

  function update(): void {
    const now = new Date();

    if (pickup) {
      const times = [...pickup.options].filter((option) => option.value !== '');
      const servingToday = kitchenStatus(now).kind !== 'next';
      const gone = (option: HTMLOptionElement) => servingToday && isPastTime(option.value, now);
      const anyLeft = times.some((option) => !gone(option));
      for (const option of times) option.disabled = anyLeft && gone(option);
      // A time saved earlier in the tab, or one that has just gone by: ask for it again. Not on
      // the "last step" view: that order has gone, and changing it would reopen the form.
      if (pickup.selectedOptions[0]?.disabled && orderSent?.hidden !== false) {
        pickup.value = '';
        pickup.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    if (kitchen) {
      const status = kitchenStatus(now);
      const t = kitchen.dataset;
      if (status.kind === 'open') {
        show(kitchen, fill(t.tOpen ?? '', { time: status.until }), 'open');
      } else if (status.kind === 'later') {
        show(kitchen, fill(t.tLater ?? '', { time: status.at }), 'closed');
      } else {
        const day = weekdayName(status.weekday, lang);
        show(kitchen, fill(t.tNext ?? '', { day, time: status.at }), 'closed');
      }
    }

    if (menu) {
      const status = menuStatus(now);
      const t = menu.dataset;
      if (status.kind === 'open') {
        show(menu, fill(t.tOpen ?? '', { time: status.until }), 'open');
      } else if (status.kind === 'soon') {
        show(menu, fill(t.tSoon ?? '', { time: status.from }), 'open');
      } else {
        show(menu, fill(t.tClosed ?? '', { day: weekdayName(status.weekday, lang) }), 'closed');
      }
      for (const button of menuButtons) button.disabled = status.kind === 'closed';
    }
  }

  update();
  window.setInterval(update, 60_000);
  window.addEventListener('pageshow', update);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) update();
  });
  // Capture: before the send button checks the form.
  document.addEventListener(
    'click',
    (event) => {
      if ((event.target as Element | null)?.closest('[data-order-send]')) update();
    },
    true,
  );
}

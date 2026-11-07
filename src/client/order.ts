/**
 * The cart of the carta. The HTML already holds every control and the order dialog, all hidden
 * (`render/order.ts`); this module reveals them, keeps the order in `sessionStorage` (it survives
 * a reload and a change of language, and is gone when the tab closes) and rewrites the WhatsApp
 * link every time the order changes. The rules and the message live in `lib/order.ts`.
 */
import { TAPER_CENTS } from '../data/order';
import type { LangCode } from '../data/types';
import { formatPrice } from '../lib/format';
import {
  isOrderMode,
  orderLines,
  orderMessage,
  orderTotals,
  parseStored,
  serializeOrder,
  withQty,
  type OrderItem,
  type StoredOrder,
} from '../lib/order';
import { whatsappLink } from '../lib/wa-link';

const STORAGE_KEY = 'inkawasi_pedido';

function readStorage(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private mode or blocked storage: the order simply lasts until the page is closed.
  }
}

function must<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Missing ${selector} in the order markup`);
  return el;
}

/** What the dialog shows for one item: built once, then only updated. */
interface DialogLine {
  el: HTMLLIElement;
  qty: HTMLElement;
  total: HTMLElement;
}

export function initOrder(): void {
  const dialogEl = document.querySelector<HTMLDialogElement>('[data-order]');
  const barEl = document.querySelector<HTMLElement>('[data-order-bar]');
  if (!dialogEl || !barEl || typeof dialogEl.showModal !== 'function') return;
  const dialog: HTMLDialogElement = dialogEl;
  const bar: HTMLElement = barEl;

  const lang = dialog.dataset.lang as LangCode;
  const number = dialog.dataset.waNumber ?? '';
  const languageLine = dialog.dataset.langLine ?? '';
  const price = (cents: number) => formatPrice(cents, lang);

  // The carta's controls, in the carta's order. A dish can have more than one (a favourite card
  // and its row in the list): they are all kept in step, and the first one defines the item.
  const allControls = [...document.querySelectorAll<HTMLElement>('[data-order-item]')];
  const controlsOf = new Map<string, HTMLElement[]>();
  for (const el of allControls) {
    const id = el.dataset.id ?? '';
    controlsOf.set(id, [...(controlsOf.get(id) ?? []), el]);
  }
  // One entry per item, in the order of the carta (the controls inside the tab panels), so the
  // lines of the order and of the message follow the carta, not the favourites row above it.
  const controls = allControls.filter((el) => el.closest('[role="tabpanel"]'));
  const catalog: OrderItem[] = controls.map((el) => ({
    id: el.dataset.id ?? '',
    name: el.dataset.name ?? '',
    priceCents: Number(el.dataset.price),
    tapers: Number(el.dataset.tapers),
    menu: 'menu' in el.dataset,
  }));
  const known = new Set(catalog.map((i) => i.id));

  let order: StoredOrder = parseStored(readStorage(), (id) => known.has(id));
  /**
   * True after the customer pressed "send": the dialog then says the last step is in WhatsApp (we
   * cannot know whether they sent it) and offers to go back or to start again, so a return from
   * WhatsApp does not invite sending the same order twice. Any change to the order ends it.
   */
  let sent = false;

  // ---- Dialog parts
  const linesList = must<HTMLUListElement>(dialog, '[data-order-lines]');
  const filled = must<HTMLFormElement>(dialog, '[data-order-filled]');
  const emptyNote = must<HTMLElement>(dialog, '[data-order-empty]');
  const sendLink = must<HTMLAnchorElement>(dialog, '[data-order-send]');
  // The mode pills of the panel above the dishes and of the dialog are kept in step.
  const radios = [...document.querySelectorAll<HTMLInputElement>('[data-order-mode]')];
  const costs = [...document.querySelectorAll<HTMLElement>('[data-order-costs]')];
  const pays = [...dialog.querySelectorAll<HTMLElement>('[data-order-pay]')];
  const sentView = must<HTMLElement>(dialog, '[data-order-sent]');
  const sentTitle = must<HTMLElement>(dialog, '[data-order-sent-title]');
  const fields = [...dialog.querySelectorAll<HTMLInputElement>('[data-order-field]')];
  const rows = [...dialog.querySelectorAll<HTMLElement>('[data-order-when]')];
  const deliveryRow = must<HTMLElement>(dialog, '[data-order-delivery-row]');
  const tapersRow = must<HTMLElement>(dialog, '[data-order-tapers-row]');
  const text = (selector: string, root: ParentNode = dialog) => must<HTMLElement>(root, selector);

  const dialogLines = new Map<string, DialogLine>();
  for (const [index, item] of catalog.entries()) {
    const control = controls[index];
    if (!control) continue;
    const li = document.createElement('li');
    li.className = 'order__line';
    li.hidden = true;
    li.dataset.id = item.id;

    const name = document.createElement('span');
    name.className = 'order__name';
    name.textContent = item.name;
    if (control.dataset.badge) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = control.dataset.badge;
      name.append(' ', badge);
    }

    // The stepper reuses the carta's buttons (same icons and translated labels).
    const stepper = document.createElement('span');
    stepper.className = 'qty qty--line';
    const minus = must<HTMLElement>(control, '[data-qty-minus]').cloneNode(true) as HTMLElement;
    const plus = must<HTMLElement>(control, '[data-qty-plus]').cloneNode(true) as HTMLElement;
    minus.hidden = false;
    const qty = document.createElement('output');
    qty.className = 'qty__n';
    stepper.append(minus, qty, plus);

    const total = document.createElement('span');
    total.className = 'order__amount';
    li.append(name, stepper, total);
    linesList.append(li);
    dialogLines.set(item.id, { el: li, qty, total });
  }

  function save(): void {
    writeStorage(serializeOrder(order));
  }

  function render(): void {
    const lines = orderLines(order.cart, catalog);
    const totals = orderTotals(lines, order.mode);

    for (const [id, list] of controlsOf) {
      const qty = order.cart[id] ?? 0;
      for (const control of list) {
        must<HTMLElement>(control, '[data-qty-minus]').hidden = qty === 0;
        const n = must<HTMLElement>(control, '[data-qty-n]');
        n.hidden = qty === 0;
        n.textContent = String(qty);
      }
    }

    bar.hidden = totals.count === 0;
    document.body.classList.toggle('has-order', totals.count > 0);
    text('[data-order-count]', bar).textContent = String(totals.count);
    text('[data-order-bar-total]', bar).textContent = price(totals.totalCents);

    emptyNote.hidden = totals.count > 0;
    filled.hidden = totals.count === 0 || sent;
    sentView.hidden = totals.count === 0 || !sent;
    for (const line of lines) {
      const view = dialogLines.get(line.item.id);
      if (!view) continue;
      view.el.hidden = false;
      view.qty.textContent = String(line.qty);
      view.total.textContent = price(line.totalCents);
    }
    for (const [id, view] of dialogLines) {
      if (!(id in order.cart)) view.el.hidden = true;
    }

    for (const radio of radios) radio.checked = radio.value === order.mode;
    for (const cost of costs) cost.hidden = cost.dataset.orderCosts !== order.mode;
    for (const pay of pays) pay.hidden = pay.dataset.orderPay !== order.mode;
    const hasMenu = lines.some((l) => l.item.menu);
    // Only ask for what this order needs: the address to deliver, the time to pick up, the menu dishes.
    for (const row of rows) {
      const when = row.dataset.orderWhen;
      row.hidden = when === 'menu' ? !hasMenu : when !== order.mode;
      const input = must<HTMLInputElement>(row, '[data-order-field]');
      input.required = !row.hidden;
    }
    for (const input of fields) {
      const value = order.details[input.dataset.orderField as keyof StoredOrder['details']];
      if (input.value !== value) input.value = value;
    }
    deliveryRow.hidden = totals.deliveryCents === 0;
    tapersRow.hidden = totals.taperCount === 0;
    text('[data-order-subtotal]').textContent = price(totals.itemsCents);
    text('[data-order-delivery]').textContent = price(totals.deliveryCents);
    text('[data-order-tapers]').textContent = price(totals.tapersCents);
    text('[data-order-tapers-detail]').textContent = `${totals.taperCount} × ${price(TAPER_CENTS)}`;
    text('[data-order-total]').textContent = price(totals.totalCents);

    // The link is rewritten on every change, so a click always sends what is on screen.
    sendLink.href = whatsappLink(
      number,
      orderMessage(lines, order.mode, order.details, languageLine),
    );
    sendLink.dataset.propIntent = order.mode;
    sendLink.dataset.propTotal = (totals.totalCents / 100).toFixed(2);
    sendLink.dataset.propItems = String(totals.count);
  }

  function change(next: StoredOrder): void {
    order = next;
    sent = false;
    save();
    render();
  }

  /**
   * Taking the last unit off hides the button that was just pressed (in the carta its − button,
   * in the dialog its whole line), and a keyboard user would lose their place: move to the
   * nearest button that is still there.
   */
  function keepFocus(button: HTMLElement): void {
    if (!button.closest('[hidden]')) return;
    // In the carta the button's own control (its + is still there); in the dialog, a line left.
    const own = button.closest<HTMLElement>('[data-order-item]');
    const fallback = dialog.open
      ? (linesList.querySelector<HTMLElement>('li:not([hidden]) [data-qty-plus]') ??
        must<HTMLElement>(dialog, '[data-order-close]'))
      : must<HTMLElement>(own ?? document.body, '[data-qty-plus]');
    fallback.focus();
  }

  // ---- Events
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    const button = target?.closest<HTMLElement>('[data-qty-plus], [data-qty-minus]');
    const id = button?.closest<HTMLElement>('[data-id]')?.dataset.id;
    if (!button || !id || !known.has(id)) return;
    const delta = 'qtyPlus' in button.dataset ? 1 : -1;
    change({ ...order, cart: withQty(order.cart, id, (order.cart[id] ?? 0) + delta) });
    keepFocus(button);
  });

  bar.addEventListener('click', () => dialog.showModal());
  must<HTMLElement>(dialog, '[data-order-close]').addEventListener('click', () => dialog.close());
  // A click on the backdrop lands on the dialog element itself, not on its panel.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  must<HTMLElement>(dialog, '[data-order-clear]').addEventListener('click', () => {
    change({ ...order, cart: {} });
    dialog.close();
  });
  // Last step: back to the order (it was not sent after all) or start a new one.
  must<HTMLElement>(dialog, '[data-order-sent-back]').addEventListener('click', () => {
    sent = false;
    render();
    must<HTMLElement>(dialog, '[data-order-send]').focus();
  });
  must<HTMLElement>(dialog, '[data-order-new]').addEventListener('click', () => {
    change({ ...order, cart: {} });
    dialog.close();
  });

  // What the customer types goes into the message and stays in the tab.
  filled.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement;
    const key = input.dataset.orderField as keyof StoredOrder['details'] | undefined;
    if (key) change({ ...order, details: { ...order.details, [key]: input.value } });
  });
  filled.addEventListener('submit', (event) => event.preventDefault());

  // A message with the name or address missing is of no use to the restaurant: ask first.
  sendLink.addEventListener('click', (event) => {
    if (filled.checkValidity()) {
      // After the click has opened WhatsApp: show the last step, with the focus on it.
      window.setTimeout(() => {
        sent = true;
        render();
        sentTitle.focus();
      }, 0);
      return;
    }
    event.preventDefault();
    // Not a send: the click must not reach the analytics listener either.
    event.stopPropagation();
    filled.reportValidity();
  });

  for (const radio of radios) {
    radio.addEventListener('change', () => {
      if (radio.checked && isOrderMode(radio.value)) {
        change({ ...order, mode: radio.value });
      }
    });
  }

  // Back/forward restores the page from memory: take the order again from the storage.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    order = parseStored(readStorage(), (id) => known.has(id));
    render();
  });

  // The panel and the menu are already on screen (data-js-only); only bring the menu into view
  // when the link asked for it, once the sticky tab bar is in place.
  const menuCard = document.querySelector<HTMLElement>('[data-order-menu-card]');
  if (menuCard && location.hash === '#pedir-menu') menuCard.scrollIntoView({ block: 'start' });
  const panel = document.querySelector<HTMLElement>('[data-order-panel]');

  // The links of the home ("Pedir a domicilio") come as /carta/?pedido=domicilio: choose that
  // way and bring the panel into view, then leave the address clean.
  const wanted = new URLSearchParams(location.search).get('pedido');
  if (isOrderMode(wanted)) {
    order = { ...order, mode: wanted };
    save();
    history.replaceState(null, '', `${location.pathname}${location.hash}`);
    panel?.scrollIntoView({ block: 'start' });
  }
  render();
}

/**
 * The reservation form. The HTML already holds the form, hidden (`render/reservar.ts`); this
 * module reveals it, stops past days from being picked and rewrites the WhatsApp link with what
 * has been typed. The message itself comes from `lib/reservation.ts`.
 */
import { isClosedDate, isPastTime } from '../lib/hours';
import { reservationMessage, todayInSpain } from '../lib/reservation';
import { whatsappLink } from '../lib/wa-link';

export function initReserve(): void {
  const form = document.querySelector<HTMLFormElement>('[data-reserve]');
  const send = form?.querySelector<HTMLAnchorElement>('[data-reserve-send]');
  if (!form || !send) return;

  const number = form.dataset.waNumber ?? '';
  const languageLine = form.dataset.langLine ?? '';
  const value = (name: string) =>
    (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? '';

  function update(): void {
    send!.href = whatsappLink(
      number,
      reservationMessage(
        {
          name: value('name'),
          phone: value('phone'),
          date: value('date'),
          time: value('time'),
          guests: Number(value('guests')),
          notes: value('notes'),
        },
        languageLine,
      ),
    );
  }

  const date = form.querySelector<HTMLInputElement>('[data-reserve-date]');
  if (date) date.min = todayInSpain();

  // The restaurant is closed on Mondays: say so under the fields and refuse that day.
  const closed = form.querySelector<HTMLElement>('[data-reserve-closed]');
  function checkClosed(): void {
    if (!date || !closed) return;
    const isClosed = isClosedDate(date.value);
    closed.hidden = !isClosed;
    date.setCustomValidity(isClosed ? (closed.textContent ?? '').trim() : '');
  }
  date?.addEventListener('change', checkClosed);

  // A table for today cannot be at a time that has gone by.
  const time = form.querySelector<HTMLSelectElement>('select[name="time"]');
  function checkTimes(): void {
    if (!date || !time) return;
    const today = date.value === todayInSpain();
    for (const option of time.options) {
      option.disabled = option.value !== '' && today && isPastTime(option.value);
    }
    if (time.selectedOptions[0]?.disabled) time.value = '';
  }
  date?.addEventListener('change', checkTimes);

  // After sending: the last step is in WhatsApp, with a way back to the form.
  const sentView = document.querySelector<HTMLElement>('[data-reserve-sent]');
  const sentTitle = document.querySelector<HTMLElement>('[data-reserve-sent-title]');
  const back = document.querySelector<HTMLElement>('[data-reserve-back]');
  back?.addEventListener('click', () => {
    form.hidden = false;
    if (sentView) sentView.hidden = true;
    form.querySelector<HTMLElement>('input, select, textarea')?.focus();
  });

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (event) => event.preventDefault());

  // A booking without a name, phone, day or time is of no use to the restaurant: ask first.
  send.addEventListener('click', (event) => {
    checkTimes();
    if (form.checkValidity()) {
      window.setTimeout(() => {
        form.hidden = true;
        if (sentView) sentView.hidden = false;
        // The page is much shorter now: start from the top, not half under the header.
        window.scrollTo({ top: 0, behavior: 'instant' });
        sentTitle?.focus({ preventScroll: true });
      }, 0);
      return;
    }
    event.preventDefault();
    // Not a send: the click must not reach the analytics listener either.
    event.stopPropagation();
    form.reportValidity();
  });

  checkTimes();
  update();
}

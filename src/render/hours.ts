import { hoursOf, WEEKDAYS, type Weekday } from '../data/hours';
import type { LangCode } from '../data/types';
import { html, type SafeHtml } from '../lib/html';
import type { Page } from './context';

interface HoursRow {
  first: Weekday;
  last: Weekday;
  /** `11:00–23:00`, or `undefined` when closed. */
  time: string | undefined;
}

/** Consecutive weekdays with the same hours share a row: `Tue – Thu 11:00–23:00`. */
export function hoursRows(): HoursRow[] {
  const rows: HoursRow[] = [];
  for (const day of WEEKDAYS) {
    const slot = hoursOf(day);
    const time = slot && `${slot.open}–${slot.close}`;
    const previous = rows.at(-1);
    if (previous && previous.time === time) previous.last = day;
    else rows.push({ first: day, last: day, time });
  }
  return rows;
}

/** Weekday name in a language, capitalised. 2024-01-01 was a Monday, so day N is January N. */
function weekdayName(lang: LangCode, day: Weekday): string {
  const name = new Intl.DateTimeFormat(lang, { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2024, 0, day)),
  );
  return name.charAt(0).toLocaleUpperCase(lang) + name.slice(1);
}

function dayLabel(lang: LangCode, { first, last }: HoursRow): string {
  const start = weekdayName(lang, first);
  if (first === last) return start;
  return `${start} – ${weekdayName(lang, last).toLocaleLowerCase(lang)}`;
}

/** Opening hours as visible text, so the `openingHoursSpecification` in the JSON-LD has a visible twin. */
export function openingHours(page: Page): SafeHtml {
  const { t, ctx } = page;
  return html`<section class="hours" aria-labelledby="hours-title">
    <h2 class="hours__title" id="hours-title">${t.hoursTitle}</h2>
    <ul class="hours__list">
      ${hoursRows().map(
        (row) =>
          html`<li class="hours__row">
            <span class="hours__days">${dayLabel(ctx.lang, row)}</span>
            ${
              row.time
                ? html`<span class="hours__time" dir="ltr">${row.time}</span>`
                : html`<span class="hours__time">${t.closed}</span>`
            }
          </li>`,
      )}
    </ul>
  </section>`;
}

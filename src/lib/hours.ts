/**
 * What the opening hours mean at a given moment: is the kitchen open, is there a menú del día,
 * which times can be picked. Pure functions of a `Date` (the clock is always Ferrol's, whatever
 * the visitor's), so they are unit-tested; `client/status.ts` only writes the answers on the page.
 */
import {
  BOOKING_STEP,
  CLOSED_WEEKDAY,
  KITCHEN_WINDOWS,
  MENU_WEEKDAYS,
  MENU_WINDOW,
  PICKUP_STEP,
  SERVICE_TIMEZONE,
} from '../data/hours';

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function toMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** Day of the week (0 is Sunday) and minutes since midnight in Ferrol. */
export function ferrolClock(now: Date = new Date()): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SERVICE_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    weekday: WEEKDAYS[get('weekday')] ?? 0,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** The next day after `weekday` (never the same one) that is in `days`. */
function nextDayIn(weekday: number, days: (day: number) => boolean): number {
  for (let step = 1; step <= 7; step++) {
    const day = (weekday + step) % 7;
    if (days(day)) return day;
  }
  return weekday;
}

export type KitchenStatus =
  /** Open now, until `until`. */
  | { kind: 'open'; until: string }
  /** Closed now, opens again today at `at`. */
  | { kind: 'later'; at: string }
  /** Done for today (or closed all day): opens on `weekday` at `at`. */
  | { kind: 'next'; weekday: number; at: string };

export function kitchenStatus(now: Date = new Date()): KitchenStatus {
  const { weekday, minutes } = ferrolClock(now);
  const firstOpen = KITCHEN_WINDOWS[0]?.open ?? '13:00';
  const nextDay = nextDayIn(weekday, (day) => day !== CLOSED_WEEKDAY);
  if (weekday === CLOSED_WEEKDAY) return { kind: 'next', weekday: nextDay, at: firstOpen };

  for (const window of KITCHEN_WINDOWS) {
    if (minutes < toMinutes(window.open)) return { kind: 'later', at: window.open };
    if (minutes < toMinutes(window.close)) return { kind: 'open', until: window.close };
  }
  return { kind: 'next', weekday: nextDay, at: firstOpen };
}

export type MenuStatus =
  | { kind: 'open'; until: string }
  /** The menu runs today but has not started. Ordering ahead is fine. */
  | { kind: 'soon'; from: string }
  /** No menu today, or it is over: back on `weekday`. */
  | { kind: 'closed'; weekday: number };

export function menuStatus(now: Date = new Date()): MenuStatus {
  const { weekday, minutes } = ferrolClock(now);
  const next = nextDayIn(weekday, (day) => MENU_WEEKDAYS.includes(day));
  if (!MENU_WEEKDAYS.includes(weekday)) return { kind: 'closed', weekday: next };
  if (minutes < toMinutes(MENU_WINDOW.open)) return { kind: 'soon', from: MENU_WINDOW.open };
  if (minutes < toMinutes(MENU_WINDOW.close)) return { kind: 'open', until: MENU_WINDOW.close };
  return { kind: 'closed', weekday: next };
}

/** Times every `step` minutes inside the kitchen's windows, the last one `step` before closing. */
function slots(step: number): string[] {
  const times: string[] = [];
  for (const window of KITCHEN_WINDOWS) {
    for (let t = toMinutes(window.open); t <= toMinutes(window.close) - step; t += step) {
      times.push(toTime(t));
    }
  }
  return times;
}

/** `13:00, 13:15, … 15:45, 20:00 … 21:45`: when an order can be picked up. */
export const pickupSlots = (): string[] => slots(PICKUP_STEP);

/** `13:00, 13:30, … 15:30, 20:00 … 21:30`: when a table can be booked. */
export const bookingSlots = (): string[] => slots(BOOKING_STEP);

/** True when `time` (`HH:MM`) has already gone by today in Ferrol. */
export function isPastTime(time: string, now: Date = new Date()): boolean {
  return toMinutes(time) <= ferrolClock(now).minutes;
}

/** True for a `YYYY-MM-DD` that falls on the closing day. Anything else is not "closed". */
export function isClosedDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const when = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(when.getTime()) && when.getUTCDay() === CLOSED_WEEKDAY;
}

/** The name of a day of the week in the visitor's language ("martes", "Tuesday", "mardi"). */
export function weekdayName(weekday: number, lang: string): string {
  // 7 January 2024 was a Sunday.
  const date = new Date(Date.UTC(2024, 0, 7 + weekday));
  return new Intl.DateTimeFormat(lang, { weekday: 'long', timeZone: 'UTC' }).format(date);
}

/** Fills the `{name}` placeholders of a translated sentence. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

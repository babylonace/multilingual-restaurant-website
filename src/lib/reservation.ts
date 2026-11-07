/**
 * The booking behind the reservation form: the WhatsApp message and the date helpers. Pure
 * functions with no DOM, so they are unit-tested; `client/reserve.ts` only connects them to the
 * page. There is no backend (that is stage 6 of the plan): the form writes the message and the
 * restaurant confirms the booking on WhatsApp.
 */
import { cleanField } from './order';

/** Most guests the form takes; for more, the page asks the customer to write. */
export const MAX_GUESTS = 20;

export interface Reservation {
  name: string;
  phone: string;
  /** `YYYY-MM-DD`, as an `<input type="date">` gives it. */
  date: string;
  /** `HH:MM`, as an `<input type="time">` gives it. */
  time: string;
  guests: number;
  notes: string;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `2026-11-12` → `jueves 12/11/2026`, the way the staff write dates. Empty if it is not a date. */
export function formatDate(date: string): string {
  const match = DATE.exec(date);
  if (!match) return '';
  const [, year, month, day] = match;
  const when = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(when.getTime())) return '';
  const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: 'UTC' }).format(
    when,
  );
  return `${weekday} ${day}/${month}/${year}`;
}

/** Today in Ferrol as `YYYY-MM-DD`: the earliest day that can be booked, wherever the visitor is. */
export function todayInSpain(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts;
}

export function clampGuests(guests: number): number {
  if (!Number.isFinite(guests)) return 1;
  return Math.min(MAX_GUESTS, Math.max(1, Math.trunc(guests)));
}

/**
 * The WhatsApp message of a booking, in Spanish like every other message, with the same
 * Nombre / Día / Hora / Personas lines as the blank template, plus the contact phone and, only if
 * written, the notes. `languageLine` is the closing "Idioma: …" line of a visitor who does not
 * read Spanish.
 */
export function reservationMessage(r: Reservation, languageLine = ''): string {
  const notes = cleanField(r.notes);
  // The phone is optional: the message comes from the customer's own WhatsApp, which already
  // shows the number. It is written only if they gave another one to call.
  const phone = cleanField(r.phone);
  return [
    'Hola, quiero reservar una mesa en Inkawasi.',
    `Nombre: ${cleanField(r.name)}`,
    ...(phone ? [`Teléfono: ${phone}`] : []),
    `Día: ${formatDate(r.date)}`,
    `Hora: ${cleanField(r.time)}`,
    `Personas: ${clampGuests(r.guests)}`,
    ...(notes ? [`Notas: ${notes}`] : []),
    ...(languageLine ? [languageLine] : []),
  ].join('\n');
}

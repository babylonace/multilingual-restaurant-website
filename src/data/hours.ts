/**
 * When the kitchen works, in Ferrol time. Confirmed by Adriana on 2026-11-04: the kitchen is open
 * from 13:00 to 16:00 and from 20:00 to 22:00, closed on Mondays; orders (delivery and pickup)
 * follow the kitchen; the menú del día runs Tuesday to Friday at lunch. Change them here only.
 */
export interface TimeWindow {
  /** `HH:MM`, 24 hours. */
  open: string;
  close: string;
}

export const SERVICE_TIMEZONE = 'Europe/Madrid';

export const KITCHEN_WINDOWS: readonly TimeWindow[] = [
  { open: '13:00', close: '16:00' },
  { open: '20:00', close: '22:00' },
];

/** Day of the week with no service at all: 0 is Sunday, 1 is Monday. */
export const CLOSED_WEEKDAY = 1;

export const MENU_WINDOW: TimeWindow = { open: '13:00', close: '16:00' };

/** Tuesday to Friday. */
export const MENU_WEEKDAYS: readonly number[] = [2, 3, 4, 5];

/** Minutes between the times offered for picking up an order, and for a table. */
export const PICKUP_STEP = 15;
export const BOOKING_STEP = 30;

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface OpeningSlot {
  days: readonly Weekday[];
  /** 24-hour `HH:MM`. `24:00` means midnight at the end of the day. */
  open: string;
  close: string;
}

/** Opening hours as published on Google Maps. Monday is closed. */
export const OPENING_HOURS: readonly OpeningSlot[] = [
  { days: [2, 3, 4], open: '11:00', close: '23:00' },
  { days: [5, 6], open: '11:00', close: '24:00' },
  { days: [7], open: '09:00', close: '23:00' },
];

export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/** Hours of one weekday, or `undefined` when the restaurant is closed. */
export function hoursOf(day: Weekday): OpeningSlot | undefined {
  return OPENING_HOURS.find((slot) => slot.days.includes(day));
}

import { describe, expect, it } from 'vitest';
import { hoursOf, OPENING_HOURS, WEEKDAYS } from '../../src/data/hours';
import { hoursRows } from '../../src/render/hours';

describe('opening hours', () => {
  it('matches Google: closed on Monday, open the other six days', () => {
    expect(hoursOf(1)).toBeUndefined();
    for (const day of WEEKDAYS.filter((d) => d !== 1)) {
      expect(hoursOf(day), `day ${day}`).toBeDefined();
    }
  });

  it('never assigns a weekday to two slots', () => {
    const days = OPENING_HOURS.flatMap((slot) => slot.days);
    expect(new Set(days).size).toBe(days.length);
  });

  it('groups consecutive days with the same hours', () => {
    expect(hoursRows()).toEqual([
      { first: 1, last: 1, time: undefined },
      { first: 2, last: 4, time: '11:00–23:00' },
      { first: 5, last: 6, time: '11:00–24:00' },
      { first: 7, last: 7, time: '09:00–23:00' },
    ]);
  });
});

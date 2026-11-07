import { describe, expect, it } from 'vitest';
import {
  bookingSlots,
  ferrolClock,
  fill,
  isClosedDate,
  isPastTime,
  kitchenStatus,
  menuStatus,
  pickupSlots,
  weekdayName,
} from '../../src/lib/hours';

/**
 * A moment in Ferrol time. In November Spain is on CET (UTC+1), so 14:00 there is 13:00 UTC.
 * 2 November 2026 is a Monday.
 */
function ferrol(day: number, hours: number, minutes = 0): Date {
  return new Date(Date.UTC(2026, 10, day, hours - 1, minutes));
}
const MON = 2;
const TUE = 3;
const WED = 4;
const FRI = 6;
const SAT = 7;
const SUN = 8;

describe('ferrolClock', () => {
  it('reads the weekday and the minutes in Ferrol, not in UTC', () => {
    expect(ferrolClock(ferrol(WED, 14, 30))).toEqual({ weekday: 3, minutes: 14 * 60 + 30 });
    // 23:30 in Ferrol on Wednesday is already Thursday... in no timezone east of Madrid; check the edge:
    expect(ferrolClock(new Date(Date.UTC(2026, 10, 4, 23, 30)))).toEqual({
      weekday: 4,
      minutes: 30,
    });
  });

  it('follows the summer time change', () => {
    // 15 July: CEST, UTC+2. 14:00 in Ferrol is 12:00 UTC.
    expect(ferrolClock(new Date(Date.UTC(2026, 6, 15, 12, 0)))).toEqual({
      weekday: 3,
      minutes: 14 * 60,
    });
  });
});

describe('kitchenStatus (13:00 to 16:00 and 20:00 to 22:00, closed on Mondays)', () => {
  it('is open during lunch and during dinner, with its closing time', () => {
    expect(kitchenStatus(ferrol(WED, 14))).toEqual({ kind: 'open', until: '16:00' });
    expect(kitchenStatus(ferrol(WED, 13, 0))).toEqual({ kind: 'open', until: '16:00' });
    expect(kitchenStatus(ferrol(WED, 20, 30))).toEqual({ kind: 'open', until: '22:00' });
  });

  it('is closed at the minute the kitchen closes', () => {
    expect(kitchenStatus(ferrol(WED, 16, 0)).kind).not.toBe('open');
    expect(kitchenStatus(ferrol(WED, 22, 0)).kind).not.toBe('open');
  });

  it('says when it opens again today, before lunch and between services', () => {
    expect(kitchenStatus(ferrol(WED, 10))).toEqual({ kind: 'later', at: '13:00' });
    expect(kitchenStatus(ferrol(WED, 17))).toEqual({ kind: 'later', at: '20:00' });
  });

  it('after dinner says the next day, and skips the Monday', () => {
    expect(kitchenStatus(ferrol(WED, 22, 30))).toEqual({ kind: 'next', weekday: 4, at: '13:00' });
    expect(kitchenStatus(ferrol(SUN, 23))).toEqual({ kind: 'next', weekday: 2, at: '13:00' });
  });

  it('is closed all day on Monday and says Tuesday', () => {
    expect(kitchenStatus(ferrol(MON, 14))).toEqual({ kind: 'next', weekday: 2, at: '13:00' });
    expect(kitchenStatus(ferrol(MON, 21))).toEqual({ kind: 'next', weekday: 2, at: '13:00' });
  });
});

describe('menuStatus (Tuesday to Friday, 13:00 to 16:00)', () => {
  it('is on during lunch of a menu day, and soon before it', () => {
    expect(menuStatus(ferrol(TUE, 14))).toEqual({ kind: 'open', until: '16:00' });
    expect(menuStatus(ferrol(WED, 12))).toEqual({ kind: 'soon', from: '13:00' });
  });

  it('is over after 16:00 and says the next menu day', () => {
    expect(menuStatus(ferrol(WED, 16, 30))).toEqual({ kind: 'closed', weekday: 4 });
    expect(menuStatus(ferrol(WED, 20, 30))).toEqual({ kind: 'closed', weekday: 4 });
  });

  it('is off on Monday, Saturday and Sunday, and after Friday comes back on Tuesday', () => {
    expect(menuStatus(ferrol(MON, 14))).toEqual({ kind: 'closed', weekday: 2 });
    expect(menuStatus(ferrol(SAT, 14))).toEqual({ kind: 'closed', weekday: 2 });
    expect(menuStatus(ferrol(SUN, 14))).toEqual({ kind: 'closed', weekday: 2 });
    expect(menuStatus(ferrol(FRI, 17))).toEqual({ kind: 'closed', weekday: 2 });
  });
});

describe('time slots', () => {
  it('offers pickup every 15 minutes, the last one 15 minutes before closing', () => {
    const slots = pickupSlots();
    expect(slots).toHaveLength(20);
    expect(slots[0]).toBe('13:00');
    expect(slots).toContain('15:45');
    expect(slots).not.toContain('16:00');
    expect(slots).not.toContain('16:15');
    expect(slots).toContain('20:00');
    expect(slots.at(-1)).toBe('21:45');
  });

  it('offers tables every 30 minutes, the last one 30 minutes before closing', () => {
    expect(bookingSlots()).toEqual([
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
});

describe('isClosedDate', () => {
  it('is true only for a Monday', () => {
    expect(isClosedDate('2026-11-02')).toBe(true);
    expect(isClosedDate('2026-11-03')).toBe(false);
    expect(isClosedDate('2026-11-08')).toBe(false);
  });

  it('is false for anything that is not a date', () => {
    for (const value of ['', 'lunes', '2026-13-45', '02/11/2026']) {
      expect(isClosedDate(value), value).toBe(false);
    }
  });
});

describe('weekdayName and fill', () => {
  it('names the day in the language of the page', () => {
    expect(weekdayName(2, 'es')).toBe('martes');
    expect(weekdayName(2, 'en')).toBe('Tuesday');
    expect(weekdayName(0, 'fr')).toBe('dimanche');
  });

  it('knows which times have gone by in Ferrol, the current minute included', () => {
    const now = ferrol(3, 14, 0);
    expect(isPastTime('13:45', now)).toBe(true);
    expect(isPastTime('14:00', now)).toBe(true);
    expect(isPastTime('14:15', now)).toBe(false);
    expect(isPastTime('20:00', now)).toBe(false);
  });

  it('fills the placeholders and leaves unknown ones alone', () => {
    expect(fill('Abrimos el {day} a las {time}', { day: 'martes', time: '13:00' })).toBe(
      'Abrimos el martes a las 13:00',
    );
    expect(fill('{x} y {day}', { day: 'a' })).toBe('{x} y a');
  });
});

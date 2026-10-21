import { describe, expect, it } from 'vitest';
import { formatPrice } from '../../src/lib/format';

/** Intl uses a no-break space before the euro sign; normalise it so expectations read plainly. */
const plain = (s: string) => s.replace(/\s/g, ' ');

describe('formatPrice', () => {
  it('drops decimals on whole euros, as on the printed carta', () => {
    expect(plain(formatPrice(500, 'es'))).toBe('5 €');
    expect(plain(formatPrice(1400, 'es'))).toBe('14 €');
  });

  it('keeps two decimals otherwise, with a comma in Spanish', () => {
    expect(plain(formatPrice(1450, 'es'))).toBe('14,50 €');
    expect(plain(formatPrice(280, 'es'))).toBe('2,80 €');
  });

  it('follows each language’s conventions', () => {
    expect(plain(formatPrice(1450, 'en'))).toBe('€14.50');
    expect(plain(formatPrice(1450, 'de'))).toBe('14,50 €');
    expect(plain(formatPrice(1450, 'fr'))).toBe('14,50 €');
  });

  it('uses Latin digits in Arabic and no directional marks', () => {
    const price = formatPrice(1450, 'ar');
    expect(price).toMatch(/14\.50/);
    expect(price).not.toMatch(/[‎‏]/);
  });
});

import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/data/langs';
import {
  ALLERGEN_KEYS,
  BEERS,
  DISHES,
  FAVORITES,
  SECTIONS,
  SOFT_DRINKS,
} from '../../src/data/menu';
import { LOCALES } from '../../src/i18n';

const codes = LANGS.map((l) => l.code);
const es = LOCALES.es;

/** Flattens an object to a sorted list of dotted key paths. */
function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj)
    .flatMap(([k, v]) =>
      v && typeof v === 'object'
        ? keyPaths(v as Record<string, unknown>, `${prefix}${k}.`)
        : [`${prefix}${k}`],
    )
    .sort();
}

describe('menu data', () => {
  it('registers a locale for every language, and no extras', () => {
    expect(Object.keys(LOCALES).sort()).toEqual([...codes].sort());
  });

  it('gives every dish a positive price and a name', () => {
    for (const dish of Object.values(DISHES)) {
      expect(dish.name.trim(), dish.id).not.toBe('');
      expect(dish.priceCents, dish.id).toBeGreaterThan(0);
      expect(Number.isInteger(dish.priceCents), dish.id).toBe(true);
    }
  });

  it('keys each dish by its own id', () => {
    for (const [key, dish] of Object.entries(DISHES)) expect(dish.id).toBe(key);
  });

  it('only uses allergens from the official list, without repeats', () => {
    for (const dish of Object.values(DISHES)) {
      for (const a of dish.allergens) expect(ALLERGEN_KEYS, `${dish.id}: ${a}`).toContain(a);
      expect(new Set(dish.allergens).size, dish.id).toBe(dish.allergens.length);
    }
  });

  it('lists every dish in exactly one place', () => {
    const placed = [...SECTIONS.flatMap((s) => s.dishes), ...SOFT_DRINKS, ...BEERS];
    expect(new Set(placed).size).toBe(placed.length);
    expect(placed.sort()).toEqual(Object.keys(DISHES).sort());
  });

  it('points favorites at real dishes and real image files', () => {
    for (const fav of FAVORITES) {
      expect(DISHES[fav.dish], fav.dish).toBeDefined();
      expect(SECTIONS.find((s) => s.id === fav.section)?.dishes, fav.dish).toContain(fav.dish);
      expect(existsSync(`public/assets/favoritos/${fav.image}.webp`), fav.image).toBe(true);
    }
  });
});

describe.each(codes)('locale "%s"', (code) => {
  const locale = LOCALES[code];

  it('has exactly the same keys as the Spanish source', () => {
    expect(keyPaths(locale)).toEqual(keyPaths(es));
  });

  it('has no empty strings', () => {
    for (const path of keyPaths(locale)) {
      const value = path
        .split('.')
        .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], locale);
      expect(String(value).trim(), path).not.toBe('');
    }
  });

  it('translates every allergen and describes every dish', () => {
    for (const key of ALLERGEN_KEYS) expect(locale.allergens[key], key).toBeTruthy();
    for (const s of SECTIONS)
      for (const id of s.dishes) expect(locale.descriptions[id], id).toBeTruthy();
  });

  it('has a tab label for each section plus drinks', () => {
    for (const s of SECTIONS) expect(locale.ui[s.id], s.id).toBeTruthy();
    expect(locale.ui.bebidas).toBeTruthy();
  });
});

describe('regressions found in the audit', () => {
  it('does not call peanuts "almonds" in Galician', () => {
    expect(LOCALES.gl.allergens.cacahuete).not.toMatch(/améndoa/i);
  });

  it('spells "patatas fritas" correctly in the Mostrito description', () => {
    expect(es.descriptions.mostrito).not.toMatch(/patatas frito\b/);
  });
});

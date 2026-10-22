import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tokensToCss, type DesignTokens } from '../../scripts/tokens';
import { CYRILLIC, LATIN, parseRanges } from '../../src/data/font-ranges';
import { DISHES } from '../../src/data/menu';
import { LOCALES } from '../../src/i18n';

const tokens = JSON.parse(readFileSync('design-system/tokens.json', 'utf8')) as DesignTokens;
const css = tokensToCss(tokens);

describe('design tokens', () => {
  it('emits every colour of the design system with its value', () => {
    for (const { name, value } of tokens.color.tokens) {
      const expected = value.startsWith('{') ? `var(--${value.slice(1, -1)})` : value;
      expect(css).toContain(`--${name}: ${expected};`);
    }
  });

  it('keeps the brand brown for text and the brown-800 of the past off text', () => {
    expect(css).toContain('--brown-700: #6E3F31;');
    expect(css).toContain('--text-strong: var(--brown-700);');
    expect(css).toContain('--text-body: var(--brown-700);');
  });

  it('rejects a reference to a token that does not exist', () => {
    const broken = structuredClone(tokens);
    broken.color.tokens.push({ name: 'oops', value: '{nope}' });
    expect(() => tokensToCss(broken)).toThrow('{nope}');
  });

  it('leaves no colour literal in the stylesheets: colours come from tokens', () => {
    const offenders = readdirSync('src/styles')
      .filter((f) => f.endsWith('.css') && f !== 'tokens.generated.css')
      .flatMap((f) =>
        readFileSync(`src/styles/${f}`, 'utf8')
          .split('\n')
          .filter((line) => /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(line))
          .map((line) => `${f}: ${line.trim()}`),
      );
    expect(offenders).toEqual([]);
  });
});

describe('font subsets', () => {
  const ranges = [...parseRanges(LATIN), ...parseRanges(CYRILLIC)];
  const covered = (cp: number) => ranges.some(([from, to]) => cp >= from && cp <= to);

  /** Every string a page can show in a Latin or Cyrillic language. */
  function strings(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
    return [];
  }

  it.each(['es', 'en', 'fr', 'it', 'de', 'pt', 'gl', 'ru'] as const)(
    'covers every character of "%s" with the latin and cyrillic files',
    (code) => {
      const text = [...strings(LOCALES[code]), ...strings(DISHES)].join('');
      const missing = [...new Set(text)].filter((ch) => !covered(ch.codePointAt(0)!));
      expect(missing).toEqual([]);
    },
  );
});

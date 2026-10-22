/**
 * Unicode ranges of the two font subsets the site ships, the same as Fontsource's. Every Latin
 * language of the site (es, en, fr, it, de, pt, gl) fits in LATIN and Russian in CYRILLIC; a unit
 * test checks every string. Arabic and Chinese use system fonts.
 */
export const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

export const CYRILLIC = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';

/** Parses a CSS `unicode-range` list into [from, to] code point pairs. */
export function parseRanges(ranges: string): [number, number][] {
  return ranges.split(',').map((part) => {
    const [from, to = from] = part.trim().replace(/^U\+/i, '').split('-') as [string, string?];
    return [parseInt(from, 16), parseInt(to, 16)];
  });
}

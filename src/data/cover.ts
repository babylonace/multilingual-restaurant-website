/** Cover photo of the dining room (`assets-src/portada/restaurante.webp`, 16:9). */
export const COVER_WIDTHS = [800, 1200, 1600] as const;

/** Intrinsic size of the largest variant; the layout reserves space from the ratio. */
export const COVER_SIZE = { width: 1600, height: 900 } as const;

export function coverPath(width: (typeof COVER_WIDTHS)[number]): string {
  return `assets/portada/restaurante-${width}.webp`;
}

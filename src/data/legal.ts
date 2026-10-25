export const LEGAL_PAGES = ['aviso-legal', 'privacidad'] as const;

export type LegalId = (typeof LEGAL_PAGES)[number];

/**
 * While true, the legal pages say they are a draft. Approved by Adriana on 22 October 2026.
 * Draft or not, they are always noindex and out of the sitemap: the law requires the holder's
 * NIE and address on the site, not in search results (her decision, same day).
 */
export const LEGAL_DRAFT = false;

/** Date of the last revision of the legal texts, shown on both pages. */
export const LEGAL_UPDATED = '2026-10-24';

/** Who is legally behind the site. Comes from the private data file, never from the repository. */
export interface Titular {
  nombre: string;
  nie: string;
  domicilio: string;
}

export const LEGAL_PAGES = ['aviso-legal', 'privacidad'] as const;

export type LegalId = (typeof LEGAL_PAGES)[number];

/**
 * While true, the legal pages say they are a draft, ask search engines not to index them and
 * stay out of the sitemap. Set it to false once Adriana (and, if she wants, an adviser) approves the text.
 */
export const LEGAL_DRAFT = true;

/** Date of the last revision of the legal texts, shown on both pages. */
export const LEGAL_UPDATED = '2026-10-22';

/** Who is legally behind the site. Comes from the private data file, never from the repository. */
export interface Titular {
  nombre: string;
  nie: string;
  domicilio: string;
}

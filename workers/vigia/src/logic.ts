/**
 * Pure logic of the watchman Worker (docs/deployment.md): when is the Netlify gateway
 * healthy, which DNS changes put the site back on Cloudflare Pages, and the alert e-mail.
 * No network here, so it runs under Vitest like the rest of the repo.
 */

/** Only the real site has this line (built with SITE_URL); a Netlify "Site not available" page does not. */
export const MARKER = '<link rel="canonical" href="https://inkawasi.es/"';

export function isHealthy(status: number, body: string): boolean {
  return status === 200 && body.includes(MARKER);
}

export interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
}

/** How each name looked before the gateway: a proxied CNAME to Pages. */
export interface CloudflareRecord {
  type: 'CNAME';
  name: string;
  content: string;
  proxied: true;
  ttl: 1;
}

export type DnsChange =
  | { action: 'delete'; id: string }
  | { action: 'update'; id: string; record: CloudflareRecord }
  | { action: 'create'; record: CloudflareRecord };

const ADDRESS_TYPES = new Set(['A', 'AAAA', 'CNAME']);

/**
 * The changes that serve every name from Cloudflare Pages again. Empty when the site is already
 * there, so a gateway that stays down does not repeat the change or the alert every 5 minutes.
 * Deletions come first: a CNAME cannot share its name with the A/AAAA records it replaces.
 */
export function planReturnToCloudflare(
  records: DnsRecord[],
  names: string[],
  target: string,
): DnsChange[] {
  const deletes: DnsChange[] = [];
  const writes: DnsChange[] = [];
  for (const name of names) {
    const record: CloudflareRecord = {
      type: 'CNAME',
      name,
      content: target,
      proxied: true,
      ttl: 1,
    };
    const own = records.filter((r) => r.name === name && ADDRESS_TYPES.has(r.type));
    const [first, ...rest] = own;
    if (!first) {
      writes.push({ action: 'create', record });
      continue;
    }
    const done =
      rest.length === 0 && first.type === 'CNAME' && first.content === target && first.proxied;
    if (done) continue;
    deletes.push(...rest.map((r) => ({ action: 'delete' as const, id: r.id })));
    writes.push({ action: 'update', id: first.id, record });
  }
  return [...deletes, ...writes];
}

export interface Alert {
  from: string;
  to: string;
  subject: string;
  text: string;
  date: Date;
}

const base64 = (text: string) => {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
};

/** A plain-text RFC 5322 message, base64 so accents survive any relay. */
export function alertEmail({ from, to, subject, text, date }: Alert): string {
  const domain = from.split('@')[1] ?? 'inkawasi.es';
  const body = base64(text).replace(/.{76}/g, '$&\r\n');
  return [
    `From: Vigía Inkawasi <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${base64(subject)}?=`,
    `Date: ${date.toUTCString()}`,
    `Message-ID: <vigia-${date.getTime()}@${domain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
  ].join('\r\n');
}

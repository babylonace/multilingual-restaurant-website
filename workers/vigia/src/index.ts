/**
 * Watchman for the Netlify gateway (docs/deployment.md). Every 5 minutes it asks the
 * gateway for the home page; if it fails twice, 30 seconds apart, it points inkawasi.es and www
 * back at Cloudflare Pages, proxied, as before the gateway, and e-mails Adriana. Going back to the
 * gateway is a manual step, once Netlify is healthy again.
 */
import { EmailMessage } from 'cloudflare:email';
import {
  alertEmail,
  isHealthy,
  planReturnToCloudflare,
  type DnsChange,
  type DnsRecord,
} from './logic';

interface Env {
  /** Secret: API token limited to the inkawasi.es zone, Zone: Read and DNS: Edit. */
  CF_DNS_TOKEN: string;
  ZONE_NAME: string;
  /** Comma-separated record names served by the gateway. */
  NAMES: string;
  PROBE_URL: string;
  CLOUDFLARE_TARGET: string;
  ALERT_FROM: string;
  ALERT_TO: string;
  ALERT: { send(message: EmailMessage): Promise<void> };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

const API = 'https://api.cloudflare.com/client/v4';

async function probe(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    return isHealthy(response.status, await response.text());
  } catch {
    return false;
  }
}

function cloudflare(token: string) {
  return async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(API + path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const json = (await response.json()) as { success: boolean; result: T; errors: unknown[] };
    if (!json.success) throw new Error(`Cloudflare API ${path}: ${JSON.stringify(json.errors)}`);
    return json.result;
  };
}

async function apply(api: ReturnType<typeof cloudflare>, zone: string, change: DnsChange) {
  const records = `/zones/${zone}/dns_records`;
  if (change.action === 'delete') return api(`${records}/${change.id}`, { method: 'DELETE' });
  const body = JSON.stringify(change.record);
  if (change.action === 'update') return api(`${records}/${change.id}`, { method: 'PUT', body });
  return api(records, { method: 'POST', body });
}

async function watch(env: Env) {
  if (await probe(env.PROBE_URL)) return;
  await new Promise((resolve) => setTimeout(resolve, 30_000));
  if (await probe(env.PROBE_URL)) return;

  const api = cloudflare(env.CF_DNS_TOKEN);
  const [zone] = await api<{ id: string }[]>(`/zones?name=${env.ZONE_NAME}`);
  if (!zone) throw new Error(`zone ${env.ZONE_NAME} not found`);
  const records = await api<DnsRecord[]>(`/zones/${zone.id}/dns_records?per_page=100`);
  const names = env.NAMES.split(',').map((name) => name.trim());
  const changes = planReturnToCloudflare(records, names, env.CLOUDFLARE_TARGET);
  // Already on Cloudflare (or never moved): nothing to undo and nobody to wake up.
  if (changes.length === 0) return;

  for (const change of changes) await apply(api, zone.id, change);
  console.log(
    `gateway down: ${changes.length} DNS change(s), ${names.join(' and ')} back on Cloudflare`,
  );

  const raw = alertEmail({
    from: env.ALERT_FROM,
    to: env.ALERT_TO,
    date: new Date(),
    subject: 'Inkawasi: la puerta de Netlify no responde y la web ha vuelto a Cloudflare',
    text: [
      `El vigía ha comprobado dos veces, con 30 segundos de diferencia, que ${env.PROBE_URL} no sirve la web.`,
      'Puede ser que Netlify se haya quedado sin créditos este mes o que esté caído.',
      '',
      `Ha devuelto ${names.join(' y ')} a Cloudflare Pages. La web funciona, salvo durante los bloqueos de LaLiga.`,
      '',
      'Para volver a la puerta cuando Netlify esté bien: docs/deployment.md, «Netlify gateway».',
    ].join('\n'),
  });
  await env.ALERT.send(new EmailMessage(env.ALERT_FROM, env.ALERT_TO, raw));
}

export default {
  scheduled(_controller: unknown, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(watch(env));
  },
};

import { describe, expect, it } from 'vitest';
import {
  alertEmail,
  isHealthy,
  MARKER,
  planReturnToCloudflare,
  type DnsRecord,
} from '../../workers/vigia/src/logic';

const NAMES = ['inkawasi.es', 'www.inkawasi.es'];
const PAGES = 'example-project.pages.dev';

const record = (
  id: string,
  name: string,
  type: string,
  content: string,
  proxied: boolean,
): DnsRecord => ({
  id,
  name,
  type,
  content,
  proxied,
});

const onCloudflare = [
  record('1', 'inkawasi.es', 'CNAME', PAGES, true),
  record('2', 'www.inkawasi.es', 'CNAME', PAGES, true),
  record('3', 'inkawasi.es', 'MX', 'route1.mx.cloudflare.net', false),
];

describe('isHealthy', () => {
  it('needs a 200 with the real site in it', () => {
    expect(isHealthy(200, `<head>${MARKER} /></head>`)).toBe(true);
    expect(isHealthy(200, '<h1>Site not available</h1>')).toBe(false);
    expect(isHealthy(503, MARKER)).toBe(false);
  });
});

describe('planReturnToCloudflare', () => {
  it('changes nothing when the site is already on Cloudflare', () => {
    expect(planReturnToCloudflare(onCloudflare, NAMES, PAGES)).toEqual([]);
  });

  it('moves gateway CNAMEs back to Pages, proxied, and leaves mail alone', () => {
    const onNetlify = [
      record('1', 'inkawasi.es', 'CNAME', 'example-gateway.netlify.app', false),
      record('2', 'www.inkawasi.es', 'CNAME', 'example-gateway.netlify.app', false),
      record('3', 'inkawasi.es', 'MX', 'route1.mx.cloudflare.net', false),
    ];
    const back = (name: string) => ({ type: 'CNAME', name, content: PAGES, proxied: true, ttl: 1 });
    expect(planReturnToCloudflare(onNetlify, NAMES, PAGES)).toEqual([
      { action: 'update', id: '1', record: back('inkawasi.es') },
      { action: 'update', id: '2', record: back('www.inkawasi.es') },
    ]);
  });

  it('deletes extra A/AAAA records before rewriting the first one', () => {
    const onAddresses = [
      record('1', 'inkawasi.es', 'A', '75.2.60.5', false),
      record('4', 'inkawasi.es', 'AAAA', '2600:1f18::1', false),
      onCloudflare[1]!,
    ];
    expect(planReturnToCloudflare(onAddresses, NAMES, PAGES).map((c) => c.action)).toEqual([
      'delete',
      'update',
    ]);
  });

  it('fixes a CNAME to Pages that lost its proxy', () => {
    const grey = [record('1', 'inkawasi.es', 'CNAME', PAGES, false), onCloudflare[1]!];
    expect(planReturnToCloudflare(grey, NAMES, PAGES)).toHaveLength(1);
  });

  it('creates a missing record', () => {
    expect(planReturnToCloudflare([onCloudflare[0]!], NAMES, PAGES)).toEqual([
      {
        action: 'create',
        record: { type: 'CNAME', name: 'www.inkawasi.es', content: PAGES, proxied: true, ttl: 1 },
      },
    ]);
  });
});

describe('alertEmail', () => {
  const raw = alertEmail({
    from: 'watchman@example.com',
    to: 'owner@example.com',
    subject: 'La puerta no responde',
    text: 'Ha vuelto a Cloudflare. Ñandú, café.',
    date: new Date('2026-10-25T10:00:00Z'),
  });
  const [head = '', body = ''] = raw.split('\r\n\r\n');

  it('has the headers Email Routing requires', () => {
    expect(head).toContain('From: Vigía Inkawasi <watchman@example.com>');
    expect(head).toContain('To: owner@example.com');
    expect(head).toMatch(/^Message-ID: <vigia-\d+@example\.com>$/m);
    expect(head).toContain('Date: Sun, 25 Oct 2026 10:00:00 GMT');
  });

  it('encodes subject and body as UTF-8 base64', () => {
    const subject = head.match(/^Subject: =\?UTF-8\?B\?(.+)\?=$/m)?.[1] ?? '';
    expect(Buffer.from(subject, 'base64').toString('utf8')).toBe('La puerta no responde');
    expect(Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8')).toBe(
      'Ha vuelto a Cloudflare. Ñandú, café.',
    );
  });
});

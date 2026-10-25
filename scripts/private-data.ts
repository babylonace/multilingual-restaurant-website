/**
 * Confidential business data (today: the holder's NIE), kept out of git.
 *
 * Read order: the `INKAWASI_PRIVATE_JSON` environment variable (CI secret), then
 * `private/negocio.privado.json`. This module only reads; nothing here ever writes the file.
 * A build without `SITE_URL` (tests, previews) may fall back to the tracked template; a build
 * for a real site (`SITE_URL` set) refuses to publish placeholders.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Titular } from '../src/data/legal';

export interface PrivateData {
  titular: Titular;
}

const PRIVATE_FILE = resolve('private', 'negocio.privado.json');
const EXAMPLE_FILE = resolve('private', 'negocio.privado.example.json');

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`private data: "${field}" must be a non-empty string`);
  }
  return value.trim();
}

/** Validates the shape of the private JSON. Extra keys (such as `_note`) are ignored. */
export function parsePrivate(json: unknown): PrivateData {
  const titular = (json as { titular?: Record<string, unknown> } | null)?.titular;
  if (!titular || typeof titular !== 'object') {
    throw new Error('private data: missing "titular" object');
  }
  return {
    titular: {
      nombre: text(titular.nombre, 'titular.nombre'),
      nie: text(titular.nie, 'titular.nie'),
      domicilio: text(titular.domicilio, 'titular.domicilio'),
    },
  };
}

export interface LoadOptions {
  env?: NodeJS.ProcessEnv;
  /** True for a build that will be published: placeholders are an error. */
  strict: boolean;
  read?: (file: string) => string | undefined;
}

const readIfExists = (file: string) => (existsSync(file) ? readFileSync(file, 'utf8') : undefined);

export function loadPrivate({
  env = process.env,
  strict,
  read = readIfExists,
}: LoadOptions): PrivateData {
  const fromEnv = env.INKAWASI_PRIVATE_JSON?.trim();
  const source = fromEnv || read(PRIVATE_FILE);
  if (source) return parsePrivate(JSON.parse(source));

  if (strict) {
    throw new Error(
      'Missing confidential data. Create private/negocio.privado.json (copy the .example.json) ' +
        'or set INKAWASI_PRIVATE_JSON; a build with SITE_URL will not publish placeholders.',
    );
  }
  const example = read(EXAMPLE_FILE);
  if (!example) throw new Error('private/negocio.privado.example.json is missing');
  console.warn('Using the placeholder holder data from private/negocio.privado.example.json');
  return parsePrivate(JSON.parse(example));
}

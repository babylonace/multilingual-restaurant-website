import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadPrivate, parsePrivate } from '../../scripts/private-data';

const VALID = {
  _aviso: 'ignored',
  titular: { nombre: ' Ana Pérez ', nie: 'X1234567L', domicilio: 'Calle Falsa 1, Ferrol' },
};

describe('parsePrivate', () => {
  it('accepts the expected shape, trims, and ignores extra keys', () => {
    expect(parsePrivate(VALID).titular.nombre).toBe('Ana Pérez');
  });

  it('rejects a missing or empty field', () => {
    expect(() => parsePrivate({})).toThrow(/titular/);
    expect(() => parsePrivate({ titular: { ...VALID.titular, nie: ' ' } })).toThrow(/titular\.nie/);
  });
});

describe('loadPrivate', () => {
  const none = () => undefined;
  const only = (suffix: string) => (file: string) =>
    file.endsWith(suffix) ? JSON.stringify(VALID) : undefined;

  it('prefers the CI secret over the file', () => {
    const env = { INKAWASI_PRIVATE_JSON: JSON.stringify(VALID) };
    const read = () => JSON.stringify({ titular: { ...VALID.titular, nombre: 'Del fichero' } });
    expect(loadPrivate({ env, strict: true, read }).titular.nombre).toBe('Ana Pérez');
  });

  it('reads the private file when there is no secret', () => {
    const read = only('negocio.privado.json');
    expect(loadPrivate({ env: {}, strict: true, read }).titular.nie).toBe('X1234567L');
  });

  it('refuses to publish placeholders when the build is for a real site', () => {
    expect(() => loadPrivate({ env: {}, strict: true, read: none })).toThrow(
      /Missing confidential/,
    );
  });

  it('falls back to the tracked template for local builds and tests', () => {
    const read = only('example.json');
    expect(loadPrivate({ env: {}, strict: false, read }).titular.nie).toBe('X1234567L');
  });
});

describe('confidential data stays out of git', () => {
  const file = 'private/negocio.privado.json';

  it.skipIf(!existsSync(file))('never appears in a tracked file', () => {
    const { nie } = parsePrivate(JSON.parse(readFileSync(file, 'utf8'))).titular;
    const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter((f) => f && existsSync(f));
    const leaks = tracked.filter((f) => readFileSync(f).toString('latin1').includes(nie));
    expect(leaks).toEqual([]);
  });

  it('keeps the real file ignored and only the template tracked', () => {
    const tracked = execFileSync('git', ['ls-files', 'private'], { encoding: 'utf8' }).trim();
    expect(tracked).toBe('private/negocio.privado.example.json');
  });
});

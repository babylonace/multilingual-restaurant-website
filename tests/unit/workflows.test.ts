import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = '.github/workflows';

/** The lines of a workflow, without comments, that match. */
function lines(text: string, pattern: RegExp): string[] {
  return text.split('\n').filter((line) => pattern.test(line.replace(/#.*$/, '')));
}

describe('workflows', () => {
  // A deploy built without the switch takes /reservar/ off the live site without any error.
  it.each(readdirSync(dir))('%s turns the reservations on in every build', (file) => {
    const text = readFileSync(join(dir, file), 'utf8');
    const builds = lines(text, /npm run build|astro build/);
    expect(lines(text, /BOOKINGS_VISIBLE: '1'/)).toHaveLength(builds.length);
    if (lines(text, /pages deploy/).length > 0) expect(builds.length).toBeGreaterThan(0);
  });
});

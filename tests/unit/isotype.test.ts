import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isotype, splitIsotype, subpaths } from '../../src/render/isotype';
import { renderHomePage } from '../../src/render/page';
import { TEST_PICTURES } from './fixtures';

const source = readFileSync('assets-src/brand/inkawasi-icono-light.svg', 'utf8');
const parts = splitIsotype(source);
const startOf = (d: string) =>
  d
    .match(/^M (-?[\d.]+),(-?[\d.]+)/)!
    .slice(1)
    .map(Number);

describe('isotype', () => {
  it('splits the sun into its arc and nine rays, each with an absolute start', () => {
    expect(parts.rays).toHaveLength(9);
    for (const d of [parts.arc, ...parts.rays]) expect(d).toMatch(/^M -?[\d.]+,-?[\d.]+ c /);
  });

  it('turns a relative move-to into the absolute point it stands for', () => {
    const [first, second] = subpaths('m 10,20 c 1,1 2,2 3,3 z m 5,-5 c 1,1 2,2 3,3 z');
    expect(first!.start).toEqual([10, 20]);
    expect(second!.start).toEqual([15, 15]);
    expect(second!.d).toBe('M 15,15 c 1,1 2,2 3,3 z');
  });

  it('keeps every piece of the official drawing: nothing added, nothing lost', () => {
    const pieces = subpaths(
      /id="path25"[^>]* d="([^"]*)"|<path[^>]* d="([^"]*)"[^>]*id="path25"/
        .exec(source)!
        .slice(1)
        .find(Boolean)!,
    );
    expect([parts.arc, ...parts.rays].sort()).toEqual(pieces.map((p) => p.d).sort());
  });

  it('orders the rays like a sunrise: lower left first, the right-hand one last', () => {
    const starts = parts.rays.map(startOf);
    const xs = starts.map(([x]) => x!);
    const ys = starts.map(([, y]) => y!);
    expect(ys[0]).toBe(Math.max(...ys)); // the lowest ray (bottom left) lights first
    expect(xs.at(-1)).toBe(Math.max(...xs)); // the rightmost ray lights last
  });

  it('uses the colours of the official file, never its own', () => {
    expect(parts.sunFill.toLowerCase()).toBe('#d3a019');
    expect(parts.forkFill.toLowerCase()).toBe('#f5f4f0');
  });

  it('renders as decorative SVG with the rays numbered for the animation', () => {
    const svg = isotype('sun-mark').toString();
    expect(svg).toContain('aria-hidden="true"');
    expect(svg.match(/class="sun-mark__ray"/g)).toHaveLength(9);
    expect(svg).toContain('style="--i:0"');
    expect(svg).toContain('style="--i:8"');
  });

  it('sits in the brown band of the home page', () => {
    const { body } = renderHomePage({ lang: 'es', base: '/', pictures: TEST_PICTURES });
    expect(body).toMatch(/id="pedir">\s*<div class="band__inner">\s*<svg class="sun-mark"/);
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fitCircle, isotype, outline, splitIsotype, subpaths } from '../../src/render/isotype';
import { renderHomePage } from '../../src/render/page';
import { TEST_PICTURES } from './fixtures';

const source = readFileSync('assets-src/brand/inkawasi-icono-light.svg', 'utf8');
const parts = splitIsotype(source);
const rays = parts.rays.map((r) => r.d);
const startOf = (d: string) =>
  d
    .match(/^M (-?[\d.]+),(-?[\d.]+)/)!
    .slice(1)
    .map(Number);

describe('isotype', () => {
  it('splits the sun into its arc and nine rays, each with an absolute start', () => {
    expect(rays).toHaveLength(9);
    for (const d of [parts.arc.d, ...rays]) expect(d).toMatch(/^M -?[\d.]+,-?[\d.]+ c /);
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
    expect([parts.arc.d, ...rays].sort()).toEqual(pieces.map((p) => p.d).sort());
  });

  it('orders the rays like a sunrise: lower left first, the right-hand one last', () => {
    const starts = rays.map(startOf);
    const xs = starts.map(([x]) => x!);
    const ys = starts.map(([, y]) => y!);
    expect(ys[0]).toBe(Math.max(...ys)); // the lowest ray (bottom left) lights first
    expect(xs.at(-1)).toBe(Math.max(...xs)); // the rightmost ray lights last
  });

  it('points every ray outwards, sweeping from the lower left to the upper right', () => {
    const angles = parts.rays.map((r) => r.angle);
    expect(angles[0]).toBeGreaterThan(90); // lower left: down and to the left
    expect(angles.at(-1)).toBeLessThan(0); // upper right: up and to the right
    for (const { origin } of parts.rays) {
      expect(origin[0]).toBeGreaterThanOrEqual(0);
      expect(origin[1]).toBeGreaterThanOrEqual(0);
    }
  });

  it('finds the centre of a circle from points on it', () => {
    const points = Array.from({ length: 12 }, (_, k): [number, number] => [
      5 + 3 * Math.cos(k / 2),
      -2 + 3 * Math.sin(k / 2),
    ]);
    const { cx, cy } = fitCircle(points);
    expect(cx).toBeCloseTo(5, 6);
    expect(cy).toBeCloseTo(-2, 6);
  });

  it('reads points along cubic curves, relative and absolute', () => {
    const points = outline('M 0,0 c 0,0 10,0 10,0 C 10,0 20,0 20,0 z');
    expect(points[0]).toEqual([0, 0]);
    expect(points.at(-1)).toEqual([20, 0]);
  });

  it('draws the arc along a line that runs past both of its ends', () => {
    expect(parts.arc.reveal).toMatch(/^M [\d.]+,[\d.]+ A [\d.]+,[\d.]+ 0 1 1 [\d.]+,[\d.]+$/);
    expect(parts.arc.revealWidth).toBeGreaterThan(0);
  });

  it('uses the colours of the official file, never its own', () => {
    expect(parts.sunFill.toLowerCase()).toBe('#d3a019');
    expect(parts.forkFill.toLowerCase()).toBe('#f5f4f0');
  });

  it('renders as decorative SVG, ready to be revealed', () => {
    const svg = isotype('sun-mark').toString();
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('data-reveal');
    expect(svg.match(/class="sun-mark__ray"/g)).toHaveLength(9);
    expect(svg).toMatch(/style="--i:0;--a:[-\d.]+deg;transform-origin:[\d.]+px [\d.]+px"/);
    expect(svg).toContain('mask="url(#sun-mark-arc)"');
  });

  it('sits in the brown band of the home page', () => {
    const { body } = renderHomePage({ lang: 'es', base: '/', pictures: TEST_PICTURES });
    expect(body).toMatch(/id="pedir">\s*<div class="band__inner">\s*<svg class="sun-mark"/);
  });
});

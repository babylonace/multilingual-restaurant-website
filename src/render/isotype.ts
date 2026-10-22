import { raw, type SafeHtml } from '../lib/html';
import source from '../../assets-src/brand/inkawasi-icono-light.svg?raw';

/**
 * The official isotype for brown backgrounds (cream fork, gold sun), copied unchanged from the
 * design system. To animate the sun, its single path is split into the pieces it is drawn with:
 * the arc and the nine rays. Nothing is redrawn or recoloured: each piece keeps its exact path
 * data, only the subpaths that started with a relative `m` get their absolute start point.
 *
 * The geometry the animation needs (the arc's circle, where each ray starts and where it points)
 * is measured here from the path data, at build time.
 */
type Point = [number, number];

export interface Ray {
  d: string;
  /** Where the ray starts, next to the arc, relative to its own bounding box: it grows from here. */
  origin: Point;
  /** Direction from that start outwards, in degrees, clockwise on screen. */
  angle: number;
}

export interface SunArc {
  d: string;
  /** A centre-line along the arc, from its lower-left end over the top to its right end. */
  reveal: string;
  /** Stroke width that covers the arc's thickness, for the mask that draws it. */
  revealWidth: number;
}

export interface IsotypeParts {
  viewBox: string;
  /** The transform of the source's outer group, which places the drawing in its viewBox. */
  transform: string;
  sunFill: string;
  forkFill: string;
  fork: string;
  arc: SunArc;
  /** Rays in the order a sunrise lights them: from the lower left, over the top, to the right. */
  rays: Ray[];
}

function pathOf(svg: string, id: string): { d: string; fill: string } {
  const tag = new RegExp(`<path[^>]*id="${id}"[^>]*>`).exec(svg)?.[0];
  const d = tag && / d="([^"]*)"/.exec(tag)?.[1];
  const fill = tag && /fill:(#[0-9a-f]{6})/i.exec(tag)?.[1];
  if (!d || !fill) throw new Error(`Isotype SVG: no path "${id}"`);
  return { d, fill };
}

/** Splits a path into its subpaths, each starting with an absolute `M`. */
export function subpaths(d: string): { d: string; start: Point }[] {
  let start: Point = [0, 0];
  return d.split(/(?=[Mm])/).map((part) => {
    const move = /^([Mm])\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/.exec(part.trim());
    if (!move) throw new Error('Isotype SVG: subpath without a move-to');
    const [x, y] = [Number(move[2]), Number(move[3])];
    // After `z` the current point is the start of the closed subpath, so a relative `m` is
    // relative to that start.
    start = move[1] === 'M' ? [x, y] : [start[0] + x, start[1] + y];
    return { d: `M ${start[0]},${start[1]}${part.trim().slice(move[0].length)}`, start };
  });
}

/**
 * Points along a subpath made of an absolute move-to and cubic curves (`c`/`C`, the only commands
 * the isotype uses): each curve's end plus samples inside it, close enough to measure the shape.
 */
export function outline(d: string): Point[] {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  const points: Point[] = [];
  let command = '';
  let current: Point = [0, 0];
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i]!)) {
      command = tokens[i++]!;
      if (/z/i.test(command)) continue;
    }
    if (command === 'M') {
      current = [num(), num()];
      points.push(current);
    } else if (command === 'c' || command === 'C') {
      const [ox, oy] = command === 'c' ? current : [0, 0];
      const p1: Point = [ox + num(), oy + num()];
      const p2: Point = [ox + num(), oy + num()];
      const p3: Point = [ox + num(), oy + num()];
      for (let s = 1; s <= 8; s++) {
        const t = s / 8;
        const u = 1 - t;
        const at = (k: 0 | 1) =>
          u * u * u * current[k] +
          3 * u * u * t * p1[k] +
          3 * u * t * t * p2[k] +
          t * t * t * p3[k];
        points.push([at(0), at(1)]);
      }
      current = p3;
    } else {
      throw new Error(`Isotype SVG: unexpected command "${command}"`);
    }
  }
  return points;
}

/** Least-squares circle through the points (Kåsa's method). */
export function fitCircle(points: Point[]): { cx: number; cy: number } {
  // Solve for D, E, F in x² + y² + Dx + Ey + F = 0 with the normal equations.
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const v = [0, 0, 0];
  for (const [x, y] of points) {
    const row = [x, y, 1];
    const rhs = -(x * x + y * y);
    for (let r = 0; r < 3; r++) {
      v[r]! += row[r]! * rhs;
      for (let c = 0; c < 3; c++) m[r]![c]! += row[r]! * row[c]!;
    }
  }
  // Cramer's rule on the 3 × 3 system.
  const det = (a: number[][]) =>
    a[0]![0]! * (a[1]![1]! * a[2]![2]! - a[1]![2]! * a[2]![1]!) -
    a[0]![1]! * (a[1]![0]! * a[2]![2]! - a[1]![2]! * a[2]![0]!) +
    a[0]![2]! * (a[1]![0]! * a[2]![1]! - a[1]![1]! * a[2]![0]!);
  const base = det(m);
  const solve = (col: number) =>
    det(m.map((row, r) => row.map((x, c) => (c === col ? v[r]! : x)))) / base;
  return { cx: -solve(0) / 2, cy: -solve(1) / 2 };
}

const deg = (rad: number) => (rad * 180) / Math.PI;
/** Angle of a point seen from the centre, 0–360°, clockwise on screen (y points down). */
const bearing = ([x, y]: Point, cx: number, cy: number) =>
  (deg(Math.atan2(y - cy, x - cx)) + 360) % 360;
const round = (n: number) => Math.round(n * 100) / 100;

function measureArc(d: string): { arc: SunArc; cx: number; cy: number } {
  const points = outline(d);
  const { cx, cy } = fitCircle(points);
  const radii = points.map(([x, y]) => Math.hypot(x - cx, y - cy));
  const inner = Math.min(...radii);
  const outer = Math.max(...radii);
  const r = (inner + outer) / 2;
  const width = outer - inner;

  // The arc covers every bearing except one gap (lower right): it starts after the gap.
  const bearings = points.map((p) => bearing(p, cx, cy)).sort((a, b) => a - b);
  let gapEnd = bearings[0]!;
  let gap = bearings[0]! + 360 - bearings.at(-1)!;
  for (let k = 1; k < bearings.length; k++) {
    if (bearings[k]! - bearings[k - 1]! > gap) {
      gap = bearings[k]! - bearings[k - 1]!;
      gapEnd = bearings[k]!;
    }
  }
  // Run a little past both ends so the rounded caps are drawn too.
  const pad = deg(width / r);
  const from = gapEnd - pad;
  const sweep = 360 - gap + 2 * pad;
  const at = (a: number): Point => [
    round(cx + r * Math.cos((a * Math.PI) / 180)),
    round(cy + r * Math.sin((a * Math.PI) / 180)),
  ];
  const [x1, y1] = at(from);
  const [x2, y2] = at(from + sweep);
  return {
    arc: {
      d,
      reveal: `M ${x1},${y1} A ${round(r)},${round(r)} 0 ${sweep > 180 ? 1 : 0} 1 ${x2},${y2}`,
      revealWidth: round(width * 1.6),
    },
    cx,
    cy,
  };
}

function measureRay(d: string, cx: number, cy: number): Ray {
  const points = outline(d);
  const dist = ([x, y]: Point) => Math.hypot(x - cx, y - cy);
  const near = points.reduce((a, b) => (dist(b) < dist(a) ? b : a));
  const far = points.reduce((a, b) => (dist(b) > dist(a) ? b : a));
  const minX = Math.min(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  return {
    d,
    origin: [round(near[0] - minX), round(near[1] - minY)],
    angle: round(deg(Math.atan2(far[1] - near[1], far[0] - near[0]))),
  };
}

export function splitIsotype(svg: string): IsotypeParts {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  const transform = /<g[^>]*transform="([^"]+)"/.exec(svg)?.[1];
  if (!viewBox || !transform) throw new Error('Isotype SVG: unexpected structure');
  const sun = pathOf(svg, 'path25');
  const fork = pathOf(svg, 'path23');

  const pieces = subpaths(sun.d);
  // The arc is by far the longest piece; the rest are the rays.
  const arcPiece = pieces.reduce((a, b) => (b.d.length > a.d.length ? b : a));
  const { arc, cx, cy } = measureArc(arcPiece.d);

  // Around the sun's centre the rays run from about 120° (lower left) through 270° (top) to about
  // 350° (right); the empty gap is at the lower right, so sorting by bearing gives the sunrise.
  const rays = pieces
    .filter((p) => p !== arcPiece)
    .sort((a, b) => bearing(a.start, cx, cy) - bearing(b.start, cx, cy))
    .map((p) => measureRay(p.d, cx, cy));

  return { viewBox, transform, sunFill: sun.fill, forkFill: fork.fill, fork: fork.d, arc, rays };
}

const PARTS = splitIsotype(source);

/**
 * The isotype as inline SVG, decorative (`aria-hidden`). The arc is drawn through a mask whose
 * stroke the CSS animates; each ray carries its place in the sunrise (`--i`), its direction
 * (`--a`) and the point it grows from. client/reveal.ts starts it when the band comes into view.
 */
export function isotype(className: string): SafeHtml {
  const { viewBox, transform, sunFill, forkFill, fork, arc, rays } = PARTS;
  const mask = `${className}-arc`;
  return raw(
    `<svg class="${className}" data-reveal viewBox="${viewBox}" aria-hidden="true" focusable="false"><g transform="${transform}">` +
      `<mask id="${mask}"><path class="${className}__arc-reveal" d="${arc.reveal}" pathLength="1" fill="none" stroke="#fff" stroke-width="${arc.revealWidth}" stroke-linecap="round"/></mask>` +
      `<path class="${className}__arc" mask="url(#${mask})" fill="${sunFill}" d="${arc.d}"/>` +
      rays
        .map(
          (ray, i) =>
            `<path class="${className}__ray" style="--i:${i};--a:${ray.angle}deg;transform-origin:${ray.origin[0]}px ${ray.origin[1]}px" fill="${sunFill}" d="${ray.d}"/>`,
        )
        .join('') +
      `<path class="${className}__fork" fill="${forkFill}" d="${fork}"/>` +
      `</g></svg>`,
  );
}

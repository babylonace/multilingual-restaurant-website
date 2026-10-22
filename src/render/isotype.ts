import { raw, type SafeHtml } from '../lib/html';
import source from '../../assets-src/brand/inkawasi-icono-light.svg?raw';

/**
 * The official isotype for brown backgrounds (cream fork, gold sun), copied unchanged from the
 * design system. To animate the sun, its single path is split into the pieces it is drawn with:
 * the arc and the nine rays. Nothing is redrawn or recoloured: each piece keeps its exact path
 * data, only the subpaths that started with a relative `m` get their absolute start point.
 */
export interface IsotypeParts {
  viewBox: string;
  /** The transform of the source's outer group, which places the drawing in its viewBox. */
  transform: string;
  sunFill: string;
  forkFill: string;
  fork: string;
  arc: string;
  /** Rays in the order a sunrise lights them: from the lower left, over the top, to the right. */
  rays: string[];
}

function pathOf(svg: string, id: string): { d: string; fill: string } {
  const tag = new RegExp(`<path[^>]*id="${id}"[^>]*>`).exec(svg)?.[0];
  const d = tag && / d="([^"]*)"/.exec(tag)?.[1];
  const fill = tag && /fill:(#[0-9a-f]{6})/i.exec(tag)?.[1];
  if (!d || !fill) throw new Error(`Isotype SVG: no path "${id}"`);
  return { d, fill };
}

/** Splits a path into its subpaths, each starting with an absolute `M`. */
export function subpaths(d: string): { d: string; start: [number, number] }[] {
  let start: [number, number] = [0, 0];
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

export function splitIsotype(svg: string): IsotypeParts {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  const transform = /<g[^>]*transform="([^"]+)"/.exec(svg)?.[1];
  if (!viewBox || !transform) throw new Error('Isotype SVG: unexpected structure');
  const sun = pathOf(svg, 'path25');
  const fork = pathOf(svg, 'path23');

  const pieces = subpaths(sun.d);
  // The arc is by far the longest piece; the rest are the rays.
  const arc = pieces.reduce((a, b) => (b.d.length > a.d.length ? b : a));
  const rays = pieces.filter((p) => p !== arc);

  // Seen from any point inside the circle of rays, they keep their order around it. Angles grow
  // clockwise on screen (y points down) from the right: the rays run from about 120° (lower
  // left) through 270° (top) to about 340° (right), and the empty gap is at the lower right.
  const cx = rays.reduce((s, r) => s + r.start[0], 0) / rays.length;
  const cy = rays.reduce((s, r) => s + r.start[1], 0) / rays.length;
  const angle = ({ start: [x, y] }: { start: [number, number] }) =>
    (Math.atan2(y - cy, x - cx) * (180 / Math.PI) + 360) % 360;
  rays.sort((a, b) => angle(a) - angle(b));

  return {
    viewBox,
    transform,
    sunFill: sun.fill,
    forkFill: fork.fill,
    fork: fork.d,
    arc: arc.d,
    rays: rays.map((r) => r.d),
  };
}

const PARTS = splitIsotype(source);

/**
 * The isotype as inline SVG, decorative (`aria-hidden`). Each ray carries its place in the
 * sunrise (`--i`) for the CSS animation; client/sun.ts starts it when the band comes into view.
 */
export function isotype(className: string): SafeHtml {
  const { viewBox, transform, sunFill, forkFill, fork, arc, rays } = PARTS;
  return raw(
    `<svg class="${className}" viewBox="${viewBox}" aria-hidden="true" focusable="false"><g transform="${transform}">` +
      `<path class="${className}__arc" fill="${sunFill}" d="${arc}"/>` +
      rays
        .map(
          (d, i) => `<path class="${className}__ray" style="--i:${i}" fill="${sunFill}" d="${d}"/>`,
        )
        .join('') +
      `<path class="${className}__fork" fill="${forkFill}" d="${fork}"/>` +
      `</g></svg>`,
  );
}

/**
 * Plays an element's entrance (scroll.css) the first time it comes into view: the isotype's
 * sunrise in the brown band and the Andean borders of the olive band. Elements opt in with
 * `data-reveal`; this sets it to "waiting" while they are still off screen, then "in".
 *
 * An element is only hidden once we know it will animate: not without IntersectionObserver and
 * not with reduced motion. One already on screen at load plays straight away. After it is in,
 * `data-offscreen` pauses any looping animation while it is out of view.
 */
export function initReveal(): void {
  const elements = document.querySelectorAll<HTMLElement | SVGElement>('[data-reveal]');
  if (!elements.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const THRESHOLD = 0.5;
  const seen = new WeakSet<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting, intersectionRatio } of entries) {
        const el = target as HTMLElement | SVGElement;
        if (!seen.has(el)) {
          seen.add(el);
          el.dataset.reveal = isIntersecting ? 'in' : 'waiting';
          continue;
        }
        if (el.dataset.reveal === 'waiting' && intersectionRatio >= THRESHOLD) {
          el.dataset.reveal = 'in';
        }
        if (el.dataset.reveal === 'in') {
          if (isIntersecting) delete el.dataset.offscreen;
          else el.dataset.offscreen = '';
        }
      }
    },
    { threshold: [0, THRESHOLD] },
  );
  elements.forEach((el) => observer.observe(el));
}

/**
 * Plays an element's entrance (scroll.css) once it is properly in view: the isotype's sunrise in
 * the brown band and the Andean borders of the olive band. Elements opt in with `data-reveal`;
 * this sets it to "waiting" until they are in view, then "in".
 *
 * "In view" means the whole element is on screen, its bottom edge above the bottom tenth of the
 * window: a sun peeking in at the bottom while the visitor is still looking at the photo does not
 * count, or the sunrise would be over before they get there. An element that is already wholly in
 * view at load plays straight away.
 *
 * Nothing is hidden unless it will animate: not without IntersectionObserver and not with reduced
 * motion. Once in, `data-offscreen` pauses the animation while the element is out of view.
 */
/** Practically all of it: 1 exactly can be missed by sub-pixel rounding. */
const VISIBLE = 0.99;

export function initReveal(): void {
  const elements = document.querySelectorAll<HTMLElement | SVGElement>('[data-reveal]');
  if (!elements.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting, intersectionRatio } of entries) {
        const el = target as HTMLElement | SVGElement;
        const inView = intersectionRatio >= VISIBLE;
        if (el.dataset.reveal === '' || el.dataset.reveal === 'waiting') {
          el.dataset.reveal = inView ? 'in' : 'waiting';
        }
        if (el.dataset.reveal === 'in') {
          if (isIntersecting) delete el.dataset.offscreen;
          else el.dataset.offscreen = '';
        }
      }
    },
    { threshold: [0, VISIBLE], rootMargin: '0px 0px -10% 0px' },
  );
  elements.forEach((el) => observer.observe(el));
}

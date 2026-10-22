/**
 * Amanecer: plays the isotype's sunrise (scroll.css) the first time the brown band comes into view.
 * The isotype is only hidden once we know it will animate: not without IntersectionObserver, not
 * with reduced motion, and not if the band is already on screen when the page loads.
 */
export function initSun(): void {
  const mark = document.querySelector<SVGElement>('.sun-mark');
  if (!mark || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let first = true;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry) return;
      if (first) {
        first = false;
        if (entry.isIntersecting) return observer.disconnect();
        mark.dataset.sun = 'waiting';
        return;
      }
      if (entry.intersectionRatio >= 0.6) {
        mark.dataset.sun = 'up';
        observer.disconnect();
      }
    },
    { threshold: 0.6 },
  );
  observer.observe(mark);
}

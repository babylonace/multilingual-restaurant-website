import { LANG_STORAGE_KEY } from './lang-pref';

/**
 * The language switcher is a native <details>, so it opens, closes and navigates without
 * JavaScript. This adds what <details> lacks: Escape to close (returning focus to the
 * trigger), outside-click to close, and remembering the visitor's explicit choice.
 */
export function initLangMenu(): void {
  const menu = document.querySelector<HTMLDetailsElement>('[data-lang-menu]');
  if (!menu) return;
  const trigger = menu.querySelector<HTMLElement>('summary');

  document.addEventListener('click', (event) => {
    if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
  });

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      trigger?.focus();
    }
  });

  menu.addEventListener('click', (event) => {
    const option = (event.target as Element).closest<HTMLAnchorElement>('a[data-lang]');
    if (!option?.dataset.lang) return;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, option.dataset.lang);
    } catch {
      /* storage can be unavailable (private mode); navigation still works */
    }
  });
}

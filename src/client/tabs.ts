/**
 * Progressive enhancement for the pre-rendered WAI-ARIA tabs.
 *
 * The HTML already contains every panel (only the first visible), so the carta stays
 * readable and indexable without JavaScript. This module adds click, keyboard
 * (arrows / Home / End, mirrored in RTL) and deep-link (`#marino`) behaviour.
 */
export function initTabs(): void {
  const tablist = document.querySelector<HTMLElement>('[role="tablist"]');
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panelOf = (tab: HTMLElement) =>
    document.getElementById(tab.getAttribute('aria-controls') ?? '');

  function select(tab: HTMLButtonElement, { focus = false, updateHash = true } = {}): void {
    for (const t of tabs) {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      const panel = panelOf(t);
      if (panel) panel.hidden = !selected;
    }
    tab.scrollIntoView({ block: 'nearest', inline: 'center' });
    if (focus) tab.focus();
    if (updateHash && tab.dataset.tab) history.replaceState(null, '', `#${tab.dataset.tab}`);
  }

  function fromHash(): HTMLButtonElement | undefined {
    const id = decodeURIComponent(location.hash.slice(1));
    return tabs.find((t) => t.dataset.tab === id);
  }

  tablist.addEventListener('click', (event) => {
    const tab = (event.target as Element).closest<HTMLButtonElement>('[role="tab"]');
    if (tab) select(tab);
  });

  tablist.addEventListener('keydown', (event) => {
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1) return;

    const rtl = getComputedStyle(tablist).direction === 'rtl';
    const step = rtl ? -1 : 1;
    let next: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
        next = current + step;
        break;
      case 'ArrowLeft':
        next = current - step;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const target = tabs[(next + tabs.length) % tabs.length];
    if (target) select(target, { focus: true });
  });

  window.addEventListener('hashchange', () => {
    const tab = fromHash();
    if (tab) select(tab, { updateHash: false });
  });

  const initial = fromHash();
  if (initial) select(initial, { updateHash: false });
}

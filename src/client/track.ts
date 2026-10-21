/**
 * Click events for the analytics script. Links declare what they are with
 * `data-event="whatsapp_clic" data-prop-intent="reservar"`; nothing is sent until a script
 * such as Umami defines `window.umami`, so the site sets no cookies and loads nothing by itself.
 */
export interface TrackedEvent {
  name: string;
  props: Record<string, string>;
}

declare global {
  interface Window {
    umami?: { track(name: string, props?: Record<string, string>): void };
  }
}

/** Reads `data-event` and every `data-prop-*` attribute of an element. */
export function readEvent(dataset: DOMStringMap): TrackedEvent | undefined {
  const name = dataset.event;
  if (!name) return undefined;
  const props: Record<string, string> = {};
  for (const [key, value] of Object.entries(dataset)) {
    if (!key.startsWith('prop') || key.length === 4 || value === undefined) continue;
    props[key.charAt(4).toLowerCase() + key.slice(5)] = value;
  }
  return { name, props };
}

export function initTracking(): void {
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest<HTMLElement>('[data-event]');
    const tracked = link && readEvent(link.dataset);
    if (tracked) window.umami?.track(tracked.name, tracked.props);
  });
}

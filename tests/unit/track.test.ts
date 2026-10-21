import { describe, expect, it } from 'vitest';
import { readEvent } from '../../src/client/track';

describe('readEvent', () => {
  it('reads the event name and every data-prop-* attribute', () => {
    expect(
      readEvent({ event: 'whatsapp_clic', propIntent: 'reservar', propLocation: 'carta' }),
    ).toEqual({ name: 'whatsapp_clic', props: { intent: 'reservar', location: 'carta' } });
  });

  it('ignores elements without an event and unrelated data attributes', () => {
    expect(readEvent({ propIntent: 'reservar' })).toBeUndefined();
    expect(readEvent({ event: 'llegar_clic', tab: 'marino' })).toEqual({
      name: 'llegar_clic',
      props: {},
    });
  });
});

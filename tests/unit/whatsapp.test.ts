import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/data/langs';
import { WHATSAPP_INTENTS, WHATSAPP_MESSAGES } from '../../src/data/whatsapp';
import { intentMessage, whatsappLink } from '../../src/lib/whatsapp';
import { CONTACT, justEatLink, whatsappIntentLink } from '../../src/render/contact';

const decode = (url: string) => decodeURIComponent(new URL(url).searchParams.get('text') ?? '');

describe('whatsappLink', () => {
  it('uses the number and an encoded text, never a saved-message link', () => {
    const url = whatsappLink('34614922183', 'Hola & adiós\nNombre: ');
    expect(url).toBe('https://wa.me/34614922183?text=Hola%20%26%20adi%C3%B3s%0ANombre%3A%20');
    expect(url).not.toContain('/message/');
  });
});

describe.each(WHATSAPP_INTENTS)('intent "%s"', (intent) => {
  it('opens the restaurant chat with its message already written', () => {
    const url = whatsappIntentLink(intent, 'es');
    expect(url.startsWith(`https://wa.me/${CONTACT.whatsappNumber}?text=`)).toBe(true);
    expect(decode(url)).toBe(WHATSAPP_MESSAGES[intent]);
  });

  it('adds the visitor language outside Spanish, so the staff know how to answer', () => {
    expect(intentMessage(intent, 'es')).not.toContain('Idioma');
    for (const { code, label } of LANGS.filter((l) => l.code !== 'es')) {
      expect(decode(whatsappIntentLink(intent, code))).toMatch(new RegExp(`\\nIdioma: ${label}$`));
    }
  });
});

describe('messages', () => {
  it('lets the visitor fill in the blanks for booking and ordering', () => {
    expect(WHATSAPP_MESSAGES.reservar).toMatch(/Nombre: \nDía: \nHora: \nPersonas: $/);
    expect(WHATSAPP_MESSAGES.recoger).toMatch(/Nombre: \nHora: \nPedido: $/);
    expect(WHATSAPP_MESSAGES.domicilio).toMatch(/Nombre: \nDirección: \nPedido: $/);
  });
});

describe('justEatLink', () => {
  it('keeps the confirmed URL and tags where the click came from', () => {
    const url = new URL(justEatLink('carta'));
    expect(`${url.origin}${url.pathname}`).toBe(CONTACT.justEatUrl);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: 'inkawasi.es',
      utm_medium: 'web',
      utm_campaign: 'pedido',
      utm_content: 'carta',
    });
  });
});

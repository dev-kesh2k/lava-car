import { describe, expect, it } from 'vitest';
import { readyMessage, whatsappLink } from './whatsapp';

describe('WhatsApp', () => {
  it('monta a mensagem de carro pronto', () => {
    expect(readyMessage({ name: 'Maria Souza', model: 'Onix', plate: 'abc1234' })).toBe(
      'Olá Maria, seu Onix placa ABC-1234 já está limpo e pronto para retirada!',
    );
    expect(readyMessage({ name: '', model: '', plate: 'ABC1D23', shop: 'Lava Car' })).toContain('\n\nLava Car');
  });

  it('gera o link wa.me com texto codificado', () => {
    const link = whatsappLink('(45) 99999-0000', 'Olá João, tudo pronto!');
    expect(link).toBe('https://wa.me/5545999990000?text=Ol%C3%A1%20Jo%C3%A3o%2C%20tudo%20pronto!');
  });

  it('sem telefone válido não há link', () => {
    expect(whatsappLink(null, 'oi')).toBeNull();
    expect(whatsappLink('123', 'oi')).toBeNull();
  });
});

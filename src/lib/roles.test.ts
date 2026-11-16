import { describe, expect, it } from 'vitest';
import { canAccess, homeFor } from './roles';

describe('controle de rotas por perfil', () => {
  it('cliente só acessa a área do cliente', () => {
    expect(canAccess('CUSTOMER', 'customer')).toBe(true);
    expect(canAccess('CUSTOMER', 'yard')).toBe(false);
    expect(canAccess('CUSTOMER', 'admin')).toBe(false);
  });

  it('operador acessa o pátio mas não o financeiro', () => {
    expect(canAccess('OPERATOR', 'yard')).toBe(true);
    expect(canAccess('OPERATOR', 'admin')).toBe(false);
  });

  it('dono acessa tudo', () => {
    expect(canAccess('ADMIN', 'admin')).toBe(true);
    expect(canAccess('ADMIN', 'yard')).toBe(true);
  });

  it('sem perfil não acessa nada', () => {
    expect(canAccess(null, 'customer')).toBe(false);
  });

  it('cada papel tem sua tela inicial', () => {
    expect(homeFor('ADMIN')).toBe('/admin');
    expect(homeFor('OPERATOR')).toBe('/patio');
    expect(homeFor('CUSTOMER')).toBe('/');
  });
});

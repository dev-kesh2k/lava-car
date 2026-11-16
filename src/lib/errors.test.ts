import { describe, expect, it } from 'vitest';
import { errorMessage } from './errors';

describe('mensagens de erro', () => {
  it('mantém as mensagens em português do banco', () => {
    expect(errorMessage({ message: 'Horário esgotado, escolha outro', code: '23P01' })).toBe('Horário esgotado, escolha outro');
  });

  it('traduz erros comuns', () => {
    expect(errorMessage({ message: 'duplicate key', code: '23505' })).toMatch(/já existe/);
    expect(errorMessage({ message: 'new row violates row-level security policy', code: '42501' })).toBe('Você não tem permissão para isso.');
    expect(errorMessage({ message: 'Invalid login credentials' })).toBe('E-mail ou senha incorretos.');
    expect(errorMessage(new TypeError('Failed to fetch'))).toMatch(/Sem conexão/);
  });

  it('usa o texto padrão quando não há detalhe', () => {
    expect(errorMessage(null, 'Falhou')).toBe('Falhou');
    expect(errorMessage({}, 'Falhou')).toBe('Falhou');
  });
});

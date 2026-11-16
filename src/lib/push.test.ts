import { describe, expect, it } from 'vitest';
import { urlBase64ToUint8Array } from './push';

describe('Web Push', () => {
  it('decodifica a chave VAPID em base64url', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3]);
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255]);
  });

  it('uma chave VAPID real tem 65 bytes', () => {
    const key = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    expect(urlBase64ToUint8Array(key)).toHaveLength(65);
  });
});

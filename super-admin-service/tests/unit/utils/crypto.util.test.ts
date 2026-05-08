import { describe, it, expect } from 'vitest';
import { randomToken, sha256, randomTempPassword } from '../../../src/utils/crypto.util';

describe('randomToken', () => {
  it('devuelve un string hexadecimal de la longitud correcta', () => {
    const token = randomToken();
    expect(typeof token).toBe('string');
    expect(token).toHaveLength(128); // 64 bytes × 2 chars hex
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it('acepta bytes personalizados', () => {
    const token = randomToken(32);
    expect(token).toHaveLength(64);
  });

  it('produce valores distintos en cada llamada', () => {
    expect(randomToken()).not.toBe(randomToken());
  });
});

describe('sha256', () => {
  it('devuelve un string hex de 64 caracteres', () => {
    const hash = sha256('hola mundo');
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it('es determinístico para el mismo input', () => {
    expect(sha256('valor-test')).toBe(sha256('valor-test'));
  });

  it('produce hashes distintos para inputs distintos', () => {
    expect(sha256('a')).not.toBe(sha256('b'));
  });
});

describe('randomTempPassword', () => {
  it('devuelve un string hexadecimal', () => {
    const pwd = randomTempPassword();
    expect(/^[0-9a-f]+$/.test(pwd)).toBe(true);
    expect(pwd).toHaveLength(16); // 8 bytes × 2 chars
  });

  it('acepta bytes personalizados', () => {
    const pwd = randomTempPassword(16);
    expect(pwd).toHaveLength(32);
  });

  it('produce valores distintos en cada llamada', () => {
    expect(randomTempPassword()).not.toBe(randomTempPassword());
  });
});

import { describe, it, expect } from 'vitest';
import { signJwt, verifyJwt } from '../../../src/utils/jwt.util';

const PAYLOAD = { id: 1, email: 'superadmin@test.com', rol: 'super_admin' as const };

describe('signJwt', () => {
  it('retorna un string JWT con tres partes', () => {
    const token = signJwt(PAYLOAD);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('genera tokens distintos para diferentes payloads', () => {
    const t1 = signJwt({ ...PAYLOAD, id: 1 });
    const t2 = signJwt({ ...PAYLOAD, id: 2 });
    expect(t1).not.toBe(t2);
  });
});

describe('verifyJwt', () => {
  it('retorna el payload original', () => {
    const token = signJwt(PAYLOAD);
    const result = verifyJwt(token);
    expect(result.id).toBe(PAYLOAD.id);
    expect(result.email).toBe(PAYLOAD.email);
    expect(result.rol).toBe('super_admin');
  });

  it('lanza error con token inválido', () => {
    expect(() => verifyJwt('no.es.un.token.valido')).toThrow();
  });

  it('lanza error con token manipulado', () => {
    const token = signJwt(PAYLOAD);
    const partes = token.split('.');
    partes[1] = Buffer.from(JSON.stringify({ id: 99, rol: 'super_admin' })).toString('base64url');
    expect(() => verifyJwt(partes.join('.'))).toThrow();
  });

  it('lanza error con string vacío', () => {
    expect(() => verifyJwt('')).toThrow();
  });
});

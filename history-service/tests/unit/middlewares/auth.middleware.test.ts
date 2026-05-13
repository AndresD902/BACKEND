import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../../../src/middlewares/auth.middleware';
import { UnauthorizedError } from '../../../src/shared/errors/unauthorized.error';

vi.mock('../../../src/config/env', () => ({
  env: { jwtSecret: 'test-secret-key-for-history-service-32chars!!' },
}));

const SECRET = 'test-secret-key-for-history-service-32chars!!';

function makeReq(authHeader?: string) {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as any;
}

const res  = {} as any;
const next = vi.fn();

beforeEach(() => vi.clearAllMocks());

describe('verifyToken', () => {
  it('calls next(UnauthorizedError) when authorization header is missing', () => {
    verifyToken(makeReq(), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(next.mock.calls[0][0].message).toBe('Token requerido');
  });

  it('calls next(UnauthorizedError) when header does not start with Bearer', () => {
    verifyToken(makeReq('Basic abc123'), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next(UnauthorizedError) for an invalid token', () => {
    verifyToken(makeReq('Bearer not.a.valid.token'), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(next.mock.calls[0][0].message).toBe('Token inválido o expirado');
  });

  it('calls next(UnauthorizedError) for a token signed with the wrong secret', () => {
    const token = jwt.sign({ id: '1', email: 'x@x.com', rol: 'ADMIN' }, 'wrong-secret');
    verifyToken(makeReq(`Bearer ${token}`), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('attaches user to req and calls next() for a valid token with id field', () => {
    const token = jwt.sign({ id: '42', email: 'admin@test.com', rol: 'ADMIN' }, SECRET);
    const req = makeReq(`Bearer ${token}`);

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ id: '42', email: 'admin@test.com', rol: 'ADMIN' });
  });

  it('attaches user using sub field when id is absent', () => {
    const token = jwt.sign({ sub: 'u-99', email: 'hr@test.com', rol: 'HR' }, SECRET);
    const req = makeReq(`Bearer ${token}`);

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ id: 'u-99', email: 'hr@test.com', rol: 'HR' });
  });

  it('reads role from role field when rol is absent', () => {
    const token = jwt.sign({ id: '1', email: 'a@b.com', role: 'CONSULTATION' }, SECRET);
    const req = makeReq(`Bearer ${token}`);

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user?.rol).toBe('CONSULTATION');
  });
});

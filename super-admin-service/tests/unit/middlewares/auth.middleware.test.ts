import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../../src/shared/errors/unauthorized.error';
import { AppError } from '../../../src/shared/errors/app-error';

vi.mock('../../../src/utils/jwt.util', () => ({
  verifyJwt: vi.fn(),
}));

vi.mock('../../../src/config/env', () => ({
  env: {
    registerSecret: 'test-register-secret-value',
    jwtSecret: 'test-jwt-secret-at-least-32-characters-long!!',
    jwtExpiresIn: '1h',
  },
}));

import { verifyJwt } from '../../../src/utils/jwt.util';
import {
  verifySuperAdminToken,
  verifyRegisterSecret,
  type AuthenticatedRequest,
} from '../../../src/middlewares/auth.middleware';

const mockVerifyJwt = vi.mocked(verifyJwt);

function makeRes() {
  return {} as Response;
}

describe('verifySuperAdminToken', () => {
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('llama a next con UnauthorizedError si no hay header Authorization', () => {
    const req = { headers: {} } as AuthenticatedRequest;

    verifySuperAdminToken(req, makeRes(), next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    const err = next.mock.calls[0][0] as UnauthorizedError;
    expect(err.statusCode).toBe(401);
  });

  it('llama a next con UnauthorizedError si el header no empieza con Bearer', () => {
    const req = { headers: { authorization: 'Basic abc123' } } as AuthenticatedRequest;

    verifySuperAdminToken(req, makeRes(), next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('llama a next con AppError 403 si el rol no es super_admin', () => {
    mockVerifyJwt.mockReturnValueOnce({ id: 1, email: 'admin@test.com', rol: 'admin' as unknown as 'super_admin' });
    const req = { headers: { authorization: 'Bearer valid.token' } } as AuthenticatedRequest;

    verifySuperAdminToken(req, makeRes(), next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('adjunta el payload al request y llama a next sin error para token válido', () => {
    const payload = { id: 1, email: 'super@test.com', rol: 'super_admin' as const };
    mockVerifyJwt.mockReturnValueOnce(payload);
    const req = { headers: { authorization: 'Bearer valid.token' } } as AuthenticatedRequest;

    verifySuperAdminToken(req, makeRes(), next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect(req.superAdmin).toEqual(payload);
  });

  it('llama a next con UnauthorizedError si verifyJwt lanza', () => {
    mockVerifyJwt.mockImplementationOnce(() => { throw new Error('jwt malformed'); });
    const req = { headers: { authorization: 'Bearer bad.token' } } as AuthenticatedRequest;

    verifySuperAdminToken(req, makeRes(), next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    const err = next.mock.calls[0][0] as UnauthorizedError;
    expect(err.statusCode).toBe(401);
  });
});

describe('verifyRegisterSecret', () => {
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    next = vi.fn();
  });

  it('llama a next con AppError 403 si el secreto es incorrecto', () => {
    const req = {
      headers: { 'x-register-secret': 'secreto-incorrecto' },
    } as unknown as Request;

    verifyRegisterSecret(req, makeRes(), next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('llama a next sin error si el secreto es correcto', () => {
    const req = {
      headers: { 'x-register-secret': 'test-register-secret-value' },
    } as unknown as Request;

    verifyRegisterSecret(req, makeRes(), next as NextFunction);

    expect(next).toHaveBeenCalledWith();
  });

  it('llama a next con error si no se provee el header', () => {
    const req = { headers: {} } as unknown as Request;

    verifyRegisterSecret(req, makeRes(), next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });
});

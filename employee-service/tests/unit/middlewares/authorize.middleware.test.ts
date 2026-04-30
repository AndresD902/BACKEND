import { Request, Response, NextFunction } from 'express';
import { requireRol } from '../../../src/middlewares/authorize.middleware';
import { AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';

function makeReq(user?: { id: string; email: string; rol: string }): Request {
  return { user } as unknown as Request;
}

function makeRes(): jest.Mocked<Response> {
  const res = {} as jest.Mocked<Response>;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireRol middleware', () => {
  const next = jest.fn() as unknown as NextFunction;

  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when req.user is not set', () => {
    const res = makeRes();
    requireRol('ADMIN')(makeReq(undefined), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No autenticado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is not in allowed list', () => {
    const res = makeRes();
    requireRol('ADMIN')(makeReq({ id: '1', email: 'hr@empresa.com', rol: 'HR' }), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'No tienes permisos para esta operación' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when user has allowed role (ADMIN)', () => {
    const res = makeRes();
    requireRol('ADMIN', 'HR')(makeReq({ id: '1', email: 'admin@empresa.com', rol: 'ADMIN' }), res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when user has allowed role (HR)', () => {
    requireRol('ADMIN', 'HR')(makeReq({ id: '2', email: 'hr@empresa.com', rol: 'HR' }), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('allows CONSULTATION role when included', () => {
    requireRol('CONSULTATION')(makeReq({ id: '3', email: 'c@empresa.com', rol: 'CONSULTATION' }), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

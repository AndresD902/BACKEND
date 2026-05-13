import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireRol } from '../../../src/middlewares/authorize.middleware';

function mockRes() {
  const r = { status: vi.fn(), json: vi.fn() } as any;
  r.status.mockReturnValue(r);
  r.json.mockReturnValue(r);
  return r;
}

const next = vi.fn();

beforeEach(() => vi.clearAllMocks());

describe('requireRol', () => {
  it('responds 401 when req.user is missing', () => {
    const middleware = requireRol('ADMIN');
    const res = mockRes();

    middleware({ headers: {} } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No autenticado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 403 when user role is not in allowed list', () => {
    const middleware = requireRol('ADMIN');
    const res = mockRes();

    middleware({ user: { id: '1', email: 'x@x.com', rol: 'CONSULTATION' } } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'No tienes permisos para esta operación' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when user role matches one of the allowed roles', () => {
    const middleware = requireRol('ADMIN', 'HR');
    const res = mockRes();

    middleware({ user: { id: '1', email: 'hr@x.com', rol: 'HR' } } as any, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() for ADMIN when ADMIN is the only allowed role', () => {
    const middleware = requireRol('ADMIN');
    const res = mockRes();

    middleware({ user: { id: '1', email: 'admin@x.com', rol: 'ADMIN' } } as any, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('creates independent middleware instances for different role sets', () => {
    const adminOnly  = requireRol('ADMIN');
    const hrOrAdmin  = requireRol('ADMIN', 'HR');
    const res1 = mockRes();
    const res2 = mockRes();
    const req = { user: { id: '1', email: 'hr@x.com', rol: 'HR' } } as any;

    adminOnly(req, res1, next);
    hrOrAdmin(req, res2, next);

    expect(res1.status).toHaveBeenCalledWith(403);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

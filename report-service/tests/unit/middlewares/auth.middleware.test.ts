import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { verifyToken, requireRol, AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';

jest.mock('jsonwebtoken');

function buildReq(authHeader?: string): AuthenticatedRequest {
  return { headers: { authorization: authHeader } } as unknown as AuthenticatedRequest;
}

function buildRes(): jest.Mocked<Response> {
  const r = {} as jest.Mocked<Response>;
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r;
}

const next = jest.fn() as NextFunction;

describe('verifyToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when Authorization header is missing', () => {
    const req = buildReq();
    const res = buildRes();
    verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when header does not start with Bearer', () => {
    const req = buildReq('Basic abc');
    const res = buildRes();
    verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when token is invalid', () => {
    jest.mocked(jwt.verify).mockImplementation(() => { throw new Error('invalid'); });
    const req = buildReq('Bearer bad-token');
    const res = buildRes();
    verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('calls next and populates req.user on valid token', () => {
    jest.mocked(jwt.verify).mockReturnValue({ sub: '1', email: 'a@b.com', role: 'ADMIN' } as never);
    const req = buildReq('Bearer valid-token');
    const res = buildRes();
    verifyToken(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user?.email).toBe('a@b.com');
    expect(req.user?.rol).toBe('ADMIN');
  });
});

describe('requireRol', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when no user on request', () => {
    const req = { headers: {} } as unknown as Request;
    const res = buildRes();
    requireRol('ADMIN')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when user role is not allowed', () => {
    const req = { headers: {}, user: { rol: 'CONSULTATION' } } as unknown as Request;
    const res = buildRes();
    requireRol('ADMIN', 'HR')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calls next when user role is allowed', () => {
    const req = { headers: {}, user: { rol: 'ADMIN' } } as unknown as Request;
    const res = buildRes();
    requireRol('ADMIN', 'HR')(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

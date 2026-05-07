import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import {
  verifyToken,
  requireRol,
  AuthenticatedRequest,
} from '../../../src/middlewares/auth.middleware';

vi.mock('jsonwebtoken');

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildReq(authHeader?: string): AuthenticatedRequest {
  return { headers: { authorization: authHeader } } as unknown as AuthenticatedRequest;
}

function buildRes(): vi.Mocked<Response> {
  const r = {} as vi.Mocked<Response>;
  r.status = vi.fn().mockReturnValue(r);
  r.json   = vi.fn().mockReturnValue(r);
  return r;
}

const next = vi.fn() as NextFunction;

// ─── verifyToken ──────────────────────────────────────────────────────────────

describe('verifyToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when Authorization header is missing', () => {
    verifyToken(buildReq(), buildRes(), next);

    expect(buildRes().status).not.toHaveBeenCalled(); // guard: res not reused
    const res = buildRes();
    verifyToken(buildReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when header does not start with Bearer', () => {
    const res = buildRes();
    verifyToken(buildReq('Basic abc123'), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when jwt.verify throws', () => {
    vi.mocked(jwt.verify).mockImplementation(() => { throw new Error('invalid signature'); });
    const res = buildRes();
    verifyToken(buildReq('Bearer bad-token'), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and populates req.user using the rol field', () => {
    vi.mocked(jwt.verify).mockReturnValue({
      id: '42', email: 'user@empresa.com', rol: 'ADMIN',
    } as never);
    const req = buildReq('Bearer valid-token');
    const res = buildRes();

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ id: '42', email: 'user@empresa.com', rol: 'ADMIN' });
  });

  it('falls back to sub when id is absent and role when rol is absent', () => {
    vi.mocked(jwt.verify).mockReturnValue({
      sub: 'uuid-abc', email: 'other@empresa.com', role: 'HR',
    } as never);
    const req = buildReq('Bearer valid-token');

    verifyToken(req, buildRes(), next);

    expect(req.user?.id).toBe('uuid-abc');
    expect(req.user?.rol).toBe('HR');
  });
});

// ─── requireRol ───────────────────────────────────────────────────────────────

describe('requireRol', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when there is no user on the request', () => {
    const req = { headers: {} } as unknown as Request;
    const res = buildRes();
    requireRol('ADMIN')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is not in the allowed list', () => {
    const req = { headers: {}, user: { rol: 'CONSULTATION' } } as unknown as Request;
    const res = buildRes();
    requireRol('ADMIN', 'HR')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when user role matches exactly one of the allowed roles', () => {
    const req = { headers: {}, user: { rol: 'HR' } } as unknown as Request;
    requireRol('ADMIN', 'HR')(req, buildRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('calls next when only one role is allowed and it matches', () => {
    const req = { headers: {}, user: { rol: 'ADMIN' } } as unknown as Request;
    requireRol('ADMIN')(req, buildRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });
});

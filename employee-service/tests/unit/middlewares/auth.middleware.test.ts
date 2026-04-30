import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { verifyToken, AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';

jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

function makeReq(authHeader?: string): AuthenticatedRequest {
  return { headers: { authorization: authHeader } } as unknown as AuthenticatedRequest;
}

function makeRes(): jest.Mocked<Response> {
  const res = {} as jest.Mocked<Response>;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('verifyToken middleware', () => {
  const next = jest.fn() as unknown as NextFunction;

  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when Authorization header is missing', () => {
    verifyToken(makeReq(undefined), makeRes(), next);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when header scheme is not Bearer', () => {
    const res = makeRes();
    verifyToken(makeReq('Basic abc123'), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.user using role field and calls next on valid token', () => {
    const payload = { sub: '1', email: 'admin@empresa.com', role: 'ADMIN' };
    (mockJwt.verify as jest.Mock).mockReturnValue(payload);
    const req = makeReq('Bearer validtoken');
    const res = makeRes();
    verifyToken(req, res, next);
    expect(req.user).toEqual({ id: '1', email: 'admin@empresa.com', rol: 'ADMIN' });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('sets req.user using rol field (fallback for internal format)', () => {
    const payload = { id: '2', email: 'hr@empresa.com', rol: 'HR' };
    (mockJwt.verify as jest.Mock).mockReturnValue(payload);
    const req = makeReq('Bearer validtoken');
    verifyToken(req, makeRes(), next);
    expect(req.user).toEqual({ id: '2', email: 'hr@empresa.com', rol: 'HR' });
  });

  it('returns 401 on expired or invalid token', () => {
    (mockJwt.verify as jest.Mock).mockImplementation(() => { throw new Error('jwt expired'); });
    const res = makeRes();
    verifyToken(makeReq('Bearer badtoken'), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
  });
});

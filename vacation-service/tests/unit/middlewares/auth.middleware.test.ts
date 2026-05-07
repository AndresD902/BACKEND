import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';

jest.mock('jsonwebtoken');
jest.mock('../../../src/config/env', () => ({
  env: { jwtSecret: 'test-secret' },
}));

const mockVerify = jwt.verify as jest.MockedFunction<typeof jwt.verify>;

function makeRes(): Response {
  return {} as Response;
}

function makeNext(): jest.Mock {
  return jest.fn();
}

describe('authenticate', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls next with UnauthorizedError when Authorization header is missing', () => {
    const req  = { headers: {} } as Request;
    const next = makeNext();
    authenticate(req as AuthenticatedRequest, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with UnauthorizedError when scheme is not Bearer', () => {
    const req  = { headers: { authorization: 'Basic token123' } } as Request;
    const next = makeNext();
    authenticate(req as AuthenticatedRequest, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('sets req.user and calls next() on a valid token', () => {
    const payload = { sub: '1', email: 'a@b.com', role: 'ADMIN' };
    mockVerify.mockReturnValue(payload as unknown as ReturnType<typeof jwt.verify>);

    const req  = { headers: { authorization: 'Bearer validtoken' } } as Request;
    const next = makeNext();
    authenticate(req as AuthenticatedRequest, makeRes(), next);

    expect((req as AuthenticatedRequest).user).toEqual(payload);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with UnauthorizedError when token is invalid', () => {
    mockVerify.mockImplementation(() => { throw new Error('invalid'); });
    const req  = { headers: { authorization: 'Bearer badtoken' } } as Request;
    const next = makeNext();
    authenticate(req as AuthenticatedRequest, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

describe('authorize', () => {
  it('calls next() when user has an allowed role', () => {
    const req  = { user: { sub: '1', email: 'a@b.com', role: 'HR' } } as AuthenticatedRequest;
    const next = makeNext();
    authorize('ADMIN', 'HR')(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with ForbiddenError when role is not allowed', () => {
    const req  = { user: { sub: '1', email: 'a@b.com', role: 'CONSULTATION' } } as AuthenticatedRequest;
    const next = makeNext();
    authorize('ADMIN', 'HR')(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('calls next with ForbiddenError when user is not set', () => {
    const req  = {} as AuthenticatedRequest;
    const next = makeNext();
    authorize('ADMIN')(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});

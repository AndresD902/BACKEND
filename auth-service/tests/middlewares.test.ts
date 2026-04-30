import { Request, Response, NextFunction } from 'express';
import { RoleName } from '../src/entities/role.entity';
import { authenticate, AuthenticatedRequest } from '../src/middlewares/auth.middleware';
import { authorize } from '../src/middlewares/authorize.middleware';
import { errorHandler } from '../src/middlewares/error-handler.middleware';
import { notFoundMiddleware } from '../src/middlewares/not-found.middleware';
import { validateRequest } from '../src/middlewares/validate-request.middleware';
import { AppError } from '../src/shared/errors/app-error';
import { ForbiddenError } from '../src/shared/errors/forbidden.error';
import { RequestValidationError } from '../src/shared/errors/request-validation.error';
import { UnauthorizedError } from '../src/shared/errors/unauthorized.error';
import { NotFoundError } from '../src/shared/errors/not-found.error';
import { verifyJwtToken } from '../src/utils/jwt.util';
import { z } from 'zod';

jest.mock('../src/config/env', () => ({
  env: {
    jwtSecret: 'test-secret',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 10,
  },
}));

jest.mock('../src/utils/jwt.util', () => ({
  verifyJwtToken: jest.fn(),
}));

function makeReq(overrides: Partial<Request & { user?: unknown }> = {}): AuthenticatedRequest {
  return { headers: {}, ...overrides } as AuthenticatedRequest;
}

function makeRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

const makeNext = (): NextFunction => jest.fn();

describe('authenticate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should throw UnauthorizedError when Authorization header is missing', () => {
    expect(() => authenticate(makeReq(), makeRes(), makeNext())).toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError for a non-Bearer scheme', () => {
    const req = makeReq({ headers: { authorization: 'Basic sometoken' } });
    expect(() => authenticate(req, makeRes(), makeNext())).toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when token part is missing after Bearer', () => {
    const req = makeReq({ headers: { authorization: 'Bearer ' } });
    expect(() => authenticate(req, makeRes(), makeNext())).toThrow(UnauthorizedError);
  });

  it('should call next with UnauthorizedError when verifyJwtToken throws', () => {
    (verifyJwtToken as jest.Mock).mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const req = makeReq({ headers: { authorization: 'Bearer bad-token' } });
    const next = makeNext();
    authenticate(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should attach payload to req.user and call next() when token is valid', () => {
    const payload = { sub: '1', email: 'a@test.com', role: RoleName.ADMIN };
    (verifyJwtToken as jest.Mock).mockReturnValue(payload);
    const req = makeReq({ headers: { authorization: 'Bearer valid' } });
    const next = makeNext();
    authenticate(req, makeRes(), next);
    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('authorize', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should call next with ForbiddenError when req.user is not set', () => {
    const next = makeNext();
    authorize(RoleName.ADMIN)(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('should call next with ForbiddenError when user role is not in the allowed list', () => {
    const req = makeReq({ user: { sub: '1', email: 'a@a.com', role: RoleName.CONSULTATION } } as any);
    const next = makeNext();
    authorize(RoleName.ADMIN)(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('should call next() when the user role matches the allowed role', () => {
    const req = makeReq({ user: { sub: '1', email: 'a@a.com', role: RoleName.ADMIN } } as any);
    const next = makeNext();
    authorize(RoleName.ADMIN)(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should call next() when the user role is one of multiple allowed roles', () => {
    const req = makeReq({ user: { sub: '2', email: 'hr@a.com', role: RoleName.HR } } as any);
    const next = makeNext();
    authorize(RoleName.ADMIN, RoleName.HR)(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('errorHandler', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('should respond with the AppError statusCode and body', () => {
    const err = new ForbiddenError('Access denied');
    const res = makeRes();
    errorHandler(err, makeReq(), res, makeNext());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Access denied',
        error: expect.objectContaining({ code: 'FORBIDDEN_ERROR' }),
      }),
    );
  });

  it('should include details: null when AppError has no details', () => {
    const err = new AppError('Something', 422, 'UNPROCESSABLE');
    const res = makeRes();
    errorHandler(err, makeReq(), res, makeNext());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ details: null }),
      }),
    );
  });

  it('should respond with 500 for non-AppError errors', () => {
    const err = new Error('Unexpected crash');
    const res = makeRes();
    errorHandler(err, makeReq(), res, makeNext());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Internal Server Error',
        error: expect.objectContaining({ code: 'INTERNAL_SERVER_ERROR', details: null }),
      }),
    );
  });
});

describe('validateRequest', () => {
  const schema = z.object({ name: z.string().min(1) });

  it('should assign parsed data to req.body and call next() for a valid payload', () => {
    const req = makeReq({ body: { name: 'valid' } } as any);
    const next = makeNext();
    validateRequest(schema)(req as Request, makeRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'valid' });
  });

  it('should call next with RequestValidationError for an invalid payload', () => {
    const req = makeReq({ body: {} } as any);
    const next = makeNext();
    validateRequest(schema)(req as Request, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(RequestValidationError));
  });

  it('should include field-level error details in RequestValidationError', () => {
    const req = makeReq({ body: { name: '' } } as any);
    const next = makeNext();
    validateRequest(schema)(req as Request, makeRes(), next);
    const err = (next as jest.Mock).mock.calls[0][0] as RequestValidationError;
    expect(err.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
    );
  });
});

describe('notFoundMiddleware', () => {
  it('should call next with a NotFoundError containing method and URL', () => {
    const req = makeReq({ method: 'GET', originalUrl: '/api/v1/missing' } as any);
    const next = makeNext();
    notFoundMiddleware(req as Request, makeRes(), next);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.message).toContain('GET');
    expect(err.message).toContain('/api/v1/missing');
  });
});

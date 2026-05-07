jest.mock('../../src/config/env', () => ({
  env: { jwtSecret: 'test-secret' },
}));

import { errorHandler } from '../../src/middlewares/error-handler.middleware';
import { authenticateToken, authorizeRoles } from '../../src/middlewares/auth.middleware';
import { AppError } from '../../src/shared/errors/app-error';
import { ConflictError } from '../../src/shared/errors/conflict.error';
import { NotFoundError } from '../../src/shared/errors/not-found.error';
import { ValidationError } from '../../src/shared/errors/validation.error';
import jwt from 'jsonwebtoken';

function mockRes() {
  const r = { status: jest.fn(), json: jest.fn() } as any;
  r.status.mockReturnValue(r);
  r.json.mockReturnValue(r);
  return r;
}

const next = jest.fn();

// ── Error classes ────────────────────────────────────────────────────────────

describe('Error classes — default message branch', () => {
  it('ConflictError uses default message when none provided', () => {
    const err = new ConflictError();
    expect(err.message).toBe('Resource conflict');
    expect(err.statusCode).toBe(409);
  });

  it('NotFoundError uses default message when none provided', () => {
    const err = new NotFoundError();
    expect(err.message).toBe('Resource not found');
    expect(err.statusCode).toBe(404);
  });

  it('ValidationError uses default message when none provided', () => {
    const err = new ValidationError();
    expect(err.message).toBe('Invalid request data');
    expect(err.statusCode).toBe(400);
  });
});

// ── errorHandler middleware ──────────────────────────────────────────────────

describe('errorHandler middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns structured JSON for AppError instances', () => {
    const response = mockRes();
    const error = new AppError('Not found', 404);

    errorHandler(error, {} as any, response, next);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Not found' }),
    );
  });

  it('returns 500 for unknown errors', () => {
    const response = mockRes();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(new Error('unexpected'), {} as any, response, next);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Internal server error' }),
    );
    consoleSpy.mockRestore();
  });
});

// ── authenticateToken middleware ─────────────────────────────────────────────

describe('authenticateToken middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no authorization header', () => {
    const req = { headers: {} } as any;
    authenticateToken(req, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('returns 401 when authorization header does not start with Bearer', () => {
    const req = { headers: { authorization: 'Basic abc' } } as any;
    authenticateToken(req, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('returns 401 for invalid or expired token', () => {
    const req = { headers: { authorization: 'Bearer invalid.token.here' } } as any;
    authenticateToken(req, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('returns 401 when token payload is missing required fields', () => {
    const token = jwt.sign({ extra: 'data' }, 'test-secret');
    const req = { headers: { authorization: `Bearer ${token}` } } as any;
    authenticateToken(req, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next without error when token is valid', () => {
    const token = jwt.sign({ sub: 'user-1', email: 'test@test.com', role: 'ADMIN' }, 'test-secret');
    const req = { headers: { authorization: `Bearer ${token}` } } as any;
    authenticateToken(req, {} as any, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ email: 'test@test.com', role: 'ADMIN' });
  });
});

// ── authorizeRoles middleware ────────────────────────────────────────────────

describe('authorizeRoles middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when req.user is missing', () => {
    const middleware = authorizeRoles(['ADMIN']);
    middleware({ user: undefined } as any, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('returns 403 when user role is not in allowed list', () => {
    const middleware = authorizeRoles(['ADMIN']);
    middleware({ user: { role: 'CONSULTATION' } } as any, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('calls next without error when role is allowed', () => {
    const middleware = authorizeRoles(['ADMIN', 'HR']);
    middleware({ user: { role: 'HR' } } as any, {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });
});

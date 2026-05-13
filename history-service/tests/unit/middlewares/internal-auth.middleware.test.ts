import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { verifyInternalApiKey, allowInternalApiKeyOrJwtRoles } from '../../../src/middlewares/internal-auth.middleware';
import { UnauthorizedError } from '../../../src/shared/errors/unauthorized.error';

vi.mock('../../../src/config/env', () => ({
  env: {
    jwtSecret: 'test-secret-key-for-history-service-32chars!!',
    internalApiKey: 'test-internal-api-key',
  },
}));

const JWT_SECRET = 'test-secret-key-for-history-service-32chars!!';
const VALID_KEY  = 'test-internal-api-key';

function makeReq(overrides: Record<string, unknown> = {}) {
  return { headers: {}, ...overrides } as any;
}

function mockRes() {
  const r = { status: vi.fn(), json: vi.fn() } as any;
  r.status.mockReturnValue(r);
  r.json.mockReturnValue(r);
  return r;
}

const next = vi.fn();

beforeEach(() => vi.clearAllMocks());

// ── verifyInternalApiKey ──────────────────────────────────────────────────────

describe('verifyInternalApiKey', () => {
  it('calls next(UnauthorizedError) when x-internal-key header is missing', () => {
    verifyInternalApiKey(makeReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next(UnauthorizedError) when x-internal-key header has wrong value', () => {
    verifyInternalApiKey(makeReq({ headers: { 'x-internal-key': 'wrong-key' } }), mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next() when x-internal-key header is valid', () => {
    verifyInternalApiKey(makeReq({ headers: { 'x-internal-key': VALID_KEY } }), mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });
});

// ── allowInternalApiKeyOrJwtRoles ─────────────────────────────────────────────

describe('allowInternalApiKeyOrJwtRoles', () => {
  it('calls next() without JWT check when internal key is valid', () => {
    const middleware = allowInternalApiKeyOrJwtRoles('ADMIN');
    const req = makeReq({ headers: { 'x-internal-key': VALID_KEY } });

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() when JWT is valid and role is allowed', () => {
    const token = jwt.sign({ id: '1', email: 'admin@test.com', rol: 'ADMIN' }, JWT_SECRET);
    const middleware = allowInternalApiKeyOrJwtRoles('ADMIN', 'HR');
    const req = makeReq({ headers: { authorization: `Bearer ${token}` } });

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('responds 403 when JWT is valid but role is not allowed', () => {
    const token = jwt.sign({ id: '1', email: 'user@test.com', rol: 'CONSULTATION' }, JWT_SECRET);
    const middleware = allowInternalApiKeyOrJwtRoles('ADMIN');
    const req  = makeReq({ headers: { authorization: `Bearer ${token}` } });
    const res  = mockRes();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(UnauthorizedError) when neither key nor JWT are present', () => {
    const middleware = allowInternalApiKeyOrJwtRoles('ADMIN');

    middleware(makeReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next(UnauthorizedError) when internal key is invalid and JWT is malformed', () => {
    const middleware = allowInternalApiKeyOrJwtRoles('ADMIN');
    const req = makeReq({ headers: { authorization: 'Bearer bad.token.here' } });

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next(UnauthorizedError) when JWT is signed with wrong secret', () => {
    const token = jwt.sign({ id: '1', email: 'a@b.com', rol: 'ADMIN' }, 'wrong-secret');
    const middleware = allowInternalApiKeyOrJwtRoles('ADMIN');
    const req = makeReq({ headers: { authorization: `Bearer ${token}` } });

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});

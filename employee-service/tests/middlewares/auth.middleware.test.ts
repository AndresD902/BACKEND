import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../src/middlewares/auth.middleware';
import { validateTokenWithAuthService } from '../../src/utils/auth-client.util';
import { RoleName } from '../../src/shared/enums/role.enum';

jest.mock('../../src/utils/auth-client.util');

const mockValidate = validateTokenWithAuthService as jest.MockedFunction<typeof validateTokenWithAuthService>;

function buildRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('verifyToken middleware', () => {
  const next = jest.fn() as unknown as NextFunction;

  beforeEach(() => jest.clearAllMocks());

  it('should return 401 when Authorization header is missing', async () => {
    const req = { headers: {} } as Request;
    const res = buildRes();
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when header does not start with Bearer', async () => {
    const req = { headers: { authorization: 'Basic abc123' } } as Request;
    const res = buildRes();
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 when token validation fails', async () => {
    mockValidate.mockRejectedValue(new Error('invalid token'));
    const req = { headers: { authorization: 'Bearer bad-token' } } as Request;
    const res = buildRes();
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
    }));
  });

  it('should attach user and call next when token is valid', async () => {
    const user = { sub: '1', email: 'admin@test.com', role: RoleName.ADMIN };
    mockValidate.mockResolvedValue(user);
    const req = { headers: { authorization: 'Bearer valid-token' } } as unknown as Request;
    const res = buildRes();
    await verifyToken(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

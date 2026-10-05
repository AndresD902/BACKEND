import { Response, NextFunction } from 'express';
import { authorize } from '../../src/middlewares/authorize.middleware';
import { AuthenticatedRequest } from '../../src/middlewares/auth.middleware';
import { RoleName } from '../../src/shared/enums/role.enum';

function buildRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authorize middleware', () => {
  const next = jest.fn() as unknown as NextFunction;

  beforeEach(() => jest.clearAllMocks());

  it('should call next when user has the required role', () => {
    const req = { user: { role: RoleName.ADMIN } } as AuthenticatedRequest;
    authorize(RoleName.ADMIN)(req, buildRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('should call next when user has one of multiple allowed roles', () => {
    const req = { user: { role: RoleName.RRHH } } as AuthenticatedRequest;
    authorize(RoleName.ADMIN, RoleName.RRHH)(req, buildRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 403 when user role is not in allowed list', () => {
    const req = { user: { role: RoleName.CONSULTA } } as AuthenticatedRequest;
    const res = buildRes();
    authorize(RoleName.ADMIN)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'FORBIDDEN' }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when req.user is not set', () => {
    const req = {} as AuthenticatedRequest;
    const res = buildRes();
    authorize(RoleName.ADMIN)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

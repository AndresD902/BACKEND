import { Response, NextFunction } from 'express';
import { UserController } from '../src/controllers/user.controller';
import { IUserService } from '../src/services/interfaces/user-service.interface';
import { AuthenticatedRequest } from '../src/middlewares/auth.middleware';
import { UnauthorizedError } from '../src/shared/errors/unauthorized.error';

jest.mock('../src/config/env', () => ({
  env: { jwtSecret: 'test', jwtExpiresIn: '1h', bcryptSaltRounds: 10, databaseUrl: 'pg://test' },
}));

jest.mock('../src/utils/password.util', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

function mockRes(): jest.Mocked<Response> {
  const r = {} as jest.Mocked<Response>;
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
}

function mockReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return { params: {}, body: {}, user: { sub: '1', email: 'a@test.com', role: 'ADMIN' }, ...overrides } as unknown as AuthenticatedRequest;
}

const next = jest.fn() as unknown as NextFunction;

describe('UserController — !req.user branches', () => {
  let controller: UserController;
  let service: jest.Mocked<IUserService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = {
      findAll: jest.fn(),
      findById: jest.fn(),
      deactivate: jest.fn(),
      activate: jest.fn(),
      changePassword: jest.fn(),
    } as any;
    controller = new UserController(service);
  });

  describe('getProfile', () => {
    it('throws UnauthorizedError when req.user is undefined', async () => {
      await controller.getProfile(mockReq({ user: undefined } as any), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('returns 200 with user profile when authenticated', async () => {
      service.findById.mockResolvedValue({ id: '1', email: 'a@test.com' } as any);
      const r = mockRes();
      await controller.getProfile(mockReq(), r, next);
      expect(r.status).toHaveBeenCalledWith(200);
    });
  });

  describe('changePassword', () => {
    it('throws UnauthorizedError when req.user is undefined', async () => {
      await controller.changePassword(mockReq({ user: undefined } as any), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('returns 200 on successful password change', async () => {
      service.changePassword.mockResolvedValue(undefined);
      const r = mockRes();
      await controller.changePassword(
        mockReq({ body: { currentPassword: 'OldPass1!', newPassword: 'NewPass2!' } }),
        r,
        next,
      );
      expect(r.status).toHaveBeenCalledWith(200);
    });
  });
});

import { UserService } from '../src/services/user.service';
import { NotFoundError } from '../src/shared/errors/not-found.error';
import { UnauthorizedError } from '../src/shared/errors/unauthorized.error';
import { RoleName } from '../src/entities/role.entity';
import { hashPassword, comparePassword } from '../src/utils/password.util';

// env.ts llama required() al importarse; se mockea para que los tests unitarios
// no dependan de variables de entorno del sistema.
jest.mock('../src/config/env', () => ({
  env: {
    nodeEnv: 'test',
    port: 3001,
    serviceName: 'auth-service',
    jwtSecret: 'test-secret',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 10,
    databaseUrl: 'postgresql://localhost/test',
    refreshTokenExpiresDays: 7,
    resetTokenExpiresMinutes: 15,
    frontendUrl: 'http://localhost:5173',
    emailVerificationExpiresMinutes: 1440,
  },
}));

jest.mock('../src/utils/password.util', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

const baseUser = {
  id: '1',
  firstName: 'Andres',
  lastName: 'Posada',
  email: 'andres@test.com',
  passwordHash: 'hashed-password',
  role: RoleName.ADMIN,
  isActive: true,
  emailVerified: true,
  notifLogin: false,
  notifCambios: false,
  lastLogin: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UserService', () => {
  let mockUserRepository: {
    findAll: jest.Mock;
    findById: jest.Mock;
    updateStatus: jest.Mock;
    updatePassword: jest.Mock;
  };
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      updatePassword: jest.fn(),
    };
    userService = new UserService(mockUserRepository as any);
  });

  describe('findAll', () => {
    it('should return mapped users without passwordHash', async () => {
      mockUserRepository.findAll.mockResolvedValue([baseUser]);

      const result = await userService.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: '1',
          firstName: 'Andres',
          email: 'andres@test.com',
          role: RoleName.ADMIN,
          isActive: true,
        }),
      );
      expect((result[0] as any).passwordHash).toBeUndefined();
    });

    it('should return an empty array when no users exist', async () => {
      mockUserRepository.findAll.mockResolvedValue([]);

      const result = await userService.findAll();

      expect(result).toEqual([]);
      expect(mockUserRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('should return the mapped user when found', async () => {
      mockUserRepository.findById.mockResolvedValue(baseUser);

      const result = await userService.findById('1');

      expect(result).toEqual(
        expect.objectContaining({ id: '1', email: 'andres@test.com' }),
      );
      expect((result as any).passwordHash).toBeUndefined();
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.findById('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a user and return mapped data', async () => {
      const deactivated = { ...baseUser, isActive: false };
      mockUserRepository.updateStatus.mockResolvedValue(deactivated);

      const result = await userService.deactivate('1');

      expect(result.isActive).toBe(false);
      expect(mockUserRepository.updateStatus).toHaveBeenCalledWith('1', false);
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.updateStatus.mockResolvedValue(null);

      await expect(userService.deactivate('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('activate', () => {
    it('should activate a user and return mapped data', async () => {
      mockUserRepository.updateStatus.mockResolvedValue(baseUser);

      const result = await userService.activate('1');

      expect(result.isActive).toBe(true);
      expect(mockUserRepository.updateStatus).toHaveBeenCalledWith('1', true);
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.updateStatus.mockResolvedValue(null);

      await expect(userService.activate('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('changePassword', () => {
    it('should change password when current password is valid', async () => {
      mockUserRepository.findById.mockResolvedValue(baseUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (hashPassword as jest.Mock).mockResolvedValue('new-hashed-password');
      mockUserRepository.updatePassword.mockResolvedValue(baseUser);

      await userService.changePassword('1', 'currentPass', 'newPass');

      expect(comparePassword).toHaveBeenCalledWith('currentPass', 'hashed-password');
      expect(hashPassword).toHaveBeenCalledWith('newPass');
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith('1', 'new-hashed-password');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.changePassword('999', 'current', 'new')).rejects.toThrow(NotFoundError);
      expect(comparePassword).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when current password is incorrect', async () => {
      mockUserRepository.findById.mockResolvedValue(baseUser);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(userService.changePassword('1', 'wrongPass', 'newPass')).rejects.toThrow(UnauthorizedError);
      expect(hashPassword).not.toHaveBeenCalled();
    });
  });
});

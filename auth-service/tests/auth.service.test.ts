import { RoleName } from '../src/entities/role.entity';
import { AuthService } from '../src/services/auth.service';
import { ConflictError } from '../src/shared/errors/conflict.error';
import { ForbiddenError } from '../src/shared/errors/forbidden.error';
import { NotFoundError } from '../src/shared/errors/not-found.error';
import { UnauthorizedError } from '../src/shared/errors/unauthorized.error';
import { hashPassword, comparePassword } from '../src/utils/password.util';
import { generateJwtToken } from '../src/utils/jwt.util';
import { generateRefreshToken, hashToken } from '../src/utils/token.util';

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
    emailVerificationExpiresMinutes: 60,
    frontendUrl: 'http://localhost:3000',
    resetTokenExpiresMinutes: 60,
  },
}));

jest.mock('../src/clients/employeeServiceClient', () => ({
  isRegisteredEmployee: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/utils/password.util', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.mock('../src/utils/jwt.util', () => ({
  generateJwtToken: jest.fn(),
  verifyJwtToken: jest.fn(),
}));

jest.mock('../src/utils/token.util', () => ({
  generateRefreshToken: jest.fn(),
  hashToken: jest.fn(),
}));

const baseUser = {
  id: '1',
  firstName: 'Andres',
  lastName: 'Posada',
  email: 'andresposada@gmail.com',
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

describe('AuthService', () => {
  let mockUserRepository: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    updateLastLogin: jest.Mock;
    updatePasswordHash: jest.Mock;
    updateEmailVerified: jest.Mock;
    updateNotificationPrefs: jest.Mock;
  };

  let mockRefreshTokenRepository: {
    create: jest.Mock;
    findByHash: jest.Mock;
    revokeByHash: jest.Mock;
    revokeAllByUserId: jest.Mock;
  };

  let mockPasswordResetTokenRepository: {
    create: jest.Mock;
    findByHash: jest.Mock;
    deleteExpiredByUserId: jest.Mock;
    markUsed: jest.Mock;
  };

  let mockEmailService: {
    sendVerificationEmail: jest.Mock;
    sendLoginAlertEmail: jest.Mock;
    sendPasswordResetEmail: jest.Mock;
    sendEmployeeChangeEmail: jest.Mock;
  };

  let mockEmailVerificationRepository: {
    create: jest.Mock;
    findByHash: jest.Mock;
    markUsed: jest.Mock;
  };

  let authService: AuthService;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
      updatePasswordHash: jest.fn().mockResolvedValue(undefined),
      updateEmailVerified: jest.fn().mockResolvedValue(undefined),
      updateNotificationPrefs: jest.fn().mockResolvedValue(undefined),
    };

    mockRefreshTokenRepository = {
      create: jest.fn(),
      findByHash: jest.fn(),
      revokeByHash: jest.fn(),
      revokeAllByUserId: jest.fn(),
    };

    mockPasswordResetTokenRepository = {
      create: jest.fn().mockResolvedValue(undefined),
      findByHash: jest.fn(),
      deleteExpiredByUserId: jest.fn().mockResolvedValue(undefined),
      markUsed: jest.fn().mockResolvedValue(undefined),
    };

    mockEmailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendLoginAlertEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendEmployeeChangeEmail: jest.fn().mockResolvedValue(undefined),
    };

    mockEmailVerificationRepository = {
      create: jest.fn().mockResolvedValue(undefined),
      findByHash: jest.fn(),
      markUsed: jest.fn().mockResolvedValue(undefined),
    };

    jest.clearAllMocks();
    authService = new AuthService(
      mockUserRepository as any,
      mockRefreshTokenRepository as any,
      mockPasswordResetTokenRepository as any,
      mockEmailService as any,
      mockEmailVerificationRepository as any,
    );
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const createUserDto = {
        firstName: 'Andres',
        lastName: 'Posada',
        email: 'andresposada@gmail.com',
        password: 'password123',
        role: RoleName.ADMIN,
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      mockUserRepository.create.mockResolvedValue({ ...baseUser });

      const result = await authService.register(createUserDto);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('andresposada@gmail.com');
      expect(hashPassword).toHaveBeenCalledWith('password123');
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          id: '1',
          firstName: 'Andres',
          lastName: 'Posada',
          email: 'andresposada@gmail.com',
          role: RoleName.ADMIN,
          isActive: true,
        }),
      );
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw ConflictError if email is already in use', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(baseUser);

      await expect(authService.register({ ...baseUser, password: 'password123' } as any)).rejects.toThrow(
        ConflictError,
      );

      expect(hashPassword).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should normalize email before saving', async () => {
      const createUserDto = {
        firstName: 'Andres',
        lastName: 'Posada',
        email: '  ANDRESPOSADA@GMAIL.COM  ',
        password: 'password123',
        role: RoleName.ADMIN,
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      mockUserRepository.create.mockResolvedValue({ ...baseUser });

      const result = await authService.register(createUserDto);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('andresposada@gmail.com');
      expect(result.email).toBe('andresposada@gmail.com');
    });
  });

  describe('login', () => {
    it('should login successfully and return tokens with user', async () => {
      const loginDto = { email: 'andresposada@gmail.com', password: 'password123' };

      mockUserRepository.findByEmail.mockResolvedValue(baseUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (generateJwtToken as jest.Mock).mockReturnValue('mock-access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('mock-refresh-token');
      (hashToken as jest.Mock).mockReturnValue('mock-token-hash');
      mockRefreshTokenRepository.create.mockResolvedValue({});
      mockUserRepository.updateLastLogin.mockResolvedValue(undefined);

      const result = await authService.login(loginDto, '127.0.0.1', 'jest');

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('andresposada@gmail.com');
      expect(comparePassword).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(generateJwtToken).toHaveBeenCalledWith({
        sub: '1',
        email: 'andresposada@gmail.com',
        role: RoleName.ADMIN,
      });
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: expect.objectContaining({ id: '1', email: 'andresposada@gmail.com', role: RoleName.ADMIN }),
      });
    });

    it('should throw UnauthorizedError if user does not exist', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login({ email: 'x@x.com', password: 'password123' })).rejects.toThrow(UnauthorizedError);
      expect(comparePassword).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError if user account is inactive', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ ...baseUser, isActive: false });

      await expect(authService.login({ email: 'andresposada@gmail.com', password: 'password123' })).rejects.toThrow(
        ForbiddenError,
      );
      expect(comparePassword).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError if email is not verified', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ ...baseUser, emailVerified: false });

      await expect(
        authService.login({ email: 'andresposada@gmail.com', password: 'password123' }),
      ).rejects.toThrow(ForbiddenError);
      expect(comparePassword).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError if password is incorrect', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(baseUser);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(authService.login({ email: 'andresposada@gmail.com', password: 'wrongpassword' })).rejects.toThrow(
        UnauthorizedError,
      );
      expect(generateJwtToken).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should return a new access token when refresh token is valid', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockRefreshTokenRepository.findByHash.mockResolvedValue({
        id: '1',
        userId: '1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 60000),
        revoked: false,
      });
      mockUserRepository.findById.mockResolvedValue(baseUser);
      (generateJwtToken as jest.Mock).mockReturnValue('new-access-token');

      const result = await authService.refresh('valid-refresh-token');

      expect(result).toEqual(expect.objectContaining({ accessToken: 'new-access-token' }));
    });

    it('should throw UnauthorizedError when refresh token is revoked', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockRefreshTokenRepository.findByHash.mockResolvedValue({
        userId: '1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 60000),
        revoked: true,
      });

      await expect(authService.refresh('revoked-token')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when refresh token is expired', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockRefreshTokenRepository.findByHash.mockResolvedValue({
        userId: '1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() - 60000),
        revoked: false,
      });

      await expect(authService.refresh('expired-token')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when refresh token does not exist', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockRefreshTokenRepository.findByHash.mockResolvedValue(null);

      await expect(authService.refresh('nonexistent-token')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when user is inactive at refresh time', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockRefreshTokenRepository.findByHash.mockResolvedValue({
        id: '1',
        userId: '1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 60000),
        revoked: false,
      });
      mockUserRepository.findById.mockResolvedValue({ ...baseUser, isActive: false });

      await expect(authService.refresh('valid-refresh-token')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockRefreshTokenRepository.revokeByHash.mockResolvedValue(undefined);

      await authService.logout('valid-refresh-token');

      expect(hashToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockRefreshTokenRepository.revokeByHash).toHaveBeenCalledWith('hashed-token');
    });

    it('returns email and role when token record is found and active', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockRefreshTokenRepository.findByHash.mockResolvedValue({
        id: '1', userId: '1', tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 60000), revoked: false,
      });
      mockUserRepository.findById.mockResolvedValue(baseUser);
      mockRefreshTokenRepository.revokeByHash.mockResolvedValue(undefined);

      const result = await authService.logout('valid-refresh-token');

      expect(result).toEqual({ email: baseUser.email, role: baseUser.role });
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    });
  });

  describe('logoutAll', () => {
    it('should revoke all sessions for a user', async () => {
      mockUserRepository.findById.mockResolvedValue(baseUser);
      mockRefreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);

      await authService.logoutAll('1');

      expect(mockRefreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.logoutAll('999')).rejects.toThrow(NotFoundError);
      expect(mockRefreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('sends reset email when user exists and is active', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(baseUser);
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockPasswordResetTokenRepository.create.mockResolvedValue(undefined);

      await authService.forgotPassword('andresposada@gmail.com');

      expect(mockPasswordResetTokenRepository.deleteExpiredByUserId).toHaveBeenCalledWith('1');
      expect(mockPasswordResetTokenRepository.create).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('does nothing when user does not exist (prevents enumeration)', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await authService.forgotPassword('nonexistent@email.com');

      expect(mockPasswordResetTokenRepository.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('does nothing when user is inactive (prevents enumeration)', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ ...baseUser, isActive: false });

      await authService.forgotPassword('andresposada@gmail.com');

      expect(mockPasswordResetTokenRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('resets password when token is valid', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockPasswordResetTokenRepository.findByHash.mockResolvedValue({
        id: '1',
        userId: '1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 60000),
        used: false,
      });
      (hashPassword as jest.Mock).mockResolvedValue('new-hashed-password');

      await authService.resetPassword('valid-token', 'newPassword123');

      expect(mockUserRepository.updatePasswordHash).toHaveBeenCalledWith('1', 'new-hashed-password');
      expect(mockPasswordResetTokenRepository.markUsed).toHaveBeenCalledWith('1');
      expect(mockRefreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith('1');
    });

    it('throws UnauthorizedError when token record does not exist', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockPasswordResetTokenRepository.findByHash.mockResolvedValue(null);

      await expect(authService.resetPassword('bad-token', 'newPassword')).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when token is already used', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockPasswordResetTokenRepository.findByHash.mockResolvedValue({
        id: '1', userId: '1',
        expiresAt: new Date(Date.now() + 60000),
        used: true,
      });

      await expect(authService.resetPassword('used-token', 'newPassword')).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when token is expired', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockPasswordResetTokenRepository.findByHash.mockResolvedValue({
        id: '1', userId: '1',
        expiresAt: new Date(Date.now() - 60000),
        used: false,
      });

      await expect(authService.resetPassword('expired-token', 'newPassword')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('changePassword', () => {
    it('changes password when current password is correct', async () => {
      mockUserRepository.findById.mockResolvedValue(baseUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (hashPassword as jest.Mock).mockResolvedValue('new-hashed-password');

      await authService.changePassword('1', 'currentPass', 'newPass123');

      expect(comparePassword).toHaveBeenCalledWith('currentPass', 'hashed-password');
      expect(mockUserRepository.updatePasswordHash).toHaveBeenCalledWith('1', 'new-hashed-password');
      expect(mockRefreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith('1');
    });

    it('throws UnauthorizedError when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.changePassword('999', 'pass', 'newpass')).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when user is inactive', async () => {
      mockUserRepository.findById.mockResolvedValue({ ...baseUser, isActive: false });

      await expect(authService.changePassword('1', 'pass', 'newpass')).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when current password is incorrect', async () => {
      mockUserRepository.findById.mockResolvedValue(baseUser);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(authService.changePassword('1', 'wrongPass', 'newPass')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getPreferences', () => {
    it('returns user notification preferences', async () => {
      mockUserRepository.findById.mockResolvedValue({ ...baseUser, notifLogin: true, notifCambios: false });

      const result = await authService.getPreferences('1');

      expect(result).toEqual({ notifLogin: true, notifCambios: false });
    });

    it('throws NotFoundError when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.getPreferences('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updatePreferences', () => {
    it('updates user notification preferences', async () => {
      mockUserRepository.findById.mockResolvedValue(baseUser);

      await authService.updatePreferences('1', { notifLogin: true, notifCambios: true });

      expect(mockUserRepository.updateNotificationPrefs).toHaveBeenCalledWith('1', true, true);
    });

    it('throws NotFoundError when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        authService.updatePreferences('999', { notifLogin: false, notifCambios: false }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('notifyEmployeeChange', () => {
    it('sends email when user has notifCambios enabled', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ ...baseUser, notifCambios: true });

      await authService.notifyEmployeeChange('andresposada@gmail.com', 'actualización', 'Juan García');

      expect(mockEmailService.sendEmployeeChangeEmail).toHaveBeenCalledWith(
        'andresposada@gmail.com', 'actualización', 'Juan García',
      );
    });

    it('does not send email when user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await authService.notifyEmployeeChange('noone@email.com', 'update', 'Person');

      expect(mockEmailService.sendEmployeeChangeEmail).not.toHaveBeenCalled();
    });

    it('does not send email when notifCambios is false', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ ...baseUser, notifCambios: false });

      await authService.notifyEmployeeChange('andresposada@gmail.com', 'update', 'Person');

      expect(mockEmailService.sendEmployeeChangeEmail).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('marks email as verified when token is valid', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockEmailVerificationRepository.findByHash.mockResolvedValue({
        id: '1', userId: '1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 60000),
        used: false,
      });

      await authService.verifyEmail('valid-token');

      expect(mockUserRepository.updateEmailVerified).toHaveBeenCalledWith('1', true);
      expect(mockEmailVerificationRepository.markUsed).toHaveBeenCalledWith('1');
    });

    it('throws UnauthorizedError when token does not exist', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockEmailVerificationRepository.findByHash.mockResolvedValue(null);

      await expect(authService.verifyEmail('bad-token')).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when token is already used', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockEmailVerificationRepository.findByHash.mockResolvedValue({
        id: '1', userId: '1',
        expiresAt: new Date(Date.now() + 60000),
        used: true,
      });

      await expect(authService.verifyEmail('used-token')).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when token is expired', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockEmailVerificationRepository.findByHash.mockResolvedValue({
        id: '1', userId: '1',
        expiresAt: new Date(Date.now() - 60000),
        used: false,
      });

      await expect(authService.verifyEmail('expired-token')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('login — notifLogin branch', () => {
    it('triggers login alert email when user has notifLogin enabled', async () => {
      const loginDto = { email: 'andresposada@gmail.com', password: 'password123' };
      mockUserRepository.findByEmail.mockResolvedValue({ ...baseUser, notifLogin: true });
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (generateJwtToken as jest.Mock).mockReturnValue('mock-access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('mock-refresh-token');
      (hashToken as jest.Mock).mockReturnValue('mock-token-hash');
      mockRefreshTokenRepository.create.mockResolvedValue({});
      mockUserRepository.updateLastLogin.mockResolvedValue(undefined);

      await authService.login(loginDto, '127.0.0.1', 'jest');

      expect(mockEmailService.sendLoginAlertEmail).toHaveBeenCalledWith(
        'andresposada@gmail.com', '127.0.0.1', 'jest',
      );
    });
  });

  describe('register — CONSULTATION role', () => {
    it('throws ForbiddenError when CONSULTATION user is not a registered employee', async () => {
      const { isRegisteredEmployee } = require('../src/clients/employeeServiceClient');
      (isRegisteredEmployee as jest.Mock).mockResolvedValueOnce(false);

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.register({
          firstName: 'Ana',
          lastName: 'López',
          email: 'ana@empresa.com',
          password: 'password123',
          role: RoleName.CONSULTATION,
        }),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});

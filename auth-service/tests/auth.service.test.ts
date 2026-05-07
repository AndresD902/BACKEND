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
    resetTokenExpiresMinutes: 15,
    frontendUrl: 'http://localhost:5173',
    emailVerificationExpiresMinutes: 1440,
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
    deleteExpiredByUserId: jest.Mock;
    create: jest.Mock;
    findByHash: jest.Mock;
    markUsed: jest.Mock;
  };

  let mockEmailService: {
    sendVerificationEmail: jest.Mock;
    sendPasswordResetEmail: jest.Mock;
    sendLoginAlertEmail: jest.Mock;
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
      updatePasswordHash: jest.fn(),
      updateEmailVerified: jest.fn(),
      updateNotificationPrefs: jest.fn(),
    };

    mockRefreshTokenRepository = {
      create: jest.fn(),
      findByHash: jest.fn(),
      revokeByHash: jest.fn(),
      revokeAllByUserId: jest.fn(),
    };

    mockPasswordResetTokenRepository = {
      deleteExpiredByUserId: jest.fn(),
      create: jest.fn(),
      findByHash: jest.fn(),
      markUsed: jest.fn(),
    };

    mockEmailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendLoginAlertEmail: jest.fn().mockResolvedValue(undefined),
      sendEmployeeChangeEmail: jest.fn().mockResolvedValue(undefined),
    };

    mockEmailVerificationRepository = {
      create: jest.fn(),
      findByHash: jest.fn(),
      markUsed: jest.fn(),
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

  // ─── register ───────────────────────────────────────────────────────────────

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
      mockEmailVerificationRepository.create.mockResolvedValue(undefined);
      (hashToken as jest.Mock).mockReturnValue('hashed-token');

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
      mockEmailVerificationRepository.create.mockResolvedValue(undefined);
      (hashToken as jest.Mock).mockReturnValue('hashed-token');

      const result = await authService.register(createUserDto);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('andresposada@gmail.com');
      expect(result.email).toBe('andresposada@gmail.com');
    });

    it('should throw ForbiddenError if CONSULTATION user is not a registered employee', async () => {
      const { isRegisteredEmployee } = jest.requireMock('../src/clients/employeeServiceClient') as { isRegisteredEmployee: jest.Mock };
      isRegisteredEmployee.mockResolvedValueOnce(false);

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.register({
        firstName: 'Ana',
        lastName: 'López',
        email: 'ana@empresa.com',
        password: 'pass123',
        role: RoleName.CONSULTATION,
      })).rejects.toThrow(ForbiddenError);
    });

    it('should allow CONSULTATION role when employee is registered', async () => {
      const { isRegisteredEmployee } = jest.requireMock('../src/clients/employeeServiceClient') as { isRegisteredEmployee: jest.Mock };
      isRegisteredEmployee.mockResolvedValueOnce(true);

      mockUserRepository.findByEmail.mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      const consultUser = { ...baseUser, role: RoleName.CONSULTATION };
      mockUserRepository.create.mockResolvedValue(consultUser);
      mockEmailVerificationRepository.create.mockResolvedValue(undefined);
      (hashToken as jest.Mock).mockReturnValue('hashed-token');

      const result = await authService.register({
        firstName: 'Ana',
        lastName: 'López',
        email: 'ana@empresa.com',
        password: 'pass123',
        role: RoleName.CONSULTATION,
      });

      expect(result.role).toBe(RoleName.CONSULTATION);
    });
  });

  // ─── login ──────────────────────────────────────────────────────────────────

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

    it('should send login alert email when notifLogin is true', async () => {
      const loginDto = { email: 'andresposada@gmail.com', password: 'password123' };
      const userWithNotif = { ...baseUser, notifLogin: true };

      mockUserRepository.findByEmail.mockResolvedValue(userWithNotif);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (generateJwtToken as jest.Mock).mockReturnValue('mock-access-token');
      (generateRefreshToken as jest.Mock).mockReturnValue('mock-refresh-token');
      (hashToken as jest.Mock).mockReturnValue('mock-token-hash');
      mockRefreshTokenRepository.create.mockResolvedValue({});
      mockUserRepository.updateLastLogin.mockResolvedValue(undefined);

      await expect(authService.login(loginDto, '127.0.0.1', 'jest')).resolves.toBeDefined();
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

      await expect(authService.login({ email: 'andresposada@gmail.com', password: 'password123' })).rejects.toThrow(
        ForbiddenError,
      );
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

  // ─── refresh ────────────────────────────────────────────────────────────────

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

    it('should throw UnauthorizedError when user does not exist at refresh time', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockRefreshTokenRepository.findByHash.mockResolvedValue({
        id: '1',
        userId: '1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 60000),
        revoked: false,
      });
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.refresh('valid-refresh-token')).rejects.toThrow(UnauthorizedError);
    });
  });

  // ─── logout ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should revoke the refresh token and return user info', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockRefreshTokenRepository.findByHash.mockResolvedValue({
        userId: '1',
        tokenHash: 'hashed-token',
        revoked: false,
      });
      mockUserRepository.findById.mockResolvedValue(baseUser);
      mockRefreshTokenRepository.revokeByHash.mockResolvedValue(undefined);

      const result = await authService.logout('valid-refresh-token');

      expect(hashToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockRefreshTokenRepository.revokeByHash).toHaveBeenCalledWith('hashed-token');
      expect(result.email).toBe(baseUser.email);
    });

    it('should still revoke when token record is not found', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockRefreshTokenRepository.findByHash.mockResolvedValue(null);
      mockRefreshTokenRepository.revokeByHash.mockResolvedValue(undefined);

      const result = await authService.logout('unknown-token');

      expect(mockRefreshTokenRepository.revokeByHash).toHaveBeenCalledWith('hashed-token');
      expect(result.email).toBeUndefined();
    });

    it('should return undefined email when token is already revoked', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockRefreshTokenRepository.findByHash.mockResolvedValue({
        userId: '1',
        tokenHash: 'hashed-token',
        revoked: true,
      });
      mockRefreshTokenRepository.revokeByHash.mockResolvedValue(undefined);

      const result = await authService.logout('revoked-token');

      expect(result.email).toBeUndefined();
    });
  });

  // ─── logoutAll ──────────────────────────────────────────────────────────────

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

  // ─── forgotPassword ─────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('should send password reset email when user exists and is active', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(baseUser);
      mockPasswordResetTokenRepository.deleteExpiredByUserId.mockResolvedValue(undefined);
      mockPasswordResetTokenRepository.create.mockResolvedValue(undefined);
      (hashToken as jest.Mock).mockReturnValue('hashed-reset-token');
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await authService.forgotPassword('andresposada@gmail.com');

      expect(mockPasswordResetTokenRepository.deleteExpiredByUserId).toHaveBeenCalledWith('1');
      expect(mockPasswordResetTokenRepository.create).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should silently do nothing when user does not exist (anti-enumeration)', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await authService.forgotPassword('unknown@test.com');

      expect(mockPasswordResetTokenRepository.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should silently do nothing when user is inactive', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ ...baseUser, isActive: false });

      await authService.forgotPassword('andresposada@gmail.com');

      expect(mockPasswordResetTokenRepository.create).not.toHaveBeenCalled();
    });
  });

  // ─── resetPassword ──────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    const validRecord = {
      id: 'rec1',
      userId: '1',
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 60000),
      used: false,
    };

    it('should reset password with valid token', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      (hashPassword as jest.Mock).mockResolvedValue('new-hashed-password');
      mockPasswordResetTokenRepository.findByHash.mockResolvedValue(validRecord);
      mockUserRepository.updatePasswordHash.mockResolvedValue(undefined);
      mockPasswordResetTokenRepository.markUsed.mockResolvedValue(undefined);
      mockRefreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);

      await authService.resetPassword('raw-token', 'newPassword123');

      expect(mockUserRepository.updatePasswordHash).toHaveBeenCalledWith('1', 'new-hashed-password');
      expect(mockPasswordResetTokenRepository.markUsed).toHaveBeenCalledWith('rec1');
      expect(mockRefreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith('1');
    });

    it('should throw UnauthorizedError when token is not found', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockPasswordResetTokenRepository.findByHash.mockResolvedValue(null);

      await expect(authService.resetPassword('bad-token', 'newPassword123')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when token is already used', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockPasswordResetTokenRepository.findByHash.mockResolvedValue({ ...validRecord, used: true });

      await expect(authService.resetPassword('used-token', 'newPassword123')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when token is expired', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockPasswordResetTokenRepository.findByHash.mockResolvedValue({
        ...validRecord,
        expiresAt: new Date(Date.now() - 60000),
      });

      await expect(authService.resetPassword('expired-token', 'newPassword123')).rejects.toThrow(UnauthorizedError);
    });
  });

  // ─── changePassword ─────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('should change password when current password is correct', async () => {
      mockUserRepository.findById.mockResolvedValue(baseUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (hashPassword as jest.Mock).mockResolvedValue('new-hashed-password');
      mockUserRepository.updatePasswordHash.mockResolvedValue(undefined);
      mockRefreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);

      await authService.changePassword('1', 'currentPassword', 'newPassword');

      expect(mockUserRepository.updatePasswordHash).toHaveBeenCalledWith('1', 'new-hashed-password');
      expect(mockRefreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith('1');
    });

    it('should throw UnauthorizedError when user is not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.changePassword('999', 'current', 'new')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when user is inactive', async () => {
      mockUserRepository.findById.mockResolvedValue({ ...baseUser, isActive: false });

      await expect(authService.changePassword('1', 'current', 'new')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when current password is incorrect', async () => {
      mockUserRepository.findById.mockResolvedValue(baseUser);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(authService.changePassword('1', 'wrongPassword', 'newPassword')).rejects.toThrow(UnauthorizedError);
      expect(mockUserRepository.updatePasswordHash).not.toHaveBeenCalled();
    });
  });

  // ─── getPreferences ─────────────────────────────────────────────────────────

  describe('getPreferences', () => {
    it('should return user notification preferences', async () => {
      mockUserRepository.findById.mockResolvedValue(baseUser);

      const prefs = await authService.getPreferences('1');

      expect(prefs).toEqual({ notifLogin: false, notifCambios: false });
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.getPreferences('999')).rejects.toThrow(NotFoundError);
    });
  });

  // ─── updatePreferences ──────────────────────────────────────────────────────

  describe('updatePreferences', () => {
    it('should update notification preferences', async () => {
      mockUserRepository.findById.mockResolvedValue(baseUser);
      mockUserRepository.updateNotificationPrefs.mockResolvedValue(undefined);

      await authService.updatePreferences('1', { notifLogin: true, notifCambios: true });

      expect(mockUserRepository.updateNotificationPrefs).toHaveBeenCalledWith('1', true, true);
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        authService.updatePreferences('999', { notifLogin: true, notifCambios: false }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── notifyEmployeeChange ───────────────────────────────────────────────────

  describe('notifyEmployeeChange', () => {
    it('should fire email when notifCambios is enabled', async () => {
      const userWithNotif = { ...baseUser, notifCambios: true };
      mockUserRepository.findByEmail.mockResolvedValue(userWithNotif);
      mockEmailService.sendEmployeeChangeEmail.mockResolvedValue(undefined);

      await expect(
        authService.notifyEmployeeChange('andresposada@gmail.com', 'updated', 'Juan García'),
      ).resolves.toBeUndefined();
    });

    it('should do nothing when user is not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await authService.notifyEmployeeChange('unknown@test.com', 'updated', 'Juan García');

      expect(mockEmailService.sendEmployeeChangeEmail).not.toHaveBeenCalled();
    });

    it('should do nothing when notifCambios is false', async () => {
      mockUserRepository.findByEmail.mockResolvedValue({ ...baseUser, notifCambios: false });

      await authService.notifyEmployeeChange('andresposada@gmail.com', 'updated', 'Juan García');

      expect(mockEmailService.sendEmployeeChangeEmail).not.toHaveBeenCalled();
    });
  });

  // ─── verifyEmail ────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    const validVerifRecord = {
      id: 'verif1',
      userId: '1',
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 60000),
      used: false,
    };

    it('should verify email with valid token', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockEmailVerificationRepository.findByHash.mockResolvedValue(validVerifRecord);
      mockUserRepository.updateEmailVerified.mockResolvedValue(undefined);
      mockEmailVerificationRepository.markUsed.mockResolvedValue(undefined);

      await authService.verifyEmail('raw-token');

      expect(mockUserRepository.updateEmailVerified).toHaveBeenCalledWith('1', true);
      expect(mockEmailVerificationRepository.markUsed).toHaveBeenCalledWith('verif1');
    });

    it('should throw UnauthorizedError when verification token is not found', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockEmailVerificationRepository.findByHash.mockResolvedValue(null);

      await expect(authService.verifyEmail('bad-token')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when verification token is already used', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockEmailVerificationRepository.findByHash.mockResolvedValue({ ...validVerifRecord, used: true });

      await expect(authService.verifyEmail('used-token')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when verification token is expired', async () => {
      (hashToken as jest.Mock).mockReturnValue('hashed-token');
      mockEmailVerificationRepository.findByHash.mockResolvedValue({
        ...validVerifRecord,
        expiresAt: new Date(Date.now() - 60000),
      });

      await expect(authService.verifyEmail('expired-token')).rejects.toThrow(UnauthorizedError);
    });
  });
});

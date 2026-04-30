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
  },
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
  };

  let mockRefreshTokenRepository: {
    create: jest.Mock;
    findByHash: jest.Mock;
    revokeByHash: jest.Mock;
    revokeAllByUserId: jest.Mock;
  };

  let authService: AuthService;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    mockRefreshTokenRepository = {
      create: jest.fn(),
      findByHash: jest.fn(),
      revokeByHash: jest.fn(),
      revokeAllByUserId: jest.fn(),
    };

    jest.clearAllMocks();
    authService = new AuthService(mockUserRepository as any, mockRefreshTokenRepository as any);
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

      expect(result).toEqual({ accessToken: 'new-access-token' });
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
});

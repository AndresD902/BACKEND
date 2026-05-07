import request from 'supertest';
import app from '../src/app';
import { authService } from '../src/services/auth.service';
import { RoleName } from '../src/entities/role.entity';
import { ConflictError } from '../src/shared/errors/conflict.error';
import { ForbiddenError } from '../src/shared/errors/forbidden.error';
import { UnauthorizedError } from '../src/shared/errors/unauthorized.error';

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

jest.mock('../src/config/database', () => ({
  pool: {},
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
  checkDatabaseConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/clients/historyServiceClient', () => ({
  registrarAccion: jest.fn().mockResolvedValue(undefined),
  registrarCambio: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/auth.service', () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    notifyEmployeeChange: jest.fn(),
    verifyEmail: jest.fn(),
  },
}));

jest.mock('../src/utils/jwt.util', () => ({
  generateJwtToken: jest.fn().mockReturnValue('mock-access-token'),
  verifyJwtToken: jest.fn().mockReturnValue({
    sub: '1',
    email: 'test@test.com',
    role: 'ADMIN',
  }),
}));

const mockUser = {
  id: '1',
  firstName: 'Andres',
  lastName: 'Posada',
  email: 'andres@test.com',
  role: RoleName.ADMIN,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Auth Routes — Integration', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/v1/auth/register', () => {
    const validBody = {
      firstName: 'Andres',
      lastName: 'Posada',
      email: 'andres@test.com',
      password: 'password123',
      role: RoleName.ADMIN,
    };

    it('should return 201 on successful registration', async () => {
      (authService.register as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app).post('/api/v1/auth/register').send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({ email: mockUser.email });
    });

    it('should return 409 when email is already in use', async () => {
      (authService.register as jest.Mock).mockRejectedValue(
        new ConflictError('Email already in use'),
      );

      const res = await request(app).post('/api/v1/auth/register').send(validBody);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'bad-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when role is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validBody, role: 'SUPERUSER' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const validBody = { email: 'test@test.com', password: 'password123' };

    it('should return 200 with tokens on successful login', async () => {
      (authService.login as jest.Mock).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      });

      const res = await request(app).post('/api/v1/auth/login').send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should return 401 for invalid credentials', async () => {
      (authService.login as jest.Mock).mockRejectedValue(
        new UnauthorizedError('Invalid credentials'),
      );

      const res = await request(app).post('/api/v1/auth/login').send(validBody);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for an inactive account', async () => {
      (authService.login as jest.Mock).mockRejectedValue(
        new ForbiddenError('Account inactive'),
      );

      const res = await request(app).post('/api/v1/auth/login').send(validBody);

      expect(res.status).toBe(403);
    });

    it('should return 400 when body is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return 200 with a new access token', async () => {
      (authService.refresh as jest.Mock).mockResolvedValue({ accessToken: 'new-token' });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-token' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken', 'new-token');
    });

    it('should return 401 for an invalid or expired refresh token', async () => {
      (authService.refresh as jest.Mock).mockRejectedValue(
        new UnauthorizedError('Invalid or revoked refresh token'),
      );

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'bad-token' });

      expect(res.status).toBe(401);
    });

    it('should return 400 when refreshToken field is missing', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 200 on successful logout', async () => {
      (authService.logout as jest.Mock).mockResolvedValue({ email: mockUser.email, role: mockUser.role });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'some-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when refreshToken is missing', async () => {
      const res = await request(app).post('/api/v1/auth/logout').send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/logout-all', () => {
    it('should return 200 when authenticated and logout-all succeeds', async () => {
      (authService.logoutAll as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 when no Authorization header is provided', async () => {
      const res = await request(app).post('/api/v1/auth/logout-all');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should return 200 even when email does not exist (anti-enumeration)', async () => {
      (authService.forgotPassword as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'anyone@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when email field is missing', async () => {
      const res = await request(app).post('/api/v1/auth/forgot-password').send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should return 200 on successful password reset', async () => {
      (authService.resetPassword as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'valid-token', newPassword: 'NewPass123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app).post('/api/v1/auth/reset-password').send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/auth/verify-email', () => {
    it('should return 200 on successful email verification', async () => {
      (authService.verifyEmail as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .get('/api/v1/auth/verify-email')
        .query({ token: 'valid-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/does-not-exist');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});

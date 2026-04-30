import request from 'supertest';
import app from '../src/app';
import { userService } from '../src/services/user.service';
import { verifyJwtToken } from '../src/utils/jwt.util';
import { RoleName } from '../src/entities/role.entity';
import { NotFoundError } from '../src/shared/errors/not-found.error';

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

jest.mock('../src/config/database', () => ({
  pool: {},
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
  checkDatabaseConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/utils/jwt.util', () => ({
  generateJwtToken: jest.fn(),
  verifyJwtToken: jest.fn(),
}));

jest.mock('../src/services/user.service', () => ({
  userService: {
    findAll: jest.fn(),
    findById: jest.fn(),
    deactivate: jest.fn(),
    activate: jest.fn(),
  },
}));

const adminPayload = { sub: '1', email: 'admin@test.com', role: RoleName.ADMIN };
const hrPayload = { sub: '2', email: 'hr@test.com', role: RoleName.HR };
const consultPayload = { sub: '3', email: 'consult@test.com', role: RoleName.CONSULTATION };

const mockUser = {
  id: '1',
  firstName: 'Andres',
  lastName: 'Posada',
  email: 'admin@test.com',
  role: RoleName.ADMIN,
  isActive: true,
  lastLogin: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Protected Routes — Integration', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/v1/protected/me', () => {
    it('should return 200 with the authenticated user payload', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(adminPayload);

      const res = await request(app)
        .get('/api/v1/protected/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({ sub: '1', role: RoleName.ADMIN });
    });

    it('should return 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/protected/me');

      expect(res.status).toBe(401);
    });

    it('should return 401 when the token is invalid', async () => {
      (verifyJwtToken as jest.Mock).mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const res = await request(app)
        .get('/api/v1/protected/me')
        .set('Authorization', 'Bearer bad-token');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/protected/admin-only', () => {
    it('should return 200 for ADMIN users', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(adminPayload);

      const res = await request(app)
        .get('/api/v1/protected/admin-only')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ role: RoleName.ADMIN });
    });

    it('should return 403 for HR users', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(hrPayload);

      const res = await request(app)
        .get('/api/v1/protected/admin-only')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });

    it('should return 403 for CONSULTATION users', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(consultPayload);

      const res = await request(app)
        .get('/api/v1/protected/admin-only')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/protected/hr-or-admin', () => {
    it('should return 200 for ADMIN users', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(adminPayload);

      const res = await request(app)
        .get('/api/v1/protected/hr-or-admin')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 200 for HR users', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(hrPayload);

      const res = await request(app)
        .get('/api/v1/protected/hr-or-admin')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 403 for CONSULTATION users', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(consultPayload);

      const res = await request(app)
        .get('/api/v1/protected/hr-or-admin')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });
  });
});

describe('User Routes — Integration', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/v1/users', () => {
    it('should return 200 with a list of users for ADMIN', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(adminPayload);
      (userService.findAll as jest.Mock).mockResolvedValue([mockUser]);

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return 403 for HR users', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(hrPayload);

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });

    it('should return 401 without a token', async () => {
      const res = await request(app).get('/api/v1/users');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return 200 for ADMIN', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(adminPayload);
      (userService.findById as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/v1/users/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: '1' });
    });

    it('should return 200 for HR users', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(hrPayload);
      (userService.findById as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/v1/users/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 403 for CONSULTATION users', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(consultPayload);

      const res = await request(app)
        .get('/api/v1/users/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });

    it('should return 404 when the user does not exist', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(adminPayload);
      (userService.findById as jest.Mock).mockRejectedValue(
        new NotFoundError('User not found'),
      );

      const res = await request(app)
        .get('/api/v1/users/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/users/:id/deactivate', () => {
    it('should return 200 for ADMIN', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(adminPayload);
      (userService.deactivate as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });

      const res = await request(app)
        .patch('/api/v1/users/1/deactivate')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('should return 403 for HR users', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(hrPayload);

      const res = await request(app)
        .patch('/api/v1/users/1/deactivate')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });

    it('should return 404 when the user does not exist', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(adminPayload);
      (userService.deactivate as jest.Mock).mockRejectedValue(
        new NotFoundError('User not found'),
      );

      const res = await request(app)
        .patch('/api/v1/users/999/deactivate')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/users/:id/activate', () => {
    it('should return 200 for ADMIN', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(adminPayload);
      (userService.activate as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .patch('/api/v1/users/1/activate')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(true);
    });

    it('should return 403 for HR users', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(hrPayload);

      const res = await request(app)
        .patch('/api/v1/users/1/activate')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });

    it('should return 404 when the user does not exist', async () => {
      (verifyJwtToken as jest.Mock).mockReturnValue(adminPayload);
      (userService.activate as jest.Mock).mockRejectedValue(
        new NotFoundError('User not found'),
      );

      const res = await request(app)
        .patch('/api/v1/users/999/activate')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });
  });
});

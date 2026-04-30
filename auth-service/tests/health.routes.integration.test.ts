import request from 'supertest';
import app from '../src/app';
import { checkDatabaseConnection } from '../src/config/database';

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
  checkDatabaseConnection: jest.fn(),
}));

describe('Health Routes — Integration', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/v1/health', () => {
    it('should return 200 when the database is connected', async () => {
      (checkDatabaseConnection as jest.Mock).mockResolvedValue(true);

      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.database).toBe('connected');
    });

    it('should return 503 when the database is unavailable', async () => {
      (checkDatabaseConnection as jest.Mock).mockResolvedValue(false);

      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.data.database).toBe('disconnected');
    });
  });
});

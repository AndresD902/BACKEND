import request from 'supertest';
import app from '../../src/app';
import * as database from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn() },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
  checkDatabaseConnection: jest.fn(),
}));

const mockCheck = database.checkDatabaseConnection as jest.Mock;

describe('GET /api/v1/health', () => {
  it('should return 200 when database is connected', async () => {
    mockCheck.mockResolvedValue(true);

    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.database).toBe('connected');
  });

  it('should return 503 when database is unavailable', async () => {
    mockCheck.mockResolvedValue(false);

    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.database).toBe('disconnected');
  });
});

import { AddressInfo } from 'net';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/env', () => ({
  env: {
    nodeEnv: 'test',
    port: 3007,
    serviceName: 'super-admin-service',
    databaseUrl: 'postgresql://test',
    jwtSecret: 'test-secret',
    jwtExpiresIn: '1h',
    refreshTokenExpiresDays: 7,
    registerSecret: 'test-register-secret',
    authServiceUrl: 'http://localhost:3001/api/v1',
    employeeServiceUrl: 'http://localhost:3002/api',
    historyServiceUrl: 'http://localhost:3006',
    internalApiKey: 'test-internal-key',
    corsOrigins: ['http://localhost:5173'],
    requestTimeoutMs: 8000,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    frontendUrl: 'http://localhost:5173',
    resetTokenExpiresMinutes: 15,
  },
}));

vi.mock('../src/config/database', () => ({
  checkDatabaseConnection: vi.fn(),
  pool: { query: vi.fn(), connect: vi.fn() },
}));

async function request(path: string): Promise<Response> {
  const app = (await import('../src/app')).default;
  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;

  try {
    return await fetch(`http://127.0.0.1:${port}${path}`);
  } finally {
    server.close();
  }
}

describe('GET /api/health', () => {
  it('returns 200 when database is connected', async () => {
    const { checkDatabaseConnection } = await import('../src/config/database');
    vi.mocked(checkDatabaseConnection).mockResolvedValue(true);

    const response = await request('/api/health');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      service: 'super-admin-service',
      database: 'connected',
    });
  });

  it('returns 503 when database is disconnected', async () => {
    const { checkDatabaseConnection } = await import('../src/config/database');
    vi.mocked(checkDatabaseConnection).mockResolvedValue(false);

    const response = await request('/api/health');
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: 'degraded',
      service: 'super-admin-service',
      database: 'disconnected',
    });
  });
});

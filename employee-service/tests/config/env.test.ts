jest.mock('dotenv', () => ({ config: jest.fn() }));

describe('env config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env['JWT_SECRET'];
    delete process.env['DATABASE_URL'];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw when JWT_SECRET is missing', () => {
    expect(() => {
      require('../../src/config/env');
    }).toThrow('Missing required environment variable: JWT_SECRET');
  });

  it('should throw when DATABASE_URL is missing', () => {
    process.env['JWT_SECRET'] = 'secret';

    expect(() => {
      require('../../src/config/env');
    }).toThrow('Missing required environment variable: DATABASE_URL');
  });

  it('should load env correctly when all required variables are present', () => {
    process.env['JWT_SECRET'] = 'my-secret';
    process.env['DATABASE_URL'] = 'postgresql://localhost/test';
    process.env['PORT'] = '4000';

    const { env } = require('../../src/config/env') as { env: Record<string, string | number> };

    expect(env.jwtSecret).toBe('my-secret');
    expect(env.databaseUrl).toBe('postgresql://localhost/test');
    expect(env.port).toBe(4000);
  });
});

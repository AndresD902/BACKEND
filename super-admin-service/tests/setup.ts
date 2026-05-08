// Patch Node's module resolver to fall back to .ts extension.
// This is required because verifyRegisterSecret uses require('../config/env')
// inside a function body — a runtime CJS require that bypasses vitest's mock
// interceptor. Without this patch, Node looks for .js and fails.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NodeModule = require('node:module');
const _origResolveFilename = NodeModule._resolveFilename as (
  request: string,
  parent: unknown,
  isMain: boolean,
  options: unknown,
) => string;
NodeModule._resolveFilename = (
  request: string,
  parent: unknown,
  isMain: boolean,
  options: unknown,
): string => {
  try {
    return _origResolveFilename(request, parent, isMain, options);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
      try {
        return _origResolveFilename(request + '.ts', parent, isMain, options);
      } catch {
        // fall through to original error
      }
    }
    throw err;
  }
};

// Set required environment variables before any module import
process.env.NODE_ENV = 'test';
process.env.PORT = '3007';
process.env.SERVICE_NAME = 'super-admin-service-test';
process.env.DATABASE_URL = 'postgres://postgres:password@localhost:5432/super_admin_test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long!!';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REFRESH_TOKEN_EXPIRES_DAYS = '7';
process.env.REGISTER_SECRET = 'test-register-secret-value';
process.env.AUTH_SERVICE_URL = 'http://localhost:3001/api/v1';
process.env.EMPLOYEE_SERVICE_URL = 'http://localhost:3002/api';
process.env.HISTORY_SERVICE_URL = 'http://localhost:3006';
process.env.REQUEST_TIMEOUT_MS = '8000';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'testpass';
process.env.SMTP_SECURE = 'false';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.RESET_TOKEN_EXPIRES_MINUTES = '15';

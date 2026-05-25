import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function jwtSecret(): string {
  const secret = required('JWT_SECRET');
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  return secret;
}

function internalApiKey(): string {
  const value = process.env.INTERNAL_API_KEY;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing required environment variable: INTERNAL_API_KEY');
  }
  return 'dev-internal-key-change-in-prod';
}

function csv(name: string, fallback: string): string[] {
  return optional(name, fallback)
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function flag(name: string, fallback = true): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export const env = {
  nodeEnv:     optional('NODE_ENV', 'development'),
  port:        Number(optional('PORT', '3007')),
  serviceName: optional('SERVICE_NAME', 'super-admin-service'),

  databaseUrl: required('DATABASE_URL'),

  jwtSecret:               jwtSecret(),
  jwtExpiresIn:            optional('JWT_EXPIRES_IN', '1h'),
  refreshTokenExpiresDays: Number(optional('REFRESH_TOKEN_EXPIRES_DAYS', '7')),

  registerSecret: required('REGISTER_SECRET'),

  authServiceUrl:     optional('AUTH_SERVICE_URL',     'http://localhost:3001/api/v1'),
  employeeServiceUrl: optional('EMPLOYEE_SERVICE_URL', 'http://localhost:3002/api'),
  historyServiceUrl:  optional('HISTORY_SERVICE_URL',  'http://localhost:3006'),
  internalApiKey:     internalApiKey(),
  corsOrigins:        csv('CORS_ORIGINS', 'http://localhost:5173'),
  rbacV2Enabled:      flag('RBAC_V2_ENABLED', true),

  requestTimeoutMs: Number(optional('REQUEST_TIMEOUT_MS', '8000')),

  smtpHost:   optional('SMTP_HOST',   'smtp.gmail.com'),
  smtpPort:   Number(optional('SMTP_PORT', '587')),
  smtpSecure: optional('SMTP_SECURE', 'false') === 'true',
  smtpUser:   optional('SMTP_USER',   ''),
  smtpPass:   optional('SMTP_PASS',   ''),

  frontendUrl:              optional('FRONTEND_URL', 'http://localhost:5173'),
  resetTokenExpiresMinutes: Number(optional('RESET_TOKEN_EXPIRES_MINUTES', '15')),
};

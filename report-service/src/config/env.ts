import dotenv from 'dotenv';

dotenv.config();

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

export const env = {
  nodeEnv:     optional('NODE_ENV', 'development'),
  port:        Number(optional('PORT', '3005')),
  serviceName: optional('SERVICE_NAME', 'report-service'),

  jwtSecret: jwtSecret(),

  employeeServiceUrl: optional('EMPLOYEE_SERVICE_URL', 'http://localhost:3002/api'),
  contractServiceUrl: optional('CONTRACT_SERVICE_URL', 'http://localhost:3003/api'),
  vacationServiceUrl: optional('VACATION_SERVICE_URL', 'http://localhost:3004/api'),
  historyServiceUrl:  optional('HISTORY_SERVICE_URL',  'http://localhost:3006'),
  internalApiKey:     internalApiKey(),
  corsOrigins:        csv('CORS_ORIGINS', 'http://localhost:5173'),

  requestTimeoutMs: Number(optional('REQUEST_TIMEOUT_MS', '8000')),
};

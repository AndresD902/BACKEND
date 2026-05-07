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

export const env = {
  nodeEnv:     optional('NODE_ENV', 'development'),
  port:        Number(optional('PORT', '3007')),
  serviceName: optional('SERVICE_NAME', 'super-admin-service'),

  databaseUrl: required('DATABASE_URL'),

  jwtSecret:               required('JWT_SECRET'),
  jwtExpiresIn:            optional('JWT_EXPIRES_IN', '1h'),
  refreshTokenExpiresDays: Number(optional('REFRESH_TOKEN_EXPIRES_DAYS', '7')),

  registerSecret: required('REGISTER_SECRET'),

  authServiceUrl:     optional('AUTH_SERVICE_URL',     'http://localhost:3001/api/v1'),
  employeeServiceUrl: optional('EMPLOYEE_SERVICE_URL', 'http://localhost:3002/api'),
  historyServiceUrl:  optional('HISTORY_SERVICE_URL',  'http://localhost:3006'),

  requestTimeoutMs: Number(optional('REQUEST_TIMEOUT_MS', '8000')),

  smtpHost:   optional('SMTP_HOST',   'smtp.gmail.com'),
  smtpPort:   Number(optional('SMTP_PORT', '587')),
  smtpSecure: optional('SMTP_SECURE', 'false') === 'true',
  smtpUser:   optional('SMTP_USER',   ''),
  smtpPass:   optional('SMTP_PASS',   ''),

  frontendUrl:              optional('FRONTEND_URL', 'http://localhost:5173'),
  resetTokenExpiresMinutes: Number(optional('RESET_TOKEN_EXPIRES_MINUTES', '15')),
};

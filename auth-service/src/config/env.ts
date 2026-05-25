import dotenv from 'dotenv';

dotenv.config();

function getEnVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getJwtSecret(): string {
  const secret = getEnVariable('JWT_SECRET');

  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  return secret;
}

function getInternalApiKey(): string {
  const value = process.env.INTERNAL_API_KEY;

  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing required environment variable: INTERNAL_API_KEY');
  }

  return 'dev-internal-key-change-in-prod';
}

function getCorsOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function flag(name: string, fallback = true): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export const env = {
  nodeEnv: getEnVariable('NODE_ENV'),
  port: Number(getEnVariable('PORT') ?? 3001),
  serviceName: getEnVariable('SERVICE_NAME'),
  jwtSecret: getJwtSecret(),
  jwtExpiresIn: getEnVariable('JWT_EXPIRES_IN'),
  bcryptSaltRounds: Number(getEnVariable('BCRYPT_SALT_ROUNDS')),
  databaseUrl: getEnVariable('DATABASE_URL'),
  refreshTokenExpiresDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? '7'),
  historyServiceUrl: process.env.HISTORY_SERVICE_URL ?? 'http://localhost:3006',
  employeeServiceUrl: process.env.EMPLOYEE_SERVICE_URL ?? 'http://localhost:3002/api',
  internalApiKey: getInternalApiKey(),
  corsOrigins: getCorsOrigins(),
  rbacV2Enabled: flag('RBAC_V2_ENABLED', true),
  consultantSelfServiceEnabled: flag('CONSULTANT_SELF_SERVICE_ENABLED', true),

  // Email SMTP
  smtpHost: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT ?? '587'),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  smtpFrom: process.env.SMTP_FROM ?? '',

  // Password reset
  resetTokenExpiresMinutes: Number(process.env.RESET_TOKEN_EXPIRES_MINUTES ?? '15'),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',

  // Email verification
  emailVerificationExpiresMinutes: Number(process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES ?? '1440'),
};

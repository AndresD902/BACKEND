import dotenv from 'dotenv';

dotenv.config();

function getEnvVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getOptionalEnvVariable(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function getJwtSecret(): string {
  const secret = getEnvVariable('JWT_SECRET');

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
  return getOptionalEnvVariable('CORS_ORIGINS', 'http://localhost:5173')
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
  nodeEnv: getEnvVariable('NODE_ENV'),
  port: Number(getEnvVariable('PORT')),
  serviceName: getEnvVariable('SERVICE_NAME'),
  jwtSecret: getJwtSecret(),
  jwtExpiresIn: getEnvVariable('JWT_EXPIRES_IN'),
  databaseUrl: getEnvVariable('DATABASE_URL'),
  employeeServiceUrl: getEnvVariable('EMPLOYEE_SERVICE_URL'),
  historyServiceUrl: process.env.HISTORY_SERVICE_URL ?? 'http://localhost:3006',
  internalApiKey: getInternalApiKey(),
  corsOrigins: getCorsOrigins(),
  rbacV2Enabled: flag('RBAC_V2_ENABLED', true),
  consultantSelfServiceEnabled: flag('CONSULTANT_SELF_SERVICE_ENABLED', true),
  awsRegion: getOptionalEnvVariable('AWS_REGION', 'us-east-1'),
  awsAccessKeyId: getOptionalEnvVariable('AWS_ACCESS_KEY_ID'),
  awsSecretAccessKey: getOptionalEnvVariable('AWS_SECRET_ACCESS_KEY'),
  s3BucketName: getOptionalEnvVariable('S3_BUCKET_NAME'),
};

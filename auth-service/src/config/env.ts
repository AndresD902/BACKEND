import dotenv from 'dotenv';

dotenv.config();

function getEnVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: getEnVariable('NODE_ENV'),
  port: Number(getEnVariable('PORT')),
  serviceName: getEnVariable('SERVICE_NAME'),
  jwtSecret: getEnVariable('JWT_SECRET'),
  jwtExpiresIn: getEnVariable('JWT_EXPIRES_IN'),
  bcryptSaltRounds: Number(getEnVariable('BCRYPT_SALT_ROUNDS')),
  databaseUrl: getEnVariable('DATABASE_URL'),
  refreshTokenExpiresDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? '7'),
  historyServiceUrl: process.env.HISTORY_SERVICE_URL ?? 'http://localhost:3006',
  internalApiKey: process.env.INTERNAL_API_KEY ?? 'dev-internal-key-change-in-prod',
};

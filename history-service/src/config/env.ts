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
  port:        Number(optional('PORT', '3006')),
  serviceName: optional('SERVICE_NAME', 'history-service'),
  jwtSecret:   required('JWT_SECRET'),
  databaseUrl: required('DATABASE_URL'),
};

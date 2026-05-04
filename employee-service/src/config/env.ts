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
  nodeEnv:    optional('NODE_ENV', 'development'),
  port:       Number(optional('PORT', '3002')),
  serviceName: optional('SERVICE_NAME', 'employee-service'),

  jwtSecret:          required('JWT_SECRET'),
  internalApiKey:     optional('INTERNAL_API_KEY', 'dev-internal-key-change-in-prod'),
  historyServiceUrl:  optional('HISTORY_SERVICE_URL', 'http://localhost:3006'),
  authServiceUrl:     optional('AUTH_SERVICE_URL', 'http://localhost:3001/api/v1'),
  databaseUrl:        required('DATABASE_URL'),

  awsRegion:          optional('AWS_REGION', 'us-east-1'),
  awsAccessKeyId:     optional('AWS_ACCESS_KEY_ID', ''),
  awsSecretAccessKey: optional('AWS_SECRET_ACCESS_KEY', ''),
  s3BucketName:       optional('S3_BUCKET_NAME', ''),
};

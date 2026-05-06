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

export const env = {
  nodeEnv: getEnvVariable('NODE_ENV'),
  port: Number(getEnvVariable('PORT')),
  serviceName: getEnvVariable('SERVICE_NAME'),
  jwtSecret: getEnvVariable('JWT_SECRET'),
  jwtExpiresIn: getEnvVariable('JWT_EXPIRES_IN'),
  databaseUrl: getEnvVariable('DATABASE_URL'),
  employeeServiceUrl: getEnvVariable('EMPLOYEE_SERVICE_URL'),
  historyServiceUrl: process.env.HISTORY_SERVICE_URL ?? 'http://localhost:3006',
  awsRegion: getOptionalEnvVariable('AWS_REGION', 'us-east-1'),
  awsAccessKeyId: getOptionalEnvVariable('AWS_ACCESS_KEY_ID'),
  awsSecretAccessKey: getOptionalEnvVariable('AWS_SECRET_ACCESS_KEY'),
  s3BucketName: getOptionalEnvVariable('S3_BUCKET_NAME'),
};

import dotenv from 'dotenv';

dotenv.config();

function getEnvVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: getEnvVariable('NODE_ENV'),
  port: Number(getEnvVariable('PORT')),
  serviceName: getEnvVariable('SERVICE_NAME'),
  jwtSecret: getEnvVariable('JWT_SECRET'),
  jwtExpiresIn: getEnvVariable('JWT_EXPIRES_IN'),
  databaseUrl: getEnvVariable('DATABASE_URL'),
  employeeServiceUrl: getEnvVariable('EMPLOYEE_SERVICE_URL'),
};

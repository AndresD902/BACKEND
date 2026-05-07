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
  port:        Number(optional('PORT', '3005')),
  serviceName: optional('SERVICE_NAME', 'report-service'),

  jwtSecret: required('JWT_SECRET'),

  employeeServiceUrl: optional('EMPLOYEE_SERVICE_URL', 'http://localhost:3002/api'),
  contractServiceUrl: optional('CONTRACT_SERVICE_URL', 'http://localhost:3003/api'),
  vacationServiceUrl: optional('VACATION_SERVICE_URL', 'http://localhost:3004/api'),
  historyServiceUrl:  optional('HISTORY_SERVICE_URL',  'http://localhost:3006'),

  requestTimeoutMs: Number(optional('REQUEST_TIMEOUT_MS', '8000')),
};

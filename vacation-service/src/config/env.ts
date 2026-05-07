import dotenv from 'dotenv';

dotenv.config();

function getEnVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  nodeEnv:            getEnVariable('NODE_ENV'),
  port:               Number(getEnVariable('PORT')),
  serviceName:        getEnVariable('SERVICE_NAME'),
  jwtSecret:          getEnVariable('JWT_SECRET'),
  databaseUrl:        getEnVariable('DATABASE_URL'),
  historyServiceUrl:  process.env.HISTORY_SERVICE_URL ?? 'http://localhost:3006',
  employeeServiceUrl: process.env.EMPLOYEE_SERVICE_URL ?? 'http://localhost:3002',
  diasLegalesAnuales: Number(process.env.DIAS_LEGALES_ANUALES ?? '15'),
  smtpHost:           process.env.SMTP_HOST ?? 'smtp.gmail.com',
  smtpPort:           Number(process.env.SMTP_PORT ?? '587'),
  smtpUser:           process.env.SMTP_USER ?? '',
  smtpPass:           process.env.SMTP_PASS ?? '',
  frontendUrl:        process.env.FRONTEND_URL ?? 'http://localhost:5173',
};

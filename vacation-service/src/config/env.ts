import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

function getEnVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
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

function flag(name: string, fallback = true): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export const env = {
  nodeEnv:            getEnVariable('NODE_ENV'),
  port:               Number(getEnVariable('PORT')),
  serviceName:        getEnVariable('SERVICE_NAME'),
  jwtSecret:          getJwtSecret(),
  databaseUrl:        getEnVariable('DATABASE_URL'),
  historyServiceUrl:  process.env.HISTORY_SERVICE_URL ?? 'http://localhost:3006',
  employeeServiceUrl: process.env.EMPLOYEE_SERVICE_URL ?? 'http://localhost:3002',
  internalApiKey:     getInternalApiKey(),
  rbacV2Enabled:      flag('RBAC_V2_ENABLED', true),
  consultantSelfServiceEnabled: flag('CONSULTANT_SELF_SERVICE_ENABLED', true),
  vacationEligibilityRuleEnabled: flag('VACATION_ELIGIBILITY_RULE_ENABLED', true),
  diasLegalesAnuales: Number(process.env.DIAS_LEGALES_ANUALES ?? '15'),
  smtpHost:           process.env.SMTP_HOST ?? 'smtp.gmail.com',
  smtpPort:           Number(process.env.SMTP_PORT ?? '587'),
  smtpSecure:         process.env.SMTP_SECURE === 'true',
  smtpUser:           process.env.SMTP_USER ?? '',
  smtpPass:           process.env.SMTP_PASS ?? '',
  frontendUrl:        process.env.FRONTEND_URL ?? 'http://localhost:5173',
  corsOrigins:        (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean),
};

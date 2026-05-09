// Set required environment variables before any module import
process.env.NODE_ENV = 'test';
process.env.PORT = '3004';
process.env.SERVICE_NAME = 'vacation-service-test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long!!';
process.env.DATABASE_URL = 'postgres://postgres:password@localhost:5432/vacation_test';
process.env.HISTORY_SERVICE_URL = 'http://localhost:3006';
process.env.INTERNAL_API_KEY = 'test-internal-key';
process.env.EMPLOYEE_SERVICE_URL = 'http://localhost:3002';
process.env.DIAS_LEGALES_ANUALES = '15';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'testpass';
process.env.SMTP_SECURE = 'false';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.CORS_ORIGINS = 'http://localhost:5173';

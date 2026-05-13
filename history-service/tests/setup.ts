process.env.NODE_ENV        = 'test';
process.env.PORT            = '3006';
process.env.SERVICE_NAME    = 'history-service';
process.env.JWT_SECRET      = 'test-secret-key-for-history-service-32chars!!';
process.env.DATABASE_URL    = 'postgresql://test:test@localhost:5432/history_test_db';
process.env.INTERNAL_API_KEY = 'test-internal-api-key';
process.env.CORS_ORIGINS    = 'http://localhost:5173';

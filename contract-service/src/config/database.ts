import { Pool } from 'pg';
import { env } from './env';

const POSTGRES_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function getDatabaseSettings(databaseUrl: string): { connectionString: string; schemaName: string | null } {
  const parsedUrl = new URL(databaseUrl);
  const schemaName = parsedUrl.searchParams.get('schema');

  parsedUrl.searchParams.delete('schema');

  if (schemaName && !POSTGRES_IDENTIFIER_PATTERN.test(schemaName)) {
    throw new Error('Invalid PostgreSQL schema name in DATABASE_URL');
  }

  return {
    connectionString: parsedUrl.toString(),
    schemaName,
  };
}

const databaseSettings = getDatabaseSettings(env.databaseUrl);

export const pool = new Pool({
  connectionString: databaseSettings.connectionString,
  options: databaseSettings.schemaName ? `-c search_path=${databaseSettings.schemaName}` : undefined,
});

export async function connectDatabase(): Promise<void> {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await pool.end();
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Database disconnection failed:', error);
    throw error;
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

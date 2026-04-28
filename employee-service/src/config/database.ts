import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({ connectionString: env.databaseUrl });

export async function connectDatabase(): Promise<void> {
  const client = await pool.connect();
  client.release();
  console.log('Database connected successfully');
}

export async function disconnectDatabase(): Promise<void> {
  await pool.end();
  console.log('Database disconnected successfully');
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

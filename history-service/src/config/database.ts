import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({ connectionString: env.databaseUrl });

export const connectDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  client.release();
};

export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
};

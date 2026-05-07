import { pool } from '../config/database';
import { SuperAdmin } from '../entities/super-admin.entity';

export const superAdminRepository = {
  async findByEmail(email: string): Promise<SuperAdmin | null> {
    const { rows } = await pool.query<SuperAdmin>(
      'SELECT * FROM super_admins WHERE email = $1 LIMIT 1',
      [email],
    );
    return rows[0] ?? null;
  },

  async findById(id: number): Promise<SuperAdmin | null> {
    const { rows } = await pool.query<SuperAdmin>(
      'SELECT * FROM super_admins WHERE id = $1 LIMIT 1',
      [id],
    );
    return rows[0] ?? null;
  },

  async findByResetToken(token: string): Promise<SuperAdmin | null> {
    const { rows } = await pool.query<SuperAdmin>(
      `SELECT * FROM super_admins
       WHERE reset_token = $1 AND reset_token_expires > NOW() LIMIT 1`,
      [token],
    );
    return rows[0] ?? null;
  },

  async create(data: {
    nombre: string;
    email:  string;
    password_hash: string;
  }): Promise<SuperAdmin> {
    const { rows } = await pool.query<SuperAdmin>(
      `INSERT INTO super_admins (nombre, email, password_hash)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.nombre, data.email, data.password_hash],
    );
    return rows[0];
  },

  async updateUltimoLogin(id: number): Promise<void> {
    await pool.query(
      'UPDATE super_admins SET ultimo_login = NOW(), updated_at = NOW() WHERE id = $1',
      [id],
    );
  },

  async setResetToken(id: number, token: string, expiresAt: Date): Promise<void> {
    await pool.query(
      `UPDATE super_admins
       SET reset_token = $1, reset_token_expires = $2, updated_at = NOW()
       WHERE id = $3`,
      [token, expiresAt, id],
    );
  },

  async clearResetToken(id: number): Promise<void> {
    await pool.query(
      `UPDATE super_admins
       SET reset_token = NULL, reset_token_expires = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id],
    );
  },

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await pool.query(
      'UPDATE super_admins SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, id],
    );
  },
};

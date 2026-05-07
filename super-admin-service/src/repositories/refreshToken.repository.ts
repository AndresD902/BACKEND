import { pool } from '../config/database';

export interface RefreshTokenRow {
  id:             number;
  super_admin_id: number;
  token_hash:     string;
  expires_at:     Date;
  revocado:       boolean;
  ip_origen:      string | null;
  user_agent:     string | null;
  created_at:     Date;
}

export const refreshTokenRepository = {
  async create(data: {
    super_admin_id: number;
    token_hash:     string;
    expires_at:     Date;
    ip_origen?:     string;
    user_agent?:    string;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO refresh_tokens_superadmin
         (super_admin_id, token_hash, expires_at, ip_origen, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.super_admin_id, data.token_hash, data.expires_at, data.ip_origen ?? null, data.user_agent ?? null],
    );
  },

  async findByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    const { rows } = await pool.query<RefreshTokenRow>(
      'SELECT * FROM refresh_tokens_superadmin WHERE token_hash = $1 LIMIT 1',
      [tokenHash],
    );
    return rows[0] ?? null;
  },

  async revocarPorHash(tokenHash: string): Promise<void> {
    await pool.query(
      'UPDATE refresh_tokens_superadmin SET revocado = TRUE WHERE token_hash = $1',
      [tokenHash],
    );
  },

  async revocarTodosPorSuperAdmin(superAdminId: number): Promise<void> {
    await pool.query(
      'UPDATE refresh_tokens_superadmin SET revocado = TRUE WHERE super_admin_id = $1',
      [superAdminId],
    );
  },
};

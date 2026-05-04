import { pool } from '../config/database';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { IPasswordResetTokenRepository } from './interfaces/password-reset-token-repository.interface';

function mapRow(row: Record<string, unknown>): PasswordResetToken {
  return {
    id:        String(row.id),
    userId:    String(row.user_id),
    tokenHash: row.token_hash as string,
    expiresAt: row.expires_at as Date,
    used:      row.used as boolean,
    createdAt: row.created_at as Date,
  };
}

export class PasswordResetTokenRepository implements IPasswordResetTokenRepository {
  public async create(userId: string, tokenHash: string, expiresAt: Date): Promise<PasswordResetToken> {
    const result = await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, tokenHash, expiresAt],
    );
    return mapRow(result.rows[0]);
  }

  public async findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const result = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token_hash = $1',
      [tokenHash],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  public async markUsed(id: string): Promise<void> {
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [id]);
  }

  public async deleteExpiredByUserId(userId: string): Promise<void> {
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 AND (expires_at < NOW() OR used = TRUE)',
      [userId],
    );
  }
}

export const passwordResetTokenRepository = new PasswordResetTokenRepository();

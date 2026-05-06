import { pool } from '../config/database';
import { EmailVerification } from '../entities/email-verification.entity';
import { IEmailVerificationRepository } from './interfaces/email-verification-repository.interface';

function mapRow(row: Record<string, unknown>): EmailVerification {
  return {
    id:         String(row.id),
    userId:     String(row.user_id),
    tokenHash:  row.token_hash as string,
    expiresAt:  row.expires_at as Date,
    used:       row.used as boolean,
    createdAt:  row.created_at as Date,
  };
}

class EmailVerificationRepository implements IEmailVerificationRepository {
  public async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await pool.query(
      'INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt],
    );
  }

  public async findByHash(tokenHash: string): Promise<EmailVerification | null> {
    const { rows } = await pool.query(
      'SELECT * FROM email_verifications WHERE token_hash = $1',
      [tokenHash],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  public async markUsed(id: string): Promise<void> {
    await pool.query('UPDATE email_verifications SET used = TRUE WHERE id = $1', [id]);
  }

  public async deleteByUserId(userId: string): Promise<void> {
    await pool.query('DELETE FROM email_verifications WHERE user_id = $1', [userId]);
  }
}

export const emailVerificationRepository = new EmailVerificationRepository();

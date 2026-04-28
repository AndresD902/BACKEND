import { pool } from '../config/database';
import { RefreshToken } from '../entities/refresh-token.entity';

interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipOrigin?: string;
  userAgent?: string;
}

function mapRowToRefreshToken(row: Record<string, unknown>): RefreshToken {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    tokenHash: row.token_hash as string,
    expiresAt: row.expires_at as Date,
    revoked: row.revoked as boolean,
    ipOrigin: row.ip_origin as string | null,
    userAgent: row.user_agent as string | null,
    createdAt: row.created_at as Date,
  };
}

export class RefreshTokenRepository {
  public async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const result = await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_origin, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.userId, data.tokenHash, data.expiresAt, data.ipOrigin ?? null, data.userAgent ?? null],
    );
    return mapRowToRefreshToken(result.rows[0]);
  }

  public async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const result = await pool.query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    return result.rows[0] ? mapRowToRefreshToken(result.rows[0]) : null;
  }

  public async revokeByHash(tokenHash: string): Promise<void> {
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [tokenHash]);
  }

  public async revokeAllByUserId(userId: string): Promise<void> {
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [userId]);
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();

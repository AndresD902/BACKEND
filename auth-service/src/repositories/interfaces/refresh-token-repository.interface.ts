import { RefreshToken } from '../../entities/refresh-token.entity';

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipOrigin?: string;
  userAgent?: string;
}

export interface IRefreshTokenRepository {
  create(data: CreateRefreshTokenData): Promise<RefreshToken>;
  findByHash(tokenHash: string): Promise<RefreshToken | null>;
  revokeByHash(tokenHash: string): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
}

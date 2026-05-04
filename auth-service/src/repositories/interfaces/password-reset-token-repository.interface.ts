import { PasswordResetToken } from '../../entities/password-reset-token.entity';

export interface IPasswordResetTokenRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<PasswordResetToken>;
  findByHash(tokenHash: string): Promise<PasswordResetToken | null>;
  markUsed(id: string): Promise<void>;
  deleteExpiredByUserId(userId: string): Promise<void>;
}

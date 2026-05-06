import { EmailVerification } from '../../entities/email-verification.entity';

export interface IEmailVerificationRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findByHash(tokenHash: string): Promise<EmailVerification | null>;
  markUsed(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

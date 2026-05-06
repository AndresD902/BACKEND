export interface EmailVerification {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

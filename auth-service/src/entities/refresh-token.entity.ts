export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
  ipOrigin: string | null;
  userAgent: string | null;
  createdAt: Date;
}

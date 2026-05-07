jest.mock('../src/config/env', () => ({
  env: { databaseUrl: 'postgresql://localhost/test' },
}));

jest.mock('../src/config/database', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../src/config/database';
import { UserRepository } from '../src/repositories/user.repository';
import { RefreshTokenRepository } from '../src/repositories/refreshToken.repository';
import { EmailVerificationRepository } from '../src/repositories/email-verification.repository';
import { PasswordResetTokenRepository } from '../src/repositories/password-reset-token.repository';
import { RoleName } from '../src/entities/role.entity';

const mockQuery = pool.query as jest.Mock;

const userRow = {
  id: '1',
  first_name: 'Andres',
  last_name: 'Posada',
  email: 'andres@test.com',
  password_hash: 'hashed',
  role: RoleName.ADMIN,
  is_active: true,
  email_verified: true,
  notif_login: false,
  notif_cambios: false,
  last_login: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const refreshTokenRow = {
  id: '1',
  user_id: '1',
  token_hash: 'abc123',
  expires_at: new Date(Date.now() + 60000),
  revoked: false,
  ip_origin: '127.0.0.1',
  user_agent: 'jest',
  created_at: new Date(),
};

describe('UserRepository', () => {
  let userRepo: UserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo = new UserRepository();
  });

  describe('findByEmail', () => {
    it('should return a mapped user when a row is found', async () => {
      mockQuery.mockResolvedValue({ rows: [userRow] });

      const result = await userRepo.findByEmail('andres@test.com');

      expect(result).not.toBeNull();
      expect(result?.firstName).toBe('Andres');
      expect(result?.email).toBe('andres@test.com');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['andres@test.com'],
      );
    });

    it('should return null when no row is found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userRepo.findByEmail('unknown@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a mapped user when a row is found', async () => {
      mockQuery.mockResolvedValue({ rows: [userRow] });

      const result = await userRepo.findById('1');

      expect(result?.id).toBe('1');
      expect(result?.passwordHash).toBe('hashed');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['1']);
    });

    it('should return null when no row is found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userRepo.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert a user and return the mapped row', async () => {
      mockQuery.mockResolvedValue({ rows: [userRow] });

      const result = await userRepo.create({
        firstName: 'Andres',
        lastName: 'Posada',
        email: 'andres@test.com',
        passwordHash: 'hashed',
        role: RoleName.ADMIN,
        isActive: true,
      });

      expect(result.firstName).toBe('Andres');
      expect(result.role).toBe(RoleName.ADMIN);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['Andres', 'Posada', 'andres@test.com', 'hashed', RoleName.ADMIN, true]),
      );
    });
  });

  describe('findAll', () => {
    it('should return all mapped users', async () => {
      mockQuery.mockResolvedValue({ rows: [userRow, { ...userRow, id: '2', email: 'b@test.com' }] });

      const result = await userRepo.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('andres@test.com');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    });

    it('should return an empty array when no users exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userRepo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('updateLastLogin', () => {
    it('should execute an UPDATE query with the given id', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await userRepo.updateLastLogin('1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['1'],
      );
    });
  });

  describe('updateStatus', () => {
    it('should return the mapped user after deactivation', async () => {
      const deactivatedRow = { ...userRow, is_active: false };
      mockQuery.mockResolvedValue({ rows: [deactivatedRow] });

      const result = await userRepo.updateStatus('1', false);

      expect(result?.isActive).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [false, '1'],
      );
    });

    it('should return null when the user does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userRepo.updateStatus('999', false);

      expect(result).toBeNull();
    });
  });
});

describe('RefreshTokenRepository', () => {
  let refreshTokenRepo: RefreshTokenRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    refreshTokenRepo = new RefreshTokenRepository();
  });

  describe('create', () => {
    it('should insert a refresh token and return the mapped row', async () => {
      mockQuery.mockResolvedValue({ rows: [refreshTokenRow] });

      const result = await refreshTokenRepo.create({
        userId: '1',
        tokenHash: 'abc123',
        expiresAt: refreshTokenRow.expires_at,
        ipOrigin: '127.0.0.1',
        userAgent: 'jest',
      });

      expect(result.tokenHash).toBe('abc123');
      expect(result.userId).toBe('1');
      expect(result.revoked).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        expect.arrayContaining(['1', 'abc123']),
      );
    });

    it('should use null for optional ipOrigin and userAgent when not provided', async () => {
      mockQuery.mockResolvedValue({ rows: [refreshTokenRow] });

      await refreshTokenRepo.create({
        userId: '1',
        tokenHash: 'abc123',
        expiresAt: refreshTokenRow.expires_at,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        expect.arrayContaining([null, null]),
      );
    });
  });

  describe('findByHash', () => {
    it('should return the mapped token when found', async () => {
      mockQuery.mockResolvedValue({ rows: [refreshTokenRow] });

      const result = await refreshTokenRepo.findByHash('abc123');

      expect(result?.tokenHash).toBe('abc123');
      expect(result?.revoked).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['abc123']);
    });

    it('should return null when no token matches', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await refreshTokenRepo.findByHash('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('revokeByHash', () => {
    it('should execute an UPDATE to revoke the token by hash', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await refreshTokenRepo.revokeByHash('abc123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('revoked = TRUE'),
        ['abc123'],
      );
    });
  });

  describe('revokeAllByUserId', () => {
    it('should execute an UPDATE to revoke all tokens for a user', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await refreshTokenRepo.revokeAllByUserId('1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('revoked = TRUE'),
        ['1'],
      );
    });
  });
});

describe('UserRepository — new methods', () => {
  let userRepo: UserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo = new UserRepository();
  });

  describe('updatePassword', () => {
    it('should return updated user when row is found', async () => {
      mockQuery.mockResolvedValue({ rows: [userRow] });

      const result = await userRepo.updatePassword('1', 'new-hash');

      expect(result?.passwordHash).toBe('hashed');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['new-hash', '1'],
      );
    });

    it('should return null when no row matched', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userRepo.updatePassword('999', 'new-hash');

      expect(result).toBeNull();
    });
  });

  describe('updatePasswordHash', () => {
    it('should execute UPDATE without returning data', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(userRepo.updatePasswordHash('1', 'new-hash')).resolves.not.toThrow();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['new-hash', '1'],
      );
    });
  });

  describe('updateNotificationPrefs', () => {
    it('should execute UPDATE with notif values', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(userRepo.updateNotificationPrefs('1', true, false)).resolves.not.toThrow();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [true, false, '1'],
      );
    });
  });

  describe('updateEmailVerified', () => {
    it('should execute UPDATE with verified flag', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(userRepo.updateEmailVerified('1', true)).resolves.not.toThrow();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [true, '1'],
      );
    });
  });

  describe('mapRowToUser — null-coalescing defaults', () => {
    it('uses defaults when email_verified/notif_login/notif_cambios are absent', async () => {
      const sparseRow = {
        id: '1', first_name: 'A', last_name: 'B', email: 'a@b.com',
        password_hash: 'h', role: RoleName.ADMIN, is_active: true,
        last_login: null, created_at: new Date(), updated_at: new Date(),
      };
      mockQuery.mockResolvedValue({ rows: [sparseRow] });

      const result = await userRepo.findById('1');

      expect(result?.emailVerified).toBe(true);
      expect(result?.notifLogin).toBe(false);
      expect(result?.notifCambios).toBe(false);
    });
  });

  describe('create — isActive default', () => {
    it('uses true as default when isActive is omitted', async () => {
      mockQuery.mockResolvedValue({ rows: [userRow] });

      await userRepo.create({
        firstName: 'A', lastName: 'B', email: 'a@b.com',
        passwordHash: 'h', role: RoleName.ADMIN,
      } as any);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([true]),
      );
    });
  });
});

describe('EmailVerificationRepository', () => {
  let repo: EmailVerificationRepository;

  const emailVerifRow = {
    id: 'ev1',
    user_id: '1',
    token_hash: 'hashed-ev-token',
    expires_at: new Date(Date.now() + 60000),
    used: false,
    created_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new EmailVerificationRepository();
  });

  describe('create', () => {
    it('should insert a verification record', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(repo.create('1', 'hashed-token', new Date())).resolves.not.toThrow();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO email_verifications'),
        ['1', 'hashed-token', expect.any(Date)],
      );
    });
  });

  describe('findByHash', () => {
    it('should return the mapped record when found', async () => {
      mockQuery.mockResolvedValue({ rows: [emailVerifRow] });

      const result = await repo.findByHash('hashed-ev-token');

      expect(result?.userId).toBe('1');
      expect(result?.used).toBe(false);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.findByHash('unknown-hash');

      expect(result).toBeNull();
    });
  });

  describe('markUsed', () => {
    it('should execute UPDATE to mark as used', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(repo.markUsed('ev1')).resolves.not.toThrow();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE email_verifications'),
        ['ev1'],
      );
    });
  });

  describe('deleteByUserId', () => {
    it('should execute DELETE for the given user', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(repo.deleteByUserId('1')).resolves.not.toThrow();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM email_verifications'),
        ['1'],
      );
    });
  });
});

describe('PasswordResetTokenRepository', () => {
  let repo: PasswordResetTokenRepository;

  const prtRow = {
    id: 'prt1',
    user_id: '1',
    token_hash: 'hashed-prt',
    expires_at: new Date(Date.now() + 60000),
    used: false,
    created_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PasswordResetTokenRepository();
  });

  describe('create', () => {
    it('should insert a reset token and return the mapped row', async () => {
      mockQuery.mockResolvedValue({ rows: [prtRow] });

      const result = await repo.create('1', 'hashed-prt', new Date());

      expect(result.userId).toBe('1');
      expect(result.used).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO password_reset_tokens'),
        ['1', 'hashed-prt', expect.any(Date)],
      );
    });
  });

  describe('findByHash', () => {
    it('should return the mapped token when found', async () => {
      mockQuery.mockResolvedValue({ rows: [prtRow] });

      const result = await repo.findByHash('hashed-prt');

      expect(result?.tokenHash).toBe('hashed-prt');
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repo.findByHash('unknown');

      expect(result).toBeNull();
    });
  });

  describe('markUsed', () => {
    it('should execute UPDATE to mark as used', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(repo.markUsed('prt1')).resolves.not.toThrow();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE password_reset_tokens'),
        ['prt1'],
      );
    });
  });

  describe('deleteExpiredByUserId', () => {
    it('should execute DELETE for expired tokens', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(repo.deleteExpiredByUserId('1')).resolves.not.toThrow();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM password_reset_tokens'),
        ['1'],
      );
    });
  });
});

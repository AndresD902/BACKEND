jest.mock('../src/config/env', () => ({
  env: { databaseUrl: 'postgresql://localhost/test' },
}));

jest.mock('../src/config/database', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../src/config/database';
import { UserRepository } from '../src/repositories/user.repository';
import { RefreshTokenRepository } from '../src/repositories/refreshToken.repository';
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

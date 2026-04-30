jest.mock('../src/config/env', () => ({
  env: {
    jwtSecret: 'test-secret-key-for-utils',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 1,
  },
}));

import { generateJwtToken, verifyJwtToken } from '../src/utils/jwt.util';
import { hashPassword, comparePassword } from '../src/utils/password.util';
import { generateRefreshToken, hashToken } from '../src/utils/token.util';
import { RoleName } from '../src/entities/role.entity';

describe('jwt.util', () => {
  const payload = { sub: '1', email: 'test@test.com', role: RoleName.ADMIN };

  it('generateJwtToken should return a non-empty JWT string', () => {
    const token = generateJwtToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('verifyJwtToken should return the original payload claims', () => {
    const token = generateJwtToken(payload);
    const result = verifyJwtToken(token);
    expect(result.sub).toBe(payload.sub);
    expect(result.email).toBe(payload.email);
    expect(result.role).toBe(payload.role);
  });

  it('verifyJwtToken should throw for a completely invalid token', () => {
    expect(() => verifyJwtToken('not.a.token')).toThrow('Invalid token');
  });

  it('verifyJwtToken should throw for a tampered token', () => {
    const token = generateJwtToken(payload);
    expect(() => verifyJwtToken(token + 'tampered')).toThrow('Invalid token');
  });

  it('verifyJwtToken should throw for a token signed with a different secret', () => {
    const fakeToken =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.wrong-signature';
    expect(() => verifyJwtToken(fakeToken)).toThrow('Invalid token');
  });
});

describe('password.util', () => {
  it('hashPassword should return a bcrypt hash string', async () => {
    const hash = await hashPassword('mypassword');
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it('comparePassword should return true for the correct password', async () => {
    const hash = await hashPassword('mypassword');
    const match = await comparePassword('mypassword', hash);
    expect(match).toBe(true);
  });

  it('comparePassword should return false for a wrong password', async () => {
    const hash = await hashPassword('mypassword');
    const match = await comparePassword('wrongpassword', hash);
    expect(match).toBe(false);
  });

  it('hashPassword should produce different hashes for the same input (salted)', async () => {
    const hash1 = await hashPassword('same');
    const hash2 = await hashPassword('same');
    expect(hash1).not.toBe(hash2);
  });
});

describe('token.util', () => {
  it('generateRefreshToken should return a 128-character hex string', () => {
    const token = generateRefreshToken();
    expect(token).toMatch(/^[a-f0-9]{128}$/);
  });

  it('generateRefreshToken should produce unique tokens on each call', () => {
    const tokens = Array.from({ length: 5 }, generateRefreshToken);
    const unique = new Set(tokens);
    expect(unique.size).toBe(5);
  });

  it('hashToken should return a deterministic 64-character SHA-256 hex string', () => {
    const token = 'some-input-token';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashToken should return different hashes for different inputs', () => {
    expect(hashToken('aaaa')).not.toBe(hashToken('bbbb'));
  });
});

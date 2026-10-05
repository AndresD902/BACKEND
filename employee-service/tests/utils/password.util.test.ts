import { hashPassword, comparePassword } from '../../src/utils/password.util';

describe('password.util', () => {
  describe('hashPassword', () => {
    it('should return a bcrypt hash different from the original password', async () => {
      const hash = await hashPassword('secret123');
      expect(hash).not.toBe('secret123');
      expect(hash).toMatch(/^\$2b\$/);
    });

    it('should produce a different hash on each call (salt)', async () => {
      const hash1 = await hashPassword('secret123');
      const hash2 = await hashPassword('secret123');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for the correct password', async () => {
      const hash = await hashPassword('myPassword');
      expect(await comparePassword('myPassword', hash)).toBe(true);
    });

    it('should return false for an incorrect password', async () => {
      const hash = await hashPassword('myPassword');
      expect(await comparePassword('wrongPassword', hash)).toBe(false);
    });
  });
});

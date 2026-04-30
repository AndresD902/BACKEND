jest.mock('../src/config/env', () => ({
  env: { databaseUrl: 'postgresql://localhost/test' },
}));

import { pool, connectDatabase, disconnectDatabase, checkDatabaseConnection } from '../src/config/database';

// Cast pool to any to bypass pg's overloaded method signatures when spying
const anyPool = pool as any;

describe('database', () => {
  beforeEach(() => jest.restoreAllMocks());

  describe('connectDatabase', () => {
    it('should call pool.connect() and release the client', async () => {
      const mockClient = { release: jest.fn() };
      jest.spyOn(anyPool, 'connect').mockResolvedValue(mockClient);

      await connectDatabase();

      expect(anyPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnectDatabase', () => {
    it('should call pool.end()', async () => {
      jest.spyOn(anyPool, 'end').mockResolvedValue(undefined);

      await disconnectDatabase();

      expect(anyPool.end).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkDatabaseConnection', () => {
    it('should return true when pool.query succeeds', async () => {
      jest.spyOn(anyPool, 'query').mockResolvedValue({ rows: [] });

      const result = await checkDatabaseConnection();

      expect(result).toBe(true);
      expect(anyPool.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return false when pool.query throws', async () => {
      jest.spyOn(anyPool, 'query').mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await checkDatabaseConnection();

      expect(result).toBe(false);
    });
  });
});

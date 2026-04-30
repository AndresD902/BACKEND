const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockRelease = jest.fn();
const mockEnd = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    connect: mockConnect,
    end: mockEnd,
  })),
}));

import { connectDatabase, disconnectDatabase, checkDatabaseConnection } from '../../../src/config/database';

describe('database config', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('connectDatabase', () => {
    it('acquires and releases a client', async () => {
      mockConnect.mockResolvedValue({ release: mockRelease });
      await connectDatabase();
      expect(mockConnect).toHaveBeenCalled();
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('disconnectDatabase', () => {
    it('calls pool.end()', async () => {
      mockEnd.mockResolvedValue(undefined);
      await disconnectDatabase();
      expect(mockEnd).toHaveBeenCalled();
    });
  });

  describe('checkDatabaseConnection', () => {
    it('returns true when query succeeds', async () => {
      mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });
      expect(await checkDatabaseConnection()).toBe(true);
    });

    it('returns false when query throws', async () => {
      mockQuery.mockRejectedValue(new Error('Connection refused'));
      expect(await checkDatabaseConnection()).toBe(false);
    });
  });
});

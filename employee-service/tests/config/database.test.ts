import * as db from '../../src/config/database';

describe('database config', () => {
  let connectSpy: jest.SpyInstance;
  let endSpy: jest.SpyInstance;
  let querySpy: jest.SpyInstance;

  beforeEach(() => {
    const fakeClient = { release: jest.fn() };
    connectSpy = jest.spyOn(db.pool, 'connect').mockResolvedValue(fakeClient as never);
    endSpy = jest.spyOn(db.pool, 'end').mockResolvedValue(undefined);
    querySpy = jest.spyOn(db.pool, 'query').mockResolvedValue({ rows: [] } as never);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('connectDatabase', () => {
    it('should acquire a client and release it', async () => {
      await db.connectDatabase();
      expect(connectSpy).toHaveBeenCalled();
    });
  });

  describe('disconnectDatabase', () => {
    it('should end the pool', async () => {
      await db.disconnectDatabase();
      expect(endSpy).toHaveBeenCalled();
    });
  });

  describe('checkDatabaseConnection', () => {
    it('should return true when the query succeeds', async () => {
      const result = await db.checkDatabaseConnection();
      expect(result).toBe(true);
      expect(querySpy).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return false when the query throws', async () => {
      querySpy.mockRejectedValue(new Error('connection refused'));
      const result = await db.checkDatabaseConnection();
      expect(result).toBe(false);
    });
  });
});

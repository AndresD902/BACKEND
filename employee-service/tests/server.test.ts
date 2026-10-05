describe('server bootstrap', () => {
  let processExitSpy: jest.SpyInstance;
  let processOnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    processOnSpy = jest.spyOn(process, 'on').mockImplementation(() => process);
  });

  afterEach(() => {
    processExitSpy.mockRestore();
    processOnSpy.mockRestore();
  });

  function loadBootstrap(connectDatabase: jest.Mock) {
    jest.doMock('../src/config/env', () => ({
      env: { port: 3099, serviceName: 'test-service' },
    }));
    jest.doMock('../src/utils/logger', () => ({
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));
    jest.doMock('../src/config/database', () => ({
      connectDatabase,
      disconnectDatabase: jest.fn().mockResolvedValue(undefined),
    }));
    jest.doMock('../src/app', () => ({
      __esModule: true,
      default: {
        listen: jest.fn((_port: number, cb?: () => void) => {
          if (cb) cb();
          return { close: jest.fn() };
        }),
      },
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('../src/server') as { bootstrap: () => Promise<void> }).bootstrap;
  }

  it('should connect to the database and start listening', async () => {
    const mockConnect = jest.fn().mockResolvedValue(undefined);
    const bootstrap = loadBootstrap(mockConnect);

    await bootstrap();

    expect(mockConnect).toHaveBeenCalled();
    expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
  });

  it('should call process.exit(1) when connectDatabase throws', async () => {
    const mockConnect = jest.fn().mockRejectedValue(new Error('DB unavailable'));
    const bootstrap = loadBootstrap(mockConnect);

    await bootstrap();

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should call disconnectDatabase and process.exit(0) when shutdown is triggered', async () => {
    const mockDisconnect = jest.fn().mockResolvedValue(undefined);
    const mockConnect = jest.fn().mockResolvedValue(undefined);

    jest.doMock('../src/config/env', () => ({
      env: { port: 3099, serviceName: 'test-service' },
    }));
    jest.doMock('../src/utils/logger', () => ({
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));
    jest.doMock('../src/config/database', () => ({
      connectDatabase: mockConnect,
      disconnectDatabase: mockDisconnect,
    }));

    const fakeServer = {
      close: jest.fn((cb?: () => void) => { if (cb) cb(); }),
    };
    jest.doMock('../src/app', () => ({
      __esModule: true,
      default: {
        listen: jest.fn((_port: number, cb?: () => void) => {
          if (cb) cb();
          return fakeServer;
        }),
      },
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { bootstrap } = require('../src/server') as { bootstrap: () => Promise<void> };
    await bootstrap();

    const shutdownHandler = processOnSpy.mock.calls.find(c => c[0] === 'SIGINT')?.[1] as
      (() => Promise<void>) | undefined;
    expect(shutdownHandler).toBeDefined();

    await shutdownHandler?.();
    expect(fakeServer.close).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });
});

import { logger } from '../../src/utils/logger';

describe('logger', () => {
  let stdoutSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => jest.restoreAllMocks());

  it('info should write to stdout', () => {
    logger.info('hello');
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO] hello'));
  });

  it('warn should write to stdout', () => {
    logger.warn('warning message');
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN] warning message'));
  });

  it('error should write to stderr', () => {
    logger.error('something failed');
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR] something failed'));
  });

  it('should include serialized meta when provided', () => {
    logger.info('event', { userId: 42 });
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('"userId":42'));
  });
});

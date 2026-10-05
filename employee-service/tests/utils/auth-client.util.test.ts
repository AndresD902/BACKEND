import { validateTokenWithAuthService } from '../../src/utils/auth-client.util';

describe('auth-client.util', () => {
  it('should throw when validateTokenWithAuthService is called (not configured)', async () => {
    await expect(validateTokenWithAuthService('any-token')).rejects.toThrow(
      'validateTokenWithAuthService not configured',
    );
  });
});

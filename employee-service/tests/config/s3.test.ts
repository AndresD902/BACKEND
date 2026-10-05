import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned-url'),
}));

import { generarUrlSubida, generarUrlDescarga } from '../../src/config/s3';

const mockGetSignedUrl = getSignedUrl as jest.Mock;

describe('s3 config', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('generarUrlSubida', () => {
    it('should return a presigned upload URL and a generated key', async () => {
      const result = await generarUrlSubida(1, 'photo', 'image/jpeg');
      expect(result.url).toBe('https://s3.example.com/presigned-url');
      expect(result.key).toMatch(/^photos\/1_\d+\.jpeg$/);
    });

    it('should derive extension from content-type second segment', async () => {
      const result = await generarUrlSubida(2, 'cv', 'application/octet-stream');
      expect(result.key).toMatch(/\.octet-stream$/);
    });

    it('should fall back to "bin" when content-type has no subtype', async () => {
      const result = await generarUrlSubida(3, 'photo', 'plaintext');
      expect(result.key).toMatch(/\.bin$/);
    });

    it('should call getSignedUrl with PutObjectCommand and 300s expiry', async () => {
      await generarUrlSubida(1, 'photo', 'image/png');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Object),
        { expiresIn: 300 },
      );
      expect(PutObjectCommand).toHaveBeenCalled();
    });
  });

  describe('generarUrlDescarga', () => {
    it('should return a presigned download URL', async () => {
      const url = await generarUrlDescarga('photos/1_123.jpg');
      expect(url).toBe('https://s3.example.com/presigned-url');
    });

    it('should call getSignedUrl with GetObjectCommand and 3600s expiry', async () => {
      await generarUrlDescarga('photos/test.jpg');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Object),
        { expiresIn: 3600 },
      );
      expect(GetObjectCommand).toHaveBeenCalled();
    });
  });
});

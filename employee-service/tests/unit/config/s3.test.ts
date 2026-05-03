import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { generarUrlSubida, generarUrlDescarga } from '../../../src/config/s3';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn().mockImplementation((params: unknown) => params),
  GetObjectCommand: jest.fn().mockImplementation((params: unknown) => params),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://presigned.url/signed'),
}));

const mockGetSignedUrl = getSignedUrl as jest.Mock;

describe('S3 helpers', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('generarUrlSubida', () => {
    it('returns presigned url and correct key for jpeg', async () => {
      mockGetSignedUrl.mockResolvedValue('https://presigned.url/signed');
      const result = await generarUrlSubida(1, 'foto', 'image/jpeg');
      expect(result.url).toBe('https://presigned.url/signed');
      expect(result.key).toMatch(/^fotos\/1_\d+\.jpeg$/);
    });

    it('uses bin extension for unknown content type', async () => {
      mockGetSignedUrl.mockResolvedValue('https://presigned.url/signed');
      const result = await generarUrlSubida(2, 'contrato', 'application/octet-stream');
      expect(result.key).toMatch(/^contratos\/2_\d+\.octet-stream$/);
    });

    it('calls getSignedUrl with PutObjectCommand', async () => {
      mockGetSignedUrl.mockResolvedValue('https://presigned.url/signed');
      await generarUrlSubida(1, 'hoja_vida', 'application/pdf');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Object),
        { expiresIn: 300 },
      );
      expect(PutObjectCommand).toHaveBeenCalled();
    });
  });

  describe('generarUrlDescarga', () => {
    it('returns presigned download url', async () => {
      mockGetSignedUrl.mockResolvedValue('https://presigned.url/download');
      const url = await generarUrlDescarga('fotos/1_123.jpg');
      expect(url).toBe('https://presigned.url/download');
    });

    it('calls getSignedUrl with GetObjectCommand and 1h expiry', async () => {
      mockGetSignedUrl.mockResolvedValue('https://presigned.url/download');
      await generarUrlDescarga('docs/1.pdf');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Object),
        { expiresIn: 3600 },
      );
      expect(GetObjectCommand).toHaveBeenCalled();
    });
  });
});

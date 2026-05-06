jest.mock('../../src/config/s3', () => ({
  assertContractObjectExists: jest.fn(),
  generateContractDownloadUrl: jest.fn(),
  generateContractUploadUrl: jest.fn(),
}));

import { S3ContractStorageService } from '../../src/services/contract-storage.service';

const s3 = jest.requireMock('../../src/config/s3') as {
  assertContractObjectExists: jest.Mock;
  generateContractDownloadUrl: jest.Mock;
  generateContractUploadUrl: jest.Mock;
};

describe('S3ContractStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips S3 validation when no file key is provided', async () => {
    const service = new S3ContractStorageService();

    await service.validateExistingFile(null);
    await service.validateExistingFile(undefined);

    expect(s3.assertContractObjectExists).not.toHaveBeenCalled();
  });

  it('validates existing files through the S3 helper', async () => {
    const service = new S3ContractStorageService();

    await service.validateExistingFile('contratos/empleados/1/contratos/file.pdf');

    expect(s3.assertContractObjectExists).toHaveBeenCalledWith('contratos/empleados/1/contratos/file.pdf');
  });

  it('delegates upload URL generation preserving the input scope', async () => {
    const service = new S3ContractStorageService();
    const signedUrl = {
      url: 'https://signed-upload.test',
      key: 'contratos/empleados/1/adendas/file.pdf',
      expiresIn: 300,
    };

    s3.generateContractUploadUrl.mockResolvedValue(signedUrl);

    const result = await service.createUploadUrl({
      employeeId: 1,
      contractId: 7,
      contentType: 'application/pdf',
      scope: 'amendment',
    });

    expect(result).toBe(signedUrl);
    expect(s3.generateContractUploadUrl).toHaveBeenCalledWith({
      employeeId: 1,
      contractId: 7,
      contentType: 'application/pdf',
      scope: 'amendment',
    });
  });

  it('delegates download URL generation by S3 key', async () => {
    const service = new S3ContractStorageService();
    const signedUrl = {
      url: 'https://signed-download.test',
      expiresIn: 3600,
    };

    s3.generateContractDownloadUrl.mockResolvedValue(signedUrl);

    const result = await service.createDownloadUrl('contratos/empleados/1/contratos/file.pdf');

    expect(result).toBe(signedUrl);
    expect(s3.generateContractDownloadUrl).toHaveBeenCalledWith('contratos/empleados/1/contratos/file.pdf');
  });
});

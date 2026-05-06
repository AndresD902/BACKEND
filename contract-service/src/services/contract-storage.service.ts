import {
  assertContractObjectExists,
  generateContractDownloadUrl,
  generateContractUploadUrl,
} from '../config/s3';
import type { SignedDownloadUrl, SignedUploadUrl } from '../config/s3';

export interface ContractUploadInput {
  employeeId: number;
  contentType: string;
  scope: 'contract' | 'amendment';
  contractId?: number;
}

export interface ContractStorageService {
  validateExistingFile(fileS3Key?: string | null): Promise<void>;
  createUploadUrl(input: ContractUploadInput): Promise<SignedUploadUrl>;
  createDownloadUrl(fileS3Key: string): Promise<SignedDownloadUrl>;
}

export class S3ContractStorageService implements ContractStorageService {
  public async validateExistingFile(fileS3Key?: string | null): Promise<void> {
    if (!fileS3Key) {
      return;
    }

    await assertContractObjectExists(fileS3Key);
  }

  public createUploadUrl(input: ContractUploadInput): Promise<SignedUploadUrl> {
    return generateContractUploadUrl(input);
  }

  public createDownloadUrl(fileS3Key: string): Promise<SignedDownloadUrl> {
    return generateContractDownloadUrl(fileS3Key);
  }
}

export const contractStorageService = new S3ContractStorageService();

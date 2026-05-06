import { randomUUID } from 'crypto';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';
import { AppError } from '../shared/errors/app-error';
import { ValidationError } from '../shared/errors/validation.error';

export interface SignedUploadUrl {
  url: string;
  key: string;
  expiresIn: number;
}

export interface SignedDownloadUrl {
  url: string;
  expiresIn: number;
}

const UPLOAD_EXPIRES_IN_SECONDS = 300;
const DOWNLOAD_EXPIRES_IN_SECONDS = 3600;

let s3Client: S3Client | null = null;

function ensureS3Configuration(): void {
  if (!env.s3BucketName) {
    throw new AppError('S3 storage is not configured for contract-service', 503);
  }

  const hasAccessKey = Boolean(env.awsAccessKeyId);
  const hasSecretKey = Boolean(env.awsSecretAccessKey);

  if (hasAccessKey !== hasSecretKey) {
    throw new AppError('S3 credentials must include both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY', 503);
  }
}

function buildS3ClientConfig(): S3ClientConfig {
  const config: S3ClientConfig = {
    region: env.awsRegion,
  };

  if (env.awsAccessKeyId && env.awsSecretAccessKey) {
    config.credentials = {
      accessKeyId: env.awsAccessKeyId,
      secretAccessKey: env.awsSecretAccessKey,
    };
  }

  return config;
}

function getS3Client(): S3Client {
  ensureS3Configuration();

  if (!s3Client) {
    s3Client = new S3Client(buildS3ClientConfig());
  }

  return s3Client;
}

function extensionFromContentType(contentType: string): string {
  const normalized = contentType.toLowerCase();

  if (normalized === 'application/pdf') {
    return 'pdf';
  }

  if (normalized === 'application/msword') {
    return 'doc';
  }

  if (normalized === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  }

  return 'bin';
}

export async function generateContractUploadUrl(input: {
  employeeId: number;
  contentType: string;
  scope: 'contract' | 'amendment';
  contractId?: number;
}): Promise<SignedUploadUrl> {
  const extension = extensionFromContentType(input.contentType);
  const folder = input.scope === 'contract' ? 'contratos' : 'adendas';
  const contractSegment = input.contractId ? `/contrato-${input.contractId}` : '';
  const key = `contratos/empleados/${input.employeeId}${contractSegment}/${folder}/${Date.now()}-${randomUUID()}.${extension}`;

  const url = await getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: env.s3BucketName,
      Key: key,
      ContentType: input.contentType,
    }),
    { expiresIn: UPLOAD_EXPIRES_IN_SECONDS },
  );

  return {
    url,
    key,
    expiresIn: UPLOAD_EXPIRES_IN_SECONDS,
  };
}

export async function generateContractDownloadUrl(key: string): Promise<SignedDownloadUrl> {
  const url = await getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: env.s3BucketName,
      Key: key,
    }),
    { expiresIn: DOWNLOAD_EXPIRES_IN_SECONDS },
  );

  return {
    url,
    expiresIn: DOWNLOAD_EXPIRES_IN_SECONDS,
  };
}

export async function assertContractObjectExists(key: string): Promise<void> {
  try {
    await getS3Client().send(
      new HeadObjectCommand({
        Bucket: env.s3BucketName,
        Key: key,
      }),
    );
  } catch (error) {
    const metadata = error as { '$metadata'?: { httpStatusCode?: number }; name?: string };

    if (metadata.$metadata?.httpStatusCode === 404 || metadata.name === 'NotFound') {
      throw new ValidationError('Contract file was not found in S3', { key });
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Could not validate contract file in S3', 503, { key });
  }
}

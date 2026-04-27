import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

const s3 = new S3Client({
  region: env.awsRegion,
  credentials: {
    accessKeyId:     env.awsAccessKeyId,
    secretAccessKey: env.awsSecretAccessKey,
  },
});

export const generarUrlSubida = async (
  empleadoId: number,
  tipo: string,
  contentType: string,
): Promise<{ url: string; key: string }> => {
  const extension = contentType.split('/')[1] ?? 'bin';
  const key = `${tipo}s/${empleadoId}_${Date.now()}.${extension}`;

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: env.s3BucketName, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );

  return { url, key };
};

export const generarUrlDescarga = async (key: string): Promise<string> =>
  getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.s3BucketName, Key: key }),
    { expiresIn: 3600 },
  );

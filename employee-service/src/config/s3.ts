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

// Maps each document type to its S3 folder prefix
const FOLDER: Record<string, string> = {
  foto:        'fotos',
  hoja_vida:   'hojas_vida',
  certificado: 'certificados',
  diploma:     'diplomas',
  contrato:    'contratos',
  otro:        'otros',
};

export const generarUrlSubida = async (
  empleadoId: number,
  tipo: string,
  contentType: string,
): Promise<{ url: string; key: string }> => {
  // jpeg → jpg for cleaner filenames; pdf stays pdf
  const rawExt  = contentType.split('/')[1] ?? 'bin';
  const extension = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const folder  = FOLDER[tipo] ?? `${tipo}s`;
  const key = `${folder}/${empleadoId}_${Date.now()}.${extension}`;

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

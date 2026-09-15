import { Storage } from '@google-cloud/storage';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'certikus-documentos';

if (!BUCKET_NAME) {
  throw new Error('Falta la variable de entorno GCS_BUCKET_NAME');
}

export const storage = new Storage();
export const bucket = storage.bucket(BUCKET_NAME);
export const bucketName = BUCKET_NAME;

export async function generateSignedUrl(
  filePath: string,
  expirationMinutes = 60
): Promise<string> {
  const [url] = await bucket.file(filePath).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expirationMinutes * 60 * 1000,
  });
  return url;
}
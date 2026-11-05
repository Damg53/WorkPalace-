import { randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucket = 'assets';
const objectReferencePrefix = `neon-object://${bucket}/`;
const maxProfileImageBytes = 5 * 1024 * 1024;
const imageTypes = {
  'image/jpeg': { extension: 'jpg', signature: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  'image/png': { extension: 'png', signature: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { extension: 'webp', signature: (bytes) => bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' },
};

const s3 = new S3Client({ forcePathStyle: true });

export async function storeProfileImage(userId, dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl);
  if (!match) {
    const error = new Error('La imagen debe ser JPEG, PNG o WebP.');
    error.statusCode = 400;
    throw error;
  }

  const contentType = match[1].toLowerCase();
  const imageType = imageTypes[contentType];
  const body = Buffer.from(match[2], 'base64');
  if (body.length === 0 || body.length > maxProfileImageBytes || !imageType.signature(body)) {
    const error = new Error('La imagen no es válida o supera el límite de 5 MB.');
    error.statusCode = 400;
    throw error;
  }

  const key = `profile-images/${userId}/${randomUUID()}.${imageType.extension}`;
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return `${objectReferencePrefix}${key}`;
}

export async function getProfileImageUrl(reference) {
  if (!reference?.startsWith(objectReferencePrefix)) return reference;

  const key = reference.slice(objectReferencePrefix.length);
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 3600 },
  );
}

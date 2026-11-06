import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ENCRYPTION_KEY_ENV = 'TOTP_ENCRYPTION_KEY';

function getEncryptionKey() {
  const value = process.env[ENCRYPTION_KEY_ENV] || '';
  if (!/^[\da-f]{64}$/i.test(value)) {
    const error = new Error(`${ENCRYPTION_KEY_ENV} debe contener 64 caracteres hexadecimales.`);
    error.statusCode = 503;
    throw error;
  }
  return Buffer.from(value, 'hex');
}

export function generateTotpSecret() {
  const bytes = randomBytes(20);
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let secret = '';
  for (let index = 0; index < bits.length; index += 5) {
    secret += BASE32_ALPHABET[Number.parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
  }
  return secret;
}

function decodeBase32(secret) {
  const normalized = secret.replace(/[\s=-]/g, '').toUpperCase();
  if (!normalized || !/^[A-Z2-7]+$/.test(normalized)) {
    throw new Error('El secreto TOTP almacenado no es válido.');
  }

  let bits = '';
  for (const character of normalized) {
    bits += BASE32_ALPHABET.indexOf(character).toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

export function encryptTotpSecret(secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptTotpSecret(value) {
  const [ivValue, tagValue, encryptedValue] = String(value || '').split('.');
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error('El secreto TOTP almacenado no tiene un formato válido.');
  }

  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function createTotpUri(secret, accountName) {
  const issuer = 'WorkPalace';
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function findTotpStep(secret, token, now = Date.now()) {
  if (!/^\d{6}$/.test(String(token))) return null;

  const key = decodeBase32(secret);
  const currentStep = Math.floor(now / 30_000);
  const matchingSteps = [];
  for (const step of [currentStep - 1, currentStep, currentStep + 1]) {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const digest = createHmac('sha1', key).update(counter).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary = digest.readUInt32BE(offset) & 0x7fffffff;
    const expected = String(binary % 1_000_000).padStart(6, '0');
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(token))) matchingSteps.push(step);
  }

  return matchingSteps.length ? Math.max(...matchingSteps) : null;
}

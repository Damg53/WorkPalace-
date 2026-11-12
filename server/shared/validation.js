export const normalizeText = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
};

const PROFANITY_TERMS = [
  'asshole', 'bastardo', 'bitch', 'cabrón', 'cagada', 'carechimba',
  'chucha', 'coño', 'fuck', 'gonorrea', 'gonorreas', 'hijueputa',
  'hijueputas', 'hp', 'idiota', 'malparida', 'malparidas', 'malparido',
  'malparidos', 'marica', 'maricas', 'maricón', 'maricones', 'mierda',
  'mierdas', 'pendeja', 'pendejas', 'pendejo', 'pendejos', 'perra',
  'perras', 'puta', 'putas', 'puto', 'putos', 'verga', 'vergas',
];

export const containsProfanity = (value) => {
  const normalized = normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return PROFANITY_TERMS.some((term) => {
    const normalizedTerm = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const pattern = normalizedTerm.split('').join('[^a-z0-9]*');
    return new RegExp(`(^|[^a-z0-9])${pattern}($|[^a-z0-9])`).test(normalized);
  });
};

export const hasProfanityInFields = (payload, fields) =>
  fields.some((field) => typeof payload?.[field] === 'string' && containsProfanity(payload[field]));

const NON_USER_TEXT_FIELDS = new Set([
  'password', 'confirm', 'confirm-password', 'confirmpassword',
  'currentpassword', 'newpassword', 'token', 'challengetoken',
  'challengeid', 'totpsecret', 'secret', 'image_url',
  'profile_image_url', 'profileimage',
]);

export const containsProfanityInPayload = (payload, fieldName = '') => {
  if (typeof payload === 'string') {
    return !NON_USER_TEXT_FIELDS.has(fieldName.toLowerCase()) &&
      !payload.startsWith('data:image/') &&
      containsProfanity(payload);
  }
  if (Array.isArray(payload)) {
    return payload.some((value) => containsProfanityInPayload(value, fieldName));
  }
  if (payload && typeof payload === 'object') {
    return Object.entries(payload).some(([key, value]) => containsProfanityInPayload(value, key));
  }
  return false;
};

export const isValidCapacity = (value) =>
  (typeof value === 'string' && /^\d+$/.test(value.trim()) || typeof value === 'number') &&
  Number.isSafeInteger(Number(value)) && Number(value) > 0;

export const parseNonNegativeInteger = (value) => {
  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export const isSafeName = (value) => /^[\p{L}\p{N} .'-]{2,100}$/u.test(value);
export const isSafeUsername = (value) => /^[\p{L}\p{N}._-]{3,50}$/u.test(value);
export const isSafePassword = (value) => value.length >= 6 && value.length <= 128;
export const isSafeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const normalizeColombianPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('57') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith('3')) return `+57${digits}`;
  return '';
};

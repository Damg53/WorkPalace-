export const normalizeText = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
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

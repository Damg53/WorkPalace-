export function normalizeColombianPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length === 12 && digits.startsWith('57') ? digits.slice(2) : digits
}

export function isValidColombianMobile(value: string) {
  return /^3\d{9}$/.test(normalizeColombianPhone(value))
}

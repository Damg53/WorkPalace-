import pool from '../../db.js';

const COUPONS = new Set(['BACANO10', 'BIENVENIDO15', 'SEMANA10', 'MES20', 'WORKPALACE5', 'BOF']);
const COUPON_DISCOUNTS = { BACANO10: 10, BIENVENIDO15: 15, SEMANA10: 10, MES20: 20, WORKPALACE5: 5, BOF: 90 };

export const isValidCardExpiry = (value) => {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(String(value || ''));
  if (!match) return false;
  const expiry = new Date(2000 + Number(match[2]), Number(match[1]), 0);
  const now = new Date();
  return expiry >= new Date(now.getFullYear(), now.getMonth() + 1, 0);
};

export async function findCoupon(code) {
  try {
    const result = await pool.query(
      `SELECT code, discount, max_uses, used_count, starts_at, ends_at, active
       FROM coupons
       WHERE code = $1
         AND active = TRUE
         AND (starts_at IS NULL OR starts_at <= CURRENT_DATE)
         AND (ends_at IS NULL OR ends_at >= CURRENT_DATE)
         AND (max_uses IS NULL OR used_count < max_uses)`,
      [code]
    );
    if (result.rows[0]) return result.rows[0];
    const configured = await pool.query('SELECT 1 FROM coupons WHERE code = $1 LIMIT 1', [code]);
    if (configured.rows.length > 0) return null;
    return COUPONS.has(code)
      ? { code, discount: COUPON_DISCOUNTS[code], max_uses: null, used_count: 0, active: true }
      : null;
  } catch (_error) {
    return COUPONS.has(code) ? { code, discount: COUPON_DISCOUNTS[code], max_uses: null, used_count: 0, active: true } : null;
  }
}

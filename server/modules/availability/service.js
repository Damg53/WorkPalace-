import pool from '../../db.js';

export async function syncPlaceReservationState(placeId, queryable = pool) {
  if (!placeId) return;
  const activeReservation = await queryable.query(
    `SELECT 1 FROM reservations
     WHERE place_id = $1 AND active = TRUE AND estado IN ('pendiente', 'confirmada')
       AND check_out >= CURRENT_DATE
     LIMIT 1`,
    [placeId]
  );
  await queryable.query(
    'UPDATE places SET active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [activeReservation.rows.length === 0, placeId]
  );
}

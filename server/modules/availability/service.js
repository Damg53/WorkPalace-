import pool from '../../db.js';

export async function syncPlaceReservationState(placeId, queryable = pool) {
  if (!placeId) return;
  await queryable.query(
    'UPDATE places SET active = owner_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [placeId]
  );
}

export async function completeExpiredReservations() {
  const client = await pool.connect();
  let inTransaction = false;
  try {
    await client.query('BEGIN');
    inTransaction = true;
    const expired = await client.query(
      `UPDATE reservations r
       SET estado = 'completada', updated_at = CURRENT_TIMESTAMP
       WHERE r.estado = 'confirmada'
         AND (
           r.check_out < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
           OR (
             r.check_out = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
             AND COALESCE(r.check_out_time, TIME '23:59:59') <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::time
           )
         )
         AND (
           r.reservation_series_id IS NULL
           OR (
             NOT EXISTS (
               SELECT 1 FROM reservations sibling
               WHERE sibling.reservation_series_id = r.reservation_series_id
                 AND sibling.estado <> 'confirmada'
             )
             AND NOT EXISTS (
               SELECT 1 FROM reservations future
               WHERE future.reservation_series_id = r.reservation_series_id
                 AND (
                   future.check_out > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
                   OR (
                     future.check_out = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
                     AND COALESCE(future.check_out_time, TIME '23:59:59') > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::time
                   )
                 )
             )
           )
         )
       RETURNING id, user_id, hotel, place_id, reservation_series_id`
    );
    const groups = new Map();
    for (const reservation of expired.rows) {
      const key = reservation.reservation_series_id ?? `reservation:${reservation.id}`;
      const group = groups.get(key) ?? [];
      group.push(reservation);
      groups.set(key, group);
    }

    for (const group of groups.values()) {
      const reservation = group[0];
      await client.query(
        `INSERT INTO user_notifications (user_id, reservation_id, title, detail, tone)
         VALUES ($1, $2, 'Reserva completada', $3, 'success')`,
        [
          reservation.user_id,
          reservation.id,
          reservation.reservation_series_id
            ? `Tu serie de ${group.length} citas para ${reservation.hotel} se completó automáticamente al finalizar la última cita.`
            : `Tu reserva para ${reservation.hotel} se completó automáticamente al finalizar el período reservado.`,
        ]
      );
      await syncPlaceReservationState(reservation.place_id, client);
    }
    await client.query('COMMIT');
    inTransaction = false;
    return expired.rows.length;
  } catch (error) {
    if (inTransaction) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

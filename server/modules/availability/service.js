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
      `UPDATE reservations
       SET estado = 'completada', updated_at = CURRENT_TIMESTAMP
       WHERE estado = 'confirmada'
         AND (
           check_out < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
           OR (
             check_out = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
             AND COALESCE(check_out_time, TIME '23:59:59') <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::time
           )
         )
       RETURNING id, user_id, hotel, place_id`
    );
    for (const reservation of expired.rows) {
      await client.query(
        `INSERT INTO user_notifications (user_id, reservation_id, title, detail, tone)
         VALUES ($1, $2, 'Reserva completada', $3, 'success')`,
        [reservation.user_id, reservation.id, `Tu reserva para ${reservation.hotel} se completó automáticamente al finalizar el período reservado.`]
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

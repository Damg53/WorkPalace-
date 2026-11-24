import assert from 'node:assert/strict';
import test from 'node:test';
import { getDailyAppointmentIntervals, getNightEndDateTime } from './schedule.js';
import { groupReservationSeries } from './series.js';

test('night reservations end the morning after the final night', () => {
  assert.deepEqual(getNightEndDateTime('2026-11-24', 1), {
    date: '2026-11-25',
    time: '08:00',
  });
  assert.deepEqual(getNightEndDateTime('2026-11-24', 3), {
    date: '2026-11-27',
    time: '08:00',
  });
});

test('daily appointment intervals stay one hour apart on consecutive dates', () => {
  assert.deepEqual(getDailyAppointmentIntervals('2026-11-24', '23:30', 2), [
    { checkIn: '2026-11-24', checkOut: '2026-11-25', checkInTime: '23:30', checkOutTime: '00:30' },
    { checkIn: '2026-11-25', checkOut: '2026-11-26', checkInTime: '23:30', checkOutTime: '00:30' },
  ]);
});

test('appointment series are grouped while standalone reservations remain separate', () => {
  const grouped = groupReservationSeries([
    { id: 2, reservation_series_id: 'series-a', check_in: '2026-11-25', check_out: '2026-11-25', check_out_time: '14:00', huespedes: 1, total_amount: '1080', can_complete: false },
    { id: 3, reservation_series_id: null, check_in: '2026-11-26', check_out: '2026-11-26', huespedes: 1, total_amount: '500' },
    { id: 1, reservation_series_id: 'series-a', check_in: '2026-11-24', check_out: '2026-11-24', check_out_time: '14:00', huespedes: 1, total_amount: '1079', can_complete: true },
  ]);

  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].id, 3);
  assert.equal(grouped[1].id, 1);
  assert.equal(grouped[1].check_out, '2026-11-25');
  assert.equal(grouped[1].huespedes, 2);
  assert.equal(grouped[1].total_amount, 2159);
  assert.equal(grouped[1].can_complete, false);
});

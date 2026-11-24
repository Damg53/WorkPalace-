export function groupReservationSeries(rows) {
  const individualRows = [];
  const seriesById = new Map();
  const dateValue = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

  for (const row of rows) {
    if (!row.reservation_series_id) {
      individualRows.push(row);
      continue;
    }

    const series = seriesById.get(row.reservation_series_id) ?? [];
    series.push(row);
    seriesById.set(row.reservation_series_id, series);
  }

  const groupedRows = [...seriesById.values()].map((series) => {
    const ordered = [...series].sort((a, b) => dateValue(a.check_in).localeCompare(dateValue(b.check_in)));
    const first = ordered[0];
    const last = ordered[ordered.length - 1];

    return {
      ...first,
      check_out: last.check_out,
      check_out_time: last.check_out_time,
      huespedes: series.reduce((total, row) => total + Number(row.huespedes || 0), 0),
      total_amount: series.reduce((total, row) => total + Number(row.total_amount || 0), 0),
      can_complete: series.every((row) => row.can_complete !== false),
      series_count: series.length,
    };
  });

  return [...individualRows, ...groupedRows].sort((a, b) =>
    dateValue(b.check_in).localeCompare(dateValue(a.check_in))
  );
}

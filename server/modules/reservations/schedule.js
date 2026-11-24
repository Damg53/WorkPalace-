export function addDaysToDate(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getEndDateTime(startDate, startTime, durationHours) {
  const totalMinutes = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3)) + durationHours * 60;
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Math.floor(totalMinutes / 1440));
  const endTime = `${String(Math.floor((totalMinutes % 1440) / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  return { date: date.toISOString().slice(0, 10), time: endTime };
}

export function getNightEndDateTime(startDate, nights) {
  return getEndDateTime(startDate, '18:00', 14 + (nights - 1) * 24);
}

export function getDailyAppointmentIntervals(startDate, startTime, count) {
  return Array.from({ length: count }, (_, index) => {
    const checkIn = addDaysToDate(startDate, index);
    const end = getEndDateTime(checkIn, startTime, 1);
    return {
      checkIn,
      checkOut: end.date,
      checkInTime: startTime,
      checkOutTime: end.time,
    };
  });
}

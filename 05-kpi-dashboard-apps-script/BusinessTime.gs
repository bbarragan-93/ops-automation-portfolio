/**
 * Business hours elapsed between two instants inside the support window.
 * Each day's open/close boundary is built from local wall time, so DST
 * changes don't create or remove an hour.
 */
function businessHoursBetween_(start, end) {
  start = new Date(start); end = new Date(end);
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  const tz = KPI_CONFIG.TIME_ZONE;
  let day = Utilities.formatDate(start, tz, 'yyyy-MM-dd');
  const last = Utilities.formatDate(end, tz, 'yyyy-MM-dd');
  let ms = 0;
  for (let guard = 0; day <= last && guard < 5000; guard++) {
    const weekday = new Date(day + 'T12:00:00Z').getUTCDay();
    if (weekday >= 1 && weekday <= 5 && KPI_CONFIG.HOLIDAYS.indexOf(day) === -1) {
      const open = wallTime_(day, KPI_CONFIG.BUSINESS_DAY_START_HOUR, tz);
      const close = wallTime_(day, KPI_CONFIG.BUSINESS_DAY_END_HOUR, tz);
      const lo = Math.max(start.getTime(), open.getTime());
      const hi = Math.min(end.getTime(), close.getTime());
      if (hi > lo) ms += hi - lo;
    }
    const next = new Date(day + 'T12:00:00Z'); next.setUTCDate(next.getUTCDate() + 1);
    day = Utilities.formatDate(next, 'UTC', 'yyyy-MM-dd');
  }
  return ms / 3600000;
}

function wallTime_(isoDay, hour, tz) {
  const guess = new Date(isoDay + 'T' + ('0' + hour).slice(-2) + ':00:00Z');
  const offset = function (d) {
    const z = Utilities.formatDate(d, tz, 'Z'); // e.g. -0800
    const sign = z[0] === '-' ? -1 : 1;
    return sign * (Number(z.slice(1, 3)) * 60 + Number(z.slice(3, 5)));
  };
  const first = new Date(guess.getTime() - offset(guess) * 60000);
  return new Date(guess.getTime() - offset(first) * 60000);
}

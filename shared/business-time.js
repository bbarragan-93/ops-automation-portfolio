'use strict';
/**
 * Business-time math for SLA tracking.
 *
 * Counts only the minutes that fall inside a support window (default
 * Mon–Fri 09:00–17:00 in a configured IANA time zone), skipping weekends and
 * configured holidays. Each day's window is computed from local wall-clock
 * time, so daylight-saving transitions never add or remove a phantom hour.
 */

const DEFAULTS = {
  timeZone: 'America/Los_Angeles',
  startHour: 9,
  endHour: 17,
  workdays: [1, 2, 3, 4, 5], // Mon..Fri (0 = Sunday)
  holidays: [],              // ['2026-12-25', ...] local civil dates
};

/** Offset (minutes) between UTC and the zone at a given instant. */
function zoneOffsetMinutes(instant, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(fmt.formatToParts(instant).map(x => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/** Local civil date {year, month, day} for an instant in a zone. */
function civilDate(instant, timeZone) {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(instant);
  const [year, month, day] = s.split('-').map(Number);
  return { year, month, day };
}

const dateKey = d => `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

function nextDate(d) {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + 1));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

/** Convert a local wall time on a civil date to a UTC instant. */
function wallTimeToInstant(d, hour, minute, timeZone) {
  const guess = new Date(Date.UTC(d.year, d.month - 1, d.day, hour, minute));
  const first = new Date(guess.getTime() - zoneOffsetMinutes(guess, timeZone) * 60000);
  // Second pass corrects guesses that straddle a DST boundary.
  return new Date(guess.getTime() - zoneOffsetMinutes(first, timeZone) * 60000);
}

function isBusinessDay(d, cfg) {
  const weekday = new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
  return cfg.workdays.includes(weekday) && !cfg.holidays.includes(dateKey(d));
}

/** Business minutes elapsed between two instants. */
function businessMinutesBetween(start, end, options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  start = new Date(start); end = new Date(end);
  if (isNaN(start) || isNaN(end) || end <= start) return 0;

  let day = civilDate(start, cfg.timeZone);
  const lastKey = dateKey(civilDate(end, cfg.timeZone));
  let ms = 0;
  for (let guard = 0; dateKey(day) <= lastKey; guard++) {
    if (guard > 5000) throw new Error('business-time: date range too large');
    if (isBusinessDay(day, cfg)) {
      const open = wallTimeToInstant(day, cfg.startHour, 0, cfg.timeZone).getTime();
      const close = wallTimeToInstant(day, cfg.endHour, 0, cfg.timeZone).getTime();
      const lo = Math.max(start.getTime(), open);
      const hi = Math.min(end.getTime(), close);
      if (hi > lo) ms += hi - lo;
    }
    day = nextDate(day);
  }
  return Math.floor(ms / 60000);
}

/** True when `now` falls inside the support window. */
function isWithinBusinessHours(now, options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  const d = civilDate(new Date(now), cfg.timeZone);
  if (!isBusinessDay(d, cfg)) return false;
  const t = new Date(now).getTime();
  return t >= wallTimeToInstant(d, cfg.startHour, 0, cfg.timeZone).getTime()
      && t < wallTimeToInstant(d, cfg.endHour, 0, cfg.timeZone).getTime();
}

/** Count business days between two instants (used for "stale" checks). */
function businessDaysBetween(start, end, options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  let day = nextDate(civilDate(new Date(start), cfg.timeZone));
  const lastKey = dateKey(civilDate(new Date(end), cfg.timeZone));
  let n = 0;
  while (dateKey(day) <= lastKey) {
    if (isBusinessDay(day, cfg)) n++;
    day = nextDate(day);
  }
  return n;
}

module.exports = {
  DEFAULTS, businessMinutesBetween, businessDaysBetween, isWithinBusinessHours,
  civilDate, dateKey, wallTimeToInstant, zoneOffsetMinutes,
};

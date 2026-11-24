/** Pure KPI math over a task list. No I/O, so it is easy to test. */
function calculateSnapshot_(tasks, now) {
  const DAY = DAY_MS;
  const F = KPI_CONFIG.FIELDS;
  const within = function (d, days) { return d && now - new Date(d) <= days * DAY; };
  const created30 = tasks.filter(function (t) { return within(t.created_at, 30); });
  const created7 = tasks.filter(function (t) { return within(t.created_at, 7); });
  const done30 = tasks.filter(function (t) { return t.completed && within(t.completed_at, 30); });
  const open = tasks.filter(function (t) { return !t.completed; });

  const firstResponse = created30.map(function (t) {
    const at = fieldValue_(t, F.FIRST_RESPONSE_AT);
    return at ? businessHoursBetween_(t.created_at, at) : null;
  }).filter(function (h) { return h !== null; });

  const resolution = done30.map(function (t) {
    return businessHoursBetween_(t.created_at, t.completed_at);
  }).filter(function (h) { return h !== null; });

  const aging = { '0–2 days': 0, '3–5 days': 0, '6–10 days': 0, '11+ days': 0 };
  open.forEach(function (t) {
    const age = Math.floor((now - new Date(t.created_at)) / DAY);
    aging[age <= 2 ? '0–2 days' : age <= 5 ? '3–5 days' : age <= 10 ? '6–10 days' : '11+ days']++;
  });

  const rate = function (list, aliases, yes) {
    const answered = list.filter(function (t) { return fieldValue_(t, aliases); });
    return answered.length ? answered.filter(function (t) { return yes.test(fieldValue_(t, aliases)); }).length / answered.length : null;
  };

  return {
    generatedAt: now,
    created7: created7.length,
    created30: created30.length,
    completed30: done30.length,
    openNow: open.length,
    medianFirstResponseHours: median_(firstResponse),
    firstResponseSlaRate: firstResponse.length
      ? firstResponse.filter(function (h) { return h <= KPI_CONFIG.FIRST_RESPONSE_SLA_HOURS; }).length / firstResponse.length : null,
    medianResolutionHours: median_(resolution),
    intakeCompleteRate: rate(created30, F.INTAKE_COMPLETE, /^yes/i),
    repeatRate: rate(done30, F.REPEAT, /^yes/i),
    escalationRate: rate(done30, F.ESCALATED, /^yes/i),
    aging: aging,
    topRequestTypes: topCounts_(created30, F.REQUEST_TYPE, 5),
    topAutomationIdeas: topCounts_(done30, F.AUTOMATION, 3),
  };
}

function median_(xs) {
  if (!xs.length) return null;
  const s = xs.slice().sort(function (a, b) { return a - b; });
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function topCounts_(tasks, aliases, limit) {
  const counts = {};
  tasks.forEach(function (t) {
    const v = fieldValue_(t, aliases);
    if (v && !/^(n\/a|not applicable|none)$/i.test(v)) counts[v] = (counts[v] || 0) + 1;
  });
  return Object.keys(counts).map(function (k) { return [k, counts[k]]; })
    .sort(function (a, b) { return b[1] - a[1]; }).slice(0, limit);
}

/** Weekly KPI summary email: HTML + plain-text fallback, sent by trigger. */
function sendWeeklyKpiEmail() {
  const now = new Date();
  const tasks = fetchTasks_(new Date(now.getTime() - 60 * DAY_MS));
  const s = calculateSnapshot_(tasks, now);
  const subject = 'Support KPIs — week of ' + Utilities.formatDate(now, KPI_CONFIG.TIME_ZONE, 'MMM d, yyyy');
  MailApp.sendEmail({
    to: prop_('KPI_RECIPIENTS', true),
    subject: subject,
    htmlBody: renderHtml_(s),
    body: renderPlainText_(s),
  });
}

/** Run manually to see the email in the log without sending it. */
function previewWeeklyKpiEmail() {
  const s = calculateSnapshot_(fetchTasks_(new Date(Date.now() - 60 * DAY_MS)), new Date());
  Logger.log(renderPlainText_(s));
}

/** Idempotent trigger install: Mondays 08:00–09:00 in the script's time zone. */
function installMondayTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'sendWeeklyKpiEmail'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendWeeklyKpiEmail').timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
}

const pct_ = function (r) { return r === null ? '—' : Math.round(r * 100) + '%'; };
const hrs_ = function (h) { return h === null ? '—' : h.toFixed(1) + ' business hrs'; };
const esc_ = function (v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

function card_(label, value) {
  return '<td style="padding:12px;border:1px solid #e5e7eb;border-radius:8px">' +
    '<div style="font-size:12px;color:#6b7280">' + esc_(label) + '</div>' +
    '<div style="font-size:22px;font-weight:600">' + esc_(value) + '</div></td>';
}

function renderHtml_(s) {
  const list = function (rows) {
    return rows.length ? '<ol>' + rows.map(function (r) { return '<li>' + esc_(r[0]) + ' — ' + r[1] + '</li>'; }).join('') + '</ol>' : '<p>None yet.</p>';
  };
  return '<div style="font-family:Arial,sans-serif;max-width:640px">' +
    '<h2>Weekly support KPIs</h2><table cellspacing="8"><tr>' +
    card_('New (7d)', s.created7) + card_('Closed (30d)', s.completed30) + card_('Open now', s.openNow) +
    '</tr><tr>' +
    card_('First-response SLA met', pct_(s.firstResponseSlaRate)) +
    card_('Median first response', hrs_(s.medianFirstResponseHours)) +
    card_('Median resolution', hrs_(s.medianResolutionHours)) +
    '</tr><tr>' +
    card_('Complete on arrival', pct_(s.intakeCompleteRate)) +
    card_('Repeat issues', pct_(s.repeatRate)) +
    card_('Escalated', pct_(s.escalationRate)) +
    '</tr></table>' +
    '<h3>Open backlog by age</h3><p>' + Object.keys(s.aging).map(function (k) { return esc_(k) + ': ' + s.aging[k]; }).join(' · ') + '</p>' +
    '<h3>Top request types (30d)</h3>' + list(s.topRequestTypes) +
    '<h3>Automation candidates</h3>' + list(s.topAutomationIdeas) + '</div>';
}

function renderPlainText_(s) {
  return [
    'Weekly support KPIs',
    'New (7d): ' + s.created7 + ' | Closed (30d): ' + s.completed30 + ' | Open: ' + s.openNow,
    'First-response SLA met: ' + pct_(s.firstResponseSlaRate) + ' | Median first response: ' + hrs_(s.medianFirstResponseHours),
    'Median resolution: ' + hrs_(s.medianResolutionHours),
    'Complete on arrival: ' + pct_(s.intakeCompleteRate) + ' | Repeat: ' + pct_(s.repeatRate) + ' | Escalated: ' + pct_(s.escalationRate),
    'Backlog age: ' + Object.keys(s.aging).map(function (k) { return k + ' ' + s.aging[k]; }).join(', '),
  ].join('\n');
}

'use strict';
const test = require('node:test');
const assert = require('node:assert');
const bt = require('../shared/business-time');
const { SeenStore } = require('../shared/seen-store');
const sla = require('../01-sla-early-warning/sla_monitor');
const esc = require('../02-escalation-sync/escalation_sync');
const stale = require('../03-stale-request-nudge/stale_nudge');
const rep = require('../04-repeat-issue-detection/repeat_issues');
const tri = require('../06-triage-meeting-email/triage_email');
const alerts = require('../07-alerts-tracker-refresh/alerts_refresh');

const TZ = { timeZone: 'America/Los_Angeles' };

test('business minutes skip nights and weekends', () => {
  // Fri 16:30 -> Mon 09:30 Pacific = 30 + 30 = 60 business minutes
  assert.strictEqual(bt.businessMinutesBetween('2026-11-20T16:30:00-08:00', '2026-11-23T09:30:00-08:00', TZ), 60);
});

test('business minutes skip holidays', () => {
  const opts = { ...TZ, holidays: ['2026-11-26'] };
  assert.strictEqual(bt.businessMinutesBetween('2026-11-25T16:00:00-08:00', '2026-11-27T10:00:00-08:00', opts), 120);
});

test('DST boundary does not add an hour', () => {
  // Fri before DST end -> Mon after: 1h Fri + 1h Mon
  assert.strictEqual(bt.businessMinutesBetween('2026-10-30T16:00:00-07:00', '2026-11-02T10:00:00-08:00', TZ), 120);
});

test('SLA monitor warns once, then stays silent', async () => {
  const cfg = require('../01-sla-early-warning/config.example.json');
  const tickets = require('../01-sla-early-warning/sample-data/tickets.json');
  const now = new Date('2026-11-24T18:30:00Z');
  const store = new SeenStore(null, { now });
  process.env.DRY_RUN = '1';
  const first = await sla.run({ now, tickets, cfg, store });
  assert.match(first, /first response: \*missed\*/);
  assert.strictEqual(await sla.run({ now, tickets, cfg, store }), null);
});

test('escalation auto-add only for great concern', () => {
  const r = esc.plan(require('../02-escalation-sync/sample-data/requests.json'),
    require('../02-escalation-sync/sample-data/issues.json'), [], new Date('2026-11-24T16:00:00Z'));
  assert.deepStrictEqual(r.map(x => x.action).sort(), ['auto-add-to-priority-table', 'suggest-link']);
});

test('stale nudge flags idle, unassigned and past-due', () => {
  const out = stale.findStale(require('../03-stale-request-nudge/sample-data/tasks.json'), new Date('2026-11-24T17:00:00Z'));
  assert.deepStrictEqual(out.map(x => x.t.id), ['T-3001', 'T-3003', 'T-3002']);
});

test('repeat issues cluster similar requests from different people', () => {
  const c = rep.cluster(require('../04-repeat-issue-detection/sample-data/requests.json'));
  assert.strictEqual(c.length, 1);
  assert.deepStrictEqual(c[0].map(r => r.id).sort(), ['T-4001', 'T-4002']);
});

test('triage: blocker forces Keep, unverified refresh holds', () => {
  assert.strictEqual(tri.decide([{ key: 'X-1', owner: 'a', nextStep: 'b', blocker: true }]).decision, 'Keep');
  assert.strictEqual(tri.decide([], { refreshVerified: false }).decision, 'HOLD');
});

test('triage: cancels only a single organized occurrence', async () => {
  const deleted = [];
  const cal = {
    listEvents: async () => [
      { id: 'a', subject: 'Bug Review', isOrganizer: true, type: 'occurrence' },
      { id: 'b', subject: 'Bug Review', isOrganizer: true, type: 'seriesMaster' },
    ],
    deleteEvent: async id => deleted.push(id),
  };
  const r = await tri.cancelTodayOccurrence(cal, { subject: 'Bug Review' });
  assert.ok(r.cancelled); assert.deepStrictEqual(deleted, ['a']);
});

test('alerts refresh preserves manual fields and needs evidence to resolve', () => {
  const out = alerts.refresh([{ threadId: 'th-1', manual: { contact: 'X' } }],
    require('../07-alerts-tracker-refresh/sample-data/notices.json'),
    require('../07-alerts-tracker-refresh/sample-data/issue-status.json'), new Date('2026-11-24T16:00:00Z'));
  assert.deepStrictEqual(out.rows.find(r => r.threadId === 'th-1').manual, { contact: 'X' });
  assert.strictEqual(out.ongoing.length, 1);
});

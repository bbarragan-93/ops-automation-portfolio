#!/usr/bin/env node
'use strict';
/**
 * Weekly triage meeting: refresh the bug list, decide KEEP or SKIP, and email
 * attendees before the meeting. On SKIP, cancel only TODAY's occurrence.
 *
 * Decision rule:
 *   SKIP when every active item has an owner and next step and nothing needs a
 *        cross-team decision ("just waiting on updates").
 *   KEEP when any item is a blocker, needs a decision, or lacks an owner/next step.
 *   NO EMAIL when the refresh was incomplete; a human is told instead (fail closed).
 */
const path = require('path');
const DAY_MS = 24 * 60 * 60 * 1000;
const { fromFixture } = require('../shared/tracker-client');

const RESOLVED_RETENTION_DAYS = 30;

function lifecycle(items, now) {
  const active = [], recentlyResolved = [], expired = [];
  for (const it of items) {
    if (it.status !== 'Closed') active.push(it);
    else if ((now - new Date(it.resolvedAt)) / DAY_MS <= RESOLVED_RETENTION_DAYS) recentlyResolved.push(it);
    else expired.push(it); // drop from the page after 30 days
  }
  return { active, recentlyResolved, expired };
}

function decide(active, { refreshVerified = true } = {}) {
  if (!refreshVerified) return { decision: 'HOLD', reasons: ['refresh incomplete — no email sent'] };
  const pressing = active.filter(i => i.blocker || i.needsDecision || !i.owner || !i.nextStep);
  return pressing.length
    ? { decision: 'Keep', reasons: pressing.map(i => `${i.key}: ${i.blocker ? 'blocker' : i.needsDecision ? 'needs a decision' : 'no owner/next step'}`), focus: pressing }
    : { decision: 'Skip', reasons: ['owners and next steps are clear; waiting on routine updates'], focus: active };
}

function buildEmail({ decision, reasons, focus }, date, attendees) {
  const subject = `Triage meeting today (${date}): ${decision}`;
  const body = [
    decision === 'Skip' ? 'No need to meet today. Async follow-ups:' : 'Let\'s meet today. To discuss:',
    ...focus.map(i => `- ${i.key} ${i.summary} (${i.status}, ${i.owner || 'no owner'}) ${i.url}`),
    '', `Why: ${reasons.join('; ')}`,
  ].join('\n');
  return { to: attendees, subject, body };
}

/**
 * Calendar safety: cancel exactly one occurrence that WE organize, never the
 * series. `calendar` is any client exposing listEvents/deleteEvent.
 */
async function cancelTodayOccurrence(calendar, { subject, dayStart, dayEnd }) {
  const events = await calendar.listEvents(dayStart, dayEnd);
  const matches = events.filter(e => e.subject === subject && e.isOrganizer && e.type === 'occurrence');
  if (matches.length !== 1) return { cancelled: false, reason: `expected 1 match, found ${matches.length}` };
  await calendar.deleteEvent(matches[0].id);
  return { cancelled: true, id: matches[0].id };
}

if (require.main === module) {
  const now = new Date('2026-11-24T16:00:00Z');
  const { active, recentlyResolved, expired } = lifecycle(fromFixture(path.join(__dirname, 'sample-data/priority-table.json')), now);
  const email = buildEmail(decide(active), '2026-11-24', ['team-list@example.com']);
  console.log(`active=${active.length} resolved=${recentlyResolved.length} removed=${expired.map(i => i.key).join(',') || 'none'}\n`);
  console.log(`Subject: ${email.subject}\n\n${email.body}`);
}

module.exports = { lifecycle, decide, buildEmail, cancelTodayOccurrence };

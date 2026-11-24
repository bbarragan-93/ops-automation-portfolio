#!/usr/bin/env node
'use strict';
/**
 * Weekly stale-request nudge. Read-only: it never edits tasks.
 * Flags open tasks that are (a) idle for N+ business days, (b) unassigned, or
 * (c) past due, and says in a few words what each seems to be waiting on.
 */
const path = require('path');
const { businessDaysBetween } = require('../shared/business-time');
const { fromFixture } = require('../shared/tracker-client');
const { postToSlack } = require('../shared/notify');

const WAITING_HINTS = [
  [/requester|client/i, 'waiting on requester'],
  [/engineering|developer/i, 'waiting on engineering'],
  [/new/i, 'no response yet'],
];

function waitingOn(task) {
  const hit = WAITING_HINTS.find(([re]) => re.test(task.section));
  return hit ? hit[1] : 'in progress, no recent update';
}

function findStale(tasks, now, { idleDays = 5, timeZone = 'America/Los_Angeles', holidays = [] } = {}) {
  const today = now.toISOString().slice(0, 10);
  return tasks.filter(t => !t.completed).map(t => {
    const idle = businessDaysBetween(t.last_activity_at, now, { timeZone, holidays });
    const reasons = [];
    if (idle >= idleDays) reasons.push(`idle ${idle} business days`);
    if (!t.assignee) reasons.push('unassigned');
    if (t.due_on && t.due_on < today) reasons.push(`past due (${t.due_on})`);
    return { t, idle, reasons };
  }).filter(x => x.reasons.length)
    .sort((a, b) => b.idle - a.idle); // oldest first
}

function formatMessage(stale) {
  if (!stale.length) return ':white_check_mark: Stale check: the queue is clean.';
  return ['*Weekly stale-request check*', ...stale.map(({ t, reasons }) =>
    `• <${t.url}|${t.name}> · ${t.section} · ${t.assignee || 'unassigned'} · ${reasons.join(', ')} — ${waitingOn(t)}`)].join('\n');
}

if (require.main === module) {
  const tasks = fromFixture(path.join(__dirname, 'sample-data/tasks.json'));
  postToSlack(formatMessage(findStale(tasks, new Date('2026-11-24T17:00:00Z'))));
}

module.exports = { findStale, formatMessage, waitingOn };

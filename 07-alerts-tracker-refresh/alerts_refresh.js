#!/usr/bin/env node
'use strict';
/**
 * Alerts tracker refresh: chat-channel notices -> tracker table rows.
 *
 * - New notices become rows (brief, thread link, linked issue).
 * - Existing rows only get their GENERATED fields updated; manual columns are
 *   merged back untouched.
 * - Resolution needs evidence: the linked issue is Closed, or (no issue) the
 *   thread has an explicit all-clear. Age alone never resolves an alert.
 * - Shows a rolling 30-day window, but history is never deleted.
 */
const path = require('path');
const DAY_MS = 24 * 60 * 60 * 1000;
const { fromFixture } = require('../shared/tracker-client');

const ALL_CLEAR = /\b(all clear|resolved|recovered|fixed|back to normal)\b/i;
const brief = t => t.replace(/^heads up:\s*/i, '').slice(0, 80);

function resolution(notice, issueStatus) {
  if (notice.issueKey) {
    return issueStatus[notice.issueKey] === 'Closed'
      ? { resolved: true, evidence: `${notice.issueKey} closed` } : { resolved: false };
  }
  const clear = notice.replies.find(r => ALL_CLEAR.test(r.text));
  return clear ? { resolved: true, evidence: `all-clear in thread ${clear.at.slice(0, 10)}` } : { resolved: false };
}

function refresh(existingRows, notices, issueStatus, now) {
  const byId = Object.fromEntries(existingRows.map(r => [r.threadId, r]));
  for (const n of notices) {
    const generated = {
      threadId: n.threadId, brief: brief(n.text), threadUrl: n.threadUrl, issueKey: n.issueKey,
      issueStatus: n.issueKey ? issueStatus[n.issueKey] || 'unknown' : 'n/a',
      ...resolution(n, issueStatus), postedAt: n.postedAt, refreshedAt: now.toISOString(),
    };
    const manual = byId[n.threadId]?.manual || {}; // e.g. contacts, notes typed by humans
    byId[n.threadId] = { ...generated, manual };
  }
  const rows = Object.values(byId);
  const inWindow = r => (now - new Date(r.postedAt)) / DAY_MS <= 30;
  return {
    rows,                                             // full history kept
    ongoing: rows.filter(r => inWindow(r) && !r.resolved),
    recentlyResolved: rows.filter(r => inWindow(r) && r.resolved),
  };
}

if (require.main === module) {
  const now = new Date('2026-11-24T16:00:00Z');
  const existing = [{ threadId: 'th-1', manual: { contact: 'Engineer A' } }];
  const out = refresh(existing, fromFixture(path.join(__dirname, 'sample-data/notices.json')),
    fromFixture(path.join(__dirname, 'sample-data/issue-status.json')), now);
  console.log(`Ongoing ${out.ongoing.length}, recently resolved ${out.recentlyResolved.length}`);
  for (const r of out.rows) console.log(`- ${r.brief} | ${r.resolved ? 'resolved: ' + r.evidence : 'ongoing'} | manual=${JSON.stringify(r.manual)}`);
}

module.exports = { refresh, resolution };

#!/usr/bin/env node
'use strict';
/**
 * Weekly escalation sync: work tracker (support requests) -> issue tracker (engineering bugs).
 *
 * 1. Group recent requests by feature/symptom.
 * 2. Match each group to an existing engineering issue (label or keyword overlap).
 * 3. Recommend: link to existing issue / open a new issue / add to the priority table.
 * 4. Auto-add to the priority table ONLY when a strict "great concern" rule is met;
 *    everything else stays a suggestion for a human.
 */
const path = require('path');
const DAY_MS = 24 * 60 * 60 * 1000;
const { fromFixture } = require('../shared/tracker-client');
const { postToSlack } = require('../shared/notify');

const words = s => new Set(String(s).toLowerCase().match(/[a-z]{3,}/g) || []);
const overlap = (a, b) => { const A = words(a), B = words(b); let n = 0; A.forEach(w => B.has(w) && n++); return n / Math.max(1, Math.min(A.size, B.size)); };

function findIssue(group, issues) {
  return issues
    .map(i => ({ i, score: (i.labels.includes(group.feature) ? 0.6 : 0) + 0.4 * overlap(group.symptom, i.summary) }))
    .filter(x => x.score >= 0.5)
    .sort((a, b) => b.score - a.score)[0]?.i || null;
}

/** The auto-add gate. Any one condition is enough; otherwise suggestion only. */
function isGreatConcern(group, issue, now) {
  const clients = new Set(group.requests.map(r => r.client));
  const confirmed = group.requests.some(r => r.confirmed);
  const highPriority = issue && ['High', 'Highest'].includes(issue.priority);
  const staleDays = issue ? (now - new Date(issue.updated)) / DAY_MS : 0;
  return (confirmed && clients.size >= 2) || highPriority || (confirmed && staleDays >= 14);
}

function plan(requests, issues, priorityTable, now = new Date()) {
  const groups = {};
  for (const r of requests.filter(r => !r.completed)) {
    const key = `${r.feature}|${r.symptom}`;
    (groups[key] ||= { feature: r.feature, symptom: r.symptom, requests: [] }).requests.push(r);
  }
  return Object.values(groups).map(g => {
    const issue = findIssue(g, issues);
    let action;
    if (!issue) action = g.requests.length > 1 || g.requests.some(r => r.confirmed) ? 'suggest-new-issue' : 'watch';
    else if (priorityTable.includes(issue.key)) action = 'already-tracked';
    else if (isGreatConcern(g, issue, now)) action = 'auto-add-to-priority-table';
    else action = 'suggest-link';
    return { ...g, issue, action };
  });
}

function formatMessage(results) {
  const lines = results.filter(r => r.action !== 'watch').map(r => {
    const links = r.requests.map(q => `<${q.url}|${q.id}>`).join(', ');
    const status = r.requests.some(q => q.confirmed) ? 'confirmed' : 'reported, not yet confirmed';
    switch (r.action) {
      case 'auto-add-to-priority-table': return `• *Added* ${r.issue.key} to priority table — ${r.symptom} (${status}; ${links})`;
      case 'suggest-link':               return `• Suggest linking ${links} → ${r.issue.key} (${status})`;
      case 'suggest-new-issue':          return `• Suggest a new engineering issue: "${r.symptom}" (${status}; ${links})`;
      default:                           return `• ${r.issue.key} already on the priority table (${links})`;
    }
  });
  return lines.length ? ['*Weekly escalation check*', ...lines].join('\n') : 'Weekly escalation check: nothing needs escalating.';
}

if (require.main === module) {
  const requests = fromFixture(path.join(__dirname, 'sample-data/requests.json'));
  const issues = fromFixture(path.join(__dirname, 'sample-data/issues.json'));
  const results = plan(requests, issues, [], new Date('2026-11-24T16:00:00Z'));
  postToSlack(formatMessage(results));
}

module.exports = { plan, formatMessage, isGreatConcern, findIssue };

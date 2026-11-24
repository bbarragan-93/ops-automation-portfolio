#!/usr/bin/env node
'use strict';
/**
 * SLA early-warning monitor.
 *
 * Runs every 30 minutes in business hours. For each open ticket it computes
 * business minutes since creation and warns BEFORE a target is missed:
 *   - first response from the support team (e.g. 60 business min, warn at 40)
 *   - moved out of the untriaged section   (e.g. 120 business min, warn at 90)
 * Each ticket/target pair is warned about once (dedupe store), and the job is
 * silent when there is nothing new.
 *
 *   node sla_monitor.js --now 2026-11-24T18:30:00Z   # uses sample data, dry run
 */
const path = require('path');
const { businessMinutesBetween, isWithinBusinessHours, civilDate, dateKey } = require('../shared/business-time');
const { SeenStore } = require('../shared/seen-store');
const { postToSlack, mention } = require('../shared/notify');
const { fromFixture } = require('../shared/tracker-client');

function firstTeamReply(ticket, team) {
  const replies = (ticket.comments || [])
    .filter(c => team.includes(c.author))
    .map(c => new Date(c.created_at))
    .sort((a, b) => a - b);
  return replies[0] || null;
}

/** Pure function: returns the list of at-risk / missed findings. */
function evaluate(tickets, cfg, now) {
  const bh = { timeZone: cfg.timeZone, holidays: cfg.holidays, ...cfg.businessHours };
  const findings = [];
  for (const t of tickets.filter(t => !t.completed)) {
    const elapsed = businessMinutesBetween(t.created_at, now, bh);

    const fr = cfg.targets.firstResponse;
    if (!firstTeamReply(t, cfg.supportTeam) && elapsed >= fr.warnAtMinutes) {
      findings.push({ ticket: t, target: 'first response', left: fr.limitMinutes - elapsed });
    }
    const tr = cfg.targets.triaged;
    if (t.section === tr.untriagedSection && elapsed >= tr.warnAtMinutes) {
      findings.push({ ticket: t, target: 'triaged', left: tr.limitMinutes - elapsed });
    }
  }
  return findings;
}

function formatMessage(findings, cfg) {
  const lines = findings.map(({ ticket: t, target, left }) => {
    const who = cfg.supportTeam.includes(t.assignee)
      ? mention(t.assignee, cfg.slackDirectory)
      : (t.assignee || 'unassigned');
    const status = left > 0 ? `${left} business min left` : '*missed*';
    return `• <${t.url}|${t.name}> (req: ${t.requester}, owner: ${who}) — ${target}: ${status}`;
  });
  return [':hourglass: *SLA early warning*', ...lines].join('\n');
}

async function run({ now = new Date(), tickets, cfg, store }) {
  const bh = { timeZone: cfg.timeZone, holidays: cfg.holidays, ...cfg.businessHours };
  if (cfg.holidays.includes(dateKey(civilDate(now, cfg.timeZone)))) return null; // holiday: silent
  if (!isWithinBusinessHours(now, bh)) return null;

  const fresh = evaluate(tickets, cfg, now).filter(f => {
    const key = `${f.ticket.id}:${f.target}:${f.left > 0 ? 'warn' : 'missed'}`;
    if (store.has(key)) return false;
    store.mark(key);
    return true;
  });
  if (!fresh.length) return null; // nothing new: stay silent
  const text = formatMessage(fresh, cfg);
  await postToSlack(text);
  store.save();
  return text;
}

if (require.main === module) {
  const arg = process.argv.indexOf('--now');
  const now = arg > -1 ? new Date(process.argv[arg + 1]) : new Date();
  const cfg = fromFixture(path.join(__dirname, 'config.example.json'));
  const tickets = fromFixture(path.join(__dirname, 'sample-data/tickets.json'));
  const store = new SeenStore(null, { ttlDays: cfg.seenTtlDays, now }); // in-memory for demo
  run({ now, tickets, cfg, store }).then(out => { if (!out) console.log('(nothing new — silent)'); });
}

module.exports = { evaluate, formatMessage, run, firstTeamReply };

# 01 · SLA early-warning monitor

**Problem:** SLA misses on the support queue only showed up in the weekly KPI
report — after the fact. The team needed a heads-up while there was still time
to act.

**What it does**
- Runs every 30 minutes during business hours (cron `0,30 9-16 * * 1-5`).
- Computes *business minutes* since each open ticket was created (weekends,
  holidays and off-hours excluded; DST-safe).
- Flags two targets before they are missed: **first response** and **moved out
  of the untriaged section**. Already-missed, never-flagged tickets are marked
  *missed*.
- @-mentions the assignee only when they are on the support team and their chat
  ID is known with confidence; otherwise prints the name in plain text.
- Dedupes with a 14-day "seen" store, so every ticket/target is warned about
  once and the job is **silent when nothing is new**.

**Files**
| File | Purpose |
|---|---|
| `sla_monitor.js` | Evaluate → dedupe → format → post |
| `config.example.json` | Placeholder config (project ID, channel, targets) |
| `sample-data/tickets.json` | Fictional tickets |

```bash
node 01-sla-early-warning/sla_monitor.js --now 2026-11-24T18:30:00Z
```

**Design notes:** the evaluation is a pure function (`evaluate`) so it is unit
tested without network calls; delivery is a dry run unless `DRY_RUN=0` and a
webhook is configured.

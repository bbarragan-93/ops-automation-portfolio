# 02 · Weekly escalation sync (work tracker → issue tracker)

**Problem:** support requests that were really product bugs sat in the support
queue without an engineering ticket, or the engineering ticket existed but no
one linked it, so the weekly bug review missed it.

**What it does** (runs Tuesday morning, right before the triage meeting email)
1. Pulls requests created/updated in the last 7 days plus older open ones.
2. Groups them by feature and symptom (same error, different wording).
3. Searches the issue tracker for an existing matching issue (label + keyword score).
4. Recommends one of: **link to existing issue**, **open a new issue**, or
   **add to the priority table**.
5. Auto-adds to the priority table only when a strict rule is met — confirmed
   and affecting 2+ clients, High/Highest priority, or confirmed and stalled
   14+ days. Everything else stays a suggestion. It never creates engineering
   tickets itself.

It keeps *reported* symptoms separate from *confirmed* findings, so the team
doesn't overstate an issue.

```bash
node 02-escalation-sync/escalation_sync.js
```

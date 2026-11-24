# 03 · Stale-request nudges

**Problem:** requests quietly stalled — waiting on a requester who never
replied, sitting unassigned, or past their due date.

**What it does** (weekly, read-only)
- Flags open tasks idle for **5+ business days**, **unassigned** tasks, and
  **past-due** tasks.
- Infers what each is waiting on from its board section (requester,
  engineering, no first response yet).
- Sorts oldest-first and posts one short digest; if nothing is stale, it posts
  a single "queue is clean" line.

```bash
node 03-stale-request-nudge/stale_nudge.js
```

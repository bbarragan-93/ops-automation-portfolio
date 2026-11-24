# 07 · Alerts tracker refresh

**Problem:** operational notices were posted in a chat channel and scrolled
away. Nobody could answer "what's still broken right now?"

**What it does** (weekly; an AI-agent routine in production)
- Reads new notices and thread replies since the last run.
- Upserts one row per notice: a short brief, a direct thread link, the linked
  engineering issue and its live status.
- **Never overwrites human input:** manual columns (contacts, notes) are merged
  back as-is.
- **Evidence-based resolution:** an alert is resolved only if its issue is
  Closed or the thread has an explicit all-clear. Age alone never resolves it.
- Keeps the full history, and the views show a rolling 30-day window.
- A companion "known fixes" page is generated from recurring, confirmed fixes
  (symptom → how to recognize it → workaround → who to contact). It never
  invents a fix.

```bash
node 07-alerts-tracker-refresh/alerts_refresh.js
```

# Routine template (generic)

```text
Schedule: <cron, time zone>

Goal: <one sentence on the outcome and who it helps>.

Scope: read-only in <work tracker project YOUR_PROJECT_ID>. You may only
<exact allowed write, if any>. Never <explicit prohibitions>.

Find: <selection criteria with numeric thresholds, e.g. 40+ business minutes
since creation with no reply from the support team>.

Avoid repeats: keep a record at <state path>/<routine>-seen.json of items
already reported; prune entries older than <N> days; re-report only when
<meaningful change>.

For each item give: <linked title>, <owner or "unassigned">, <what's at risk>,
<a few words of reasoning>. Separate reported symptoms from confirmed findings.

Delivery: post one concise message to #your-channel as the bot account. If
nothing is new, post nothing. If a connector fails or a write can't be
verified, post nothing and tell the owner exactly what needs reconnecting.
```

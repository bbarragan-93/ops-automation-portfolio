# 05 · KPI dashboard + weekly KPI email (Google Apps Script)

**Problem:** leadership wanted a weekly read on the support queue (volume,
speed, SLA attainment, quality of intake), and the team wanted a live
dashboard, without paying for a BI tool.

**What it does**
- `Tracker.gs` pulls tasks from a work-tracker REST API with pagination and
  429 backoff (`UrlFetchApp`).
- `BusinessTime.gs` counts SLA time in **business hours** only, skipping
  weekends and holidays (DST-safe).
- `Kpi.gs` is the pure KPI math: new/closed/open, median first response and
  resolution, first-response SLA rate, intake completeness, repeat and
  escalation rates, backlog aging buckets, top request types and automation
  candidates.
- `Email.gs` renders an inline-styled HTML email plus a plain-text fallback,
  sends it with `MailApp`, and installs an **idempotent** Monday trigger. It
  also has a log-only preview function.
- `Dashboard.gs` + `Index.html` make up a web-app dashboard with a viewer
  allow-list, `CacheService` caching and a client-side window filter.

**Setup:** create a script project, copy these files in, set the Script
Properties listed in `Config.gs`, run `previewWeeklyKpiEmail`, then
`installMondayTrigger`. No secrets or IDs live in code.

**Testing:** `tests/kpi.test.js` loads `BusinessTime.gs` and `Kpi.gs` into a
Node VM with a stubbed `Utilities`, so the math is unit tested outside Google.

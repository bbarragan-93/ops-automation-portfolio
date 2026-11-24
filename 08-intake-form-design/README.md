# 08 · Intake form design

**Problem:** free-form requests arrived missing the account, the time window
or any evidence, so the first reply was always a question, and none of it
could be reported on.

**Design** (`form-schema.example.json`)
- **Requester fields** are only what a first responder needs to act. Each
  required field either routes the ticket or feeds a KPI.
- **Dropdowns where reporting depends on the value** (request type, priority,
  client). "Other" free text is reviewed monthly by a routine that proposes new
  list entries ranked by count.
- **Closeout fields** are filled by the support team when closing: intake
  complete on arrival, repeat issue, escalated, training and automation
  opportunity. These feed the KPI email in `05-kpi-dashboard-apps-script`.
- **Board sections** double as a state machine (New → In Progress → Waiting on
  Requester / Engineering → Done), which the SLA monitor (01) and stale
  nudges (03) read.
- **Deliberately simple:** optional dimensions (e.g. tiering) are held back
  until the data shows they'd change a decision.

The companion requester guide and agent training guide (not included) followed
the same structure: what to send, what happens next, and response-time
expectations.

# 06 · Weekly triage meeting email (keep / skip)

**Problem:** a standing weekly bug-review meeting often had nothing to decide,
but the only way to know was to show up.

**What it does** (weekly, about an hour before the meeting)
1. **Refresh** the priority bug table from the issue tracker. Only generated
   fields (status snapshot, next step) are filled; human-entered columns are
   never touched.
2. **Lifecycle:** closed items move to *Recently resolved* and are removed after
   30 days; reopened items return to active review.
3. **Decide:** *Skip* when every item has an owner and a next step and nothing
   needs a decision. *Keep* when there's a blocker, a pending decision, or an
   orphaned item.
4. **Email** attendees a two-line "do we need this meeting" note with links. It
   checks Sent Items first, so it never sends twice for the same date.
5. **On Skip:** cancel **only today's occurrence**. It must match the subject,
   be organized by us, and be of type `occurrence`, with exactly one match.
   It never touches the series.
6. **Fail closed:** if the refresh couldn't be verified, it sends no email,
   cancels nothing, and alerts a human.

```bash
node 06-triage-meeting-email/triage_email.js
```

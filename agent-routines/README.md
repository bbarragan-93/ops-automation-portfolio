# AI-agent routine patterns

Several of these workflows ran in production as **scheduled AI-agent
routines**: a cron schedule plus a natural-language prompt, with connectors to
the work tracker, issue tracker, chat, email and calendar. The JavaScript in
each folder is a deterministic reference version of the same logic.

These are the patterns that made agent routines safe to run unattended:

| Pattern | Why |
|---|---|
| **Read-only by default** | Each routine says exactly what it may change. Everything else is look-only. |
| **Explicit write scope** | e.g. "may add a row with only the ticket column filled; never edit other rows, schema, views or permissions." |
| **Silent when nothing is new** | No "all quiet" noise for high-frequency monitors. Weekly digests post one line instead. |
| **Dedupe store with TTL** | A JSON "seen" file keyed by item + target, pruned after 14–30 days. |
| **Reported vs. confirmed** | Messages separate symptoms someone reported from findings someone validated. |
| **Fail closed** | If a refresh can't be verified, send nothing and cancel nothing, and tell the owner what to reconnect. |
| **Bot identity for posts** | Automated posts come from a bot account, never a person's account. |
| **Verify after write** | Re-read every write (row added, email in Sent Items, event cancelled) before reporting success. |
| **Single-occurrence calendar ops** | Match subject + organizer + `occurrence` type, require exactly one match, and never touch the series. |

## Template

See [`routine-template.md`](routine-template.md) for a sanitized, generic
prompt skeleton.

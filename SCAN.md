# Pre-publish leak scan

Scanned on 2026-11-24, over every tracked file (and the full git history for
gitleaks). The term lists are kept **outside** this repo on purpose, so the
scan doesn't publish the very names it checks for.

| Check | Method | Result |
|---|---|---|
| Secrets (API keys, tokens, private keys) | gitleaks v8.21.2, `dir` + `git` modes | **No leaks found** |
| Secret-like patterns (PAT prefixes, chat bot tokens, cloud keys, PEM headers) | regex | 0 hits |
| Former employer, product and internal tool names | case-insensitive grep | 0 hits |
| Internal team acronyms | case-insensitive, word-bounded grep | 0 hits |
| Employee names | case-insensitive grep | 0 hits |
| Client, partner and vendor names seen in the source material | case-insensitive grep | 0 hits |
| Ticket keys from the original issue tracker | regex | 0 hits |
| Real project / workspace IDs | exact match | 0 hits |
| Chat user/channel IDs | regex `\b[CUW]0[A-Z0-9]{6,}\b` | 0 hits |
| Long digit strings (8+ digits) | regex | 0 hits |
| Email addresses other than `@example.com` | regex | 0 hits |
| URLs/domains other than `*.example.com` and Google OAuth scope URLs | regex | 0 hits |
| Internal page, document, field and script names | case-insensitive grep | 0 hits |

## Fixes made during the scan

- Replaced the literal millisecond-per-day constant with `24 * 60 * 60 * 1000`
  (it tripped the long-digit check).
- Renamed intake and closeout field labels, the alerts channel label and the
  "known fixes" page so they no longer echo the original wording.
- Removed time-of-day "AM/PM" wording and an `eng` regex token that collided
  with the team-acronym check.

## Data used

All people (`Agent A`, `Requester One`, `Engineer B`), companies
(`Sample Brand Co`, `Example Exchange`), ticket keys (`PROJ-101`, `T-1001`),
URLs (`*.example.com`) and dates are fictional. Configuration uses placeholders
(`YOUR_PROJECT_ID`, `#your-channel`, `UXXXXXXXX1`).

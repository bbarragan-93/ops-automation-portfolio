# 04 · Repeat-issue detection

**Problem:** the same outage arrived as five differently worded requests from
five people. Each got answered separately, and the incident alert went out late.

**What it does** (read-only; runs on recent requests)
- Normalizes request text (stop words, simple synonyms) and scores pairwise
  similarity: token Jaccard plus a bonus for the same partner or feature.
- Clusters with union-find. A cluster counts at **2+ distinct requesters** or
  **3+ requests**.
- Dedupes with a seen store and re-flags only when new requests join a known
  cluster.
- Outputs the shared symptom, the linked requests, and a **ready-to-paste,
  plain-language incident alert draft**. A human decides whether to publish it.

```bash
node 04-repeat-issue-detection/repeat_issues.js
```

In production the same flow ran as an AI-agent routine, where the model does
the "same problem in different words" judgment. This file is a deterministic
baseline that shows the logic and is easy to test.

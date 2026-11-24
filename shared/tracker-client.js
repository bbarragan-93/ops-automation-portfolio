'use strict';
/**
 * Minimal REST clients for an Asana-style work tracker and a Jira-style issue
 * tracker. Both are thin wrappers around fetch with bearer auth, pagination
 * and retry on 429. In the examples, a local fixture file can be swapped in
 * with `fromFixture()` so nothing calls a real API.
 */
const fs = require('fs');

async function requestJson(url, { token, method = 'GET', body, retries = 3 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && attempt < retries) {
      const wait = Number(res.headers.get('retry-after') || 2) * 1000;
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}`);
    return res.json();
  }
}

class WorkTrackerClient {
  constructor({ baseUrl = process.env.WORK_TRACKER_BASE_URL, token = process.env.WORK_TRACKER_TOKEN } = {}) {
    this.baseUrl = baseUrl; this.token = token;
  }
  /** All tasks in a project, following `next_page` cursors. */
  async listTasks(projectId, fields) {
    const out = [];
    let url = `${this.baseUrl}/projects/${projectId}/tasks?limit=100&opt_fields=${fields.join(',')}`;
    while (url) {
      const page = await requestJson(url, { token: this.token });
      out.push(...page.data);
      url = page.next_page ? page.next_page.uri : null;
    }
    return out;
  }
}

class IssueTrackerClient {
  constructor({ baseUrl = process.env.ISSUE_TRACKER_BASE_URL, token = process.env.ISSUE_TRACKER_TOKEN } = {}) {
    this.baseUrl = baseUrl; this.token = token;
  }
  async search(jql, fields = ['summary', 'status', 'priority', 'updated']) {
    const url = `${this.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${fields.join(',')}`;
    return (await requestJson(url, { token: this.token })).issues;
  }
}

/** Load fictional sample data instead of calling a live API. */
function fromFixture(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

module.exports = { requestJson, WorkTrackerClient, IssueTrackerClient, fromFixture };

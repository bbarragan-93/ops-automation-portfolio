'use strict';
/**
 * Tiny JSON "already alerted" store so scheduled jobs warn once per item and
 * stay silent on repeat runs. Entries older than `ttlDays` are pruned.
 */
const fs = require('fs');
const DAY_MS = 24 * 60 * 60 * 1000;

class SeenStore {
  constructor(path, { ttlDays = 14, now = new Date() } = {}) {
    this.path = path;
    this.ttlMs = ttlDays * DAY_MS;
    this.now = new Date(now);
    this.entries = {};
    if (path && fs.existsSync(path)) {
      this.entries = JSON.parse(fs.readFileSync(path, 'utf8'));
    }
    this.prune();
  }
  prune() {
    for (const [k, v] of Object.entries(this.entries)) {
      if (this.now - new Date(v.at) > this.ttlMs) delete this.entries[k];
    }
  }
  has(key) { return Boolean(this.entries[key]); }
  get(key) { return this.entries[key]; }
  mark(key, extra = {}) { this.entries[key] = { at: this.now.toISOString(), ...extra }; }
  save() {
    if (this.path) fs.writeFileSync(this.path, JSON.stringify(this.entries, null, 2) + '\n');
  }
}

module.exports = { SeenStore };

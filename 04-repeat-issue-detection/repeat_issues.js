#!/usr/bin/env node
'use strict';
/**
 * Repeat-issue detection: spot when several requests are really one problem,
 * so the team can publish an incident alert early instead of answering N times.
 *
 * Similarity = Jaccard over normalized tokens (with a light synonym map) plus a
 * bonus for sharing the same partner/feature. Clusters are built with
 * union-find. A cluster counts when it has 2+ distinct requesters or 3+ items.
 */
const path = require('path');
const { fromFixture } = require('../shared/tracker-client');
const { SeenStore } = require('../shared/seen-store');
const { postToSlack } = require('../shared/notify');

const STOP = new Set('the a an for our and with since from our is are was to of in on by no not any'.split(' '));
const SYNONYMS = { conversions: 'conversion', events: 'event', stopped: 'drop', dropped: 'drop', reporting: 'report', zero: 'drop' };

function tokens(text) {
  return new Set((text.toLowerCase().match(/[a-z]+/g) || [])
    .filter(w => !STOP.has(w) && w.length > 2)
    .map(w => SYNONYMS[w] || w));
}

function similarity(a, b) {
  const A = tokens(`${a.title} ${a.body}`), B = tokens(`${b.title} ${b.body}`);
  let inter = 0; A.forEach(w => B.has(w) && inter++);
  const jaccard = inter / (A.size + B.size - inter || 1);
  const samePartner = a.partner && a.partner === b.partner ? 0.2 : 0;
  return jaccard + samePartner;
}

function cluster(requests, threshold = 0.35) {
  const parent = requests.map((_, i) => i);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < requests.length; i++)
    for (let j = i + 1; j < requests.length; j++)
      if (similarity(requests[i], requests[j]) >= threshold) parent[find(i)] = find(j);
  const groups = {};
  requests.forEach((r, i) => (groups[find(i)] ||= []).push(r));
  return Object.values(groups).filter(g =>
    new Set(g.map(r => r.requester)).size >= 2 || g.length >= 3);
}

/** Re-flag a cluster only when new requests have joined it. */
function newClusters(clusters, store) {
  return clusters.filter(g => {
    const ids = g.map(r => r.id).sort();
    const key = ids[0];
    const prev = store.get(key);
    if (prev && ids.every(id => prev.ids.includes(id))) return false;
    store.mark(key, { ids });
    return true;
  });
}

function formatMessage(clusters) {
  return clusters.map(g => {
    const shared = [...tokens(g[0].title)].filter(w => g.every(r => tokens(`${r.title} ${r.body}`).has(w)));
    return [`*Possible repeat issue:* ${shared.join(' / ') || g[0].title} (${g.length} requests, reported — not yet confirmed)`,
      ...g.map(r => `  • <${r.url}|${r.id}> from ${r.requester}`),
      `  _Draft incident alert:_ "We're seeing reports of ${g[0].title.toLowerCase()}. The team is looking into it; no action needed yet."`].join('\n');
  }).join('\n\n');
}

if (require.main === module) {
  const reqs = fromFixture(path.join(__dirname, 'sample-data/requests.json'));
  const fresh = newClusters(cluster(reqs), new SeenStore(null));
  if (fresh.length) postToSlack(formatMessage(fresh)); else console.log('(nothing new — silent)');
}

module.exports = { tokens, similarity, cluster, newClusters, formatMessage };

'use strict';
/**
 * Delivery helpers. Every job builds a plain message string first, then hands
 * it to one of these. DRY_RUN=1 (the default) prints instead of posting, so the
 * examples are safe to run anywhere.
 */

async function postToSlack(text, { webhookUrl = process.env.SLACK_WEBHOOK_URL, dryRun } = {}) {
  dryRun = dryRun ?? process.env.DRY_RUN !== '0';
  if (dryRun || !webhookUrl) {
    console.log('--- [dry run] Slack message ---\n' + text + '\n-------------------------------');
    return { dryRun: true };
  }
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Slack webhook failed: ${res.status}`);
  return { dryRun: false };
}

/** Slack mention only when we are confident of the ID; plain name otherwise. */
function mention(person, directory = {}) {
  if (!person) return 'unassigned';
  const id = directory[person];
  return id ? `<@${id}>` : person;
}

module.exports = { postToSlack, mention };

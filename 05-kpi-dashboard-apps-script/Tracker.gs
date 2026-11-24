/** Work-tracker REST access with pagination and simple 429 backoff. */
function fetchJson_(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + prop_('TRACKER_TOKEN', true) },
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    if (code === 429) { Utilities.sleep(2000 * (attempt + 1)); continue; }
    if (code >= 300) throw new Error('Tracker API ' + code + ': ' + res.getContentText().slice(0, 200));
    return JSON.parse(res.getContentText());
  }
  throw new Error('Tracker API rate-limited after retries');
}

function fetchTasks_(sinceDate) {
  const fields = 'name,created_at,completed,completed_at,memberships.section.name,custom_fields.name,custom_fields.display_value';
  let url = prop_('TRACKER_BASE_URL', true) + '/projects/' + prop_('PROJECT_ID', true) +
    '/tasks?limit=100&completed_since=' + sinceDate.toISOString() + '&opt_fields=' + fields;
  const tasks = [];
  while (url) {
    const page = fetchJson_(url);
    tasks.push.apply(tasks, page.data);
    url = page.next_page ? page.next_page.uri : null;
  }
  return tasks;
}

/** First non-empty display value across a list of field-name aliases. */
function fieldValue_(task, aliases) {
  const hit = (task.custom_fields || []).find(function (f) {
    return aliases.indexOf(f.name) > -1 && f.display_value;
  });
  return hit ? String(hit.display_value).trim() : '';
}

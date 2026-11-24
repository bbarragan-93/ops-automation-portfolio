/** Web-app dashboard (Deploy → Web app). Only allow-listed viewers can load data. */
function doGet() {
  requireViewer_();
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Support KPI Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Called from the page via google.script.run. Results are cached for 10 min. */
function getDashboardSnapshot(filters) {
  requireViewer_();
  const days = Math.min(Math.max(Number((filters || {}).days) || 30, 7), 180);
  const cache = CacheService.getScriptCache();
  const key = 'snapshot:' + days;
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const now = new Date();
  const s = calculateSnapshot_(fetchTasks_(new Date(now.getTime() - days * DAY_MS)), now);
  const dto = JSON.parse(JSON.stringify(s)); // serializable for the client
  cache.put(key, JSON.stringify(dto), 600);
  return dto;
}

function requireViewer_() {
  const allowed = (prop_('DASHBOARD_VIEWERS') || '').split(',').map(function (s) { return s.trim().toLowerCase(); });
  const me = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!me || allowed.indexOf(me) === -1) throw new Error('Not authorized to view this dashboard.');
}

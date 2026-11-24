'use strict';
// Loads the Apps Script files into a VM with a minimal Utilities stub.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadGas() {
  const Utilities = {
    formatDate(d, tz, pattern) {
      if (pattern === 'yyyy-MM-dd') return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
      if (pattern === 'Z') {
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23',
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
          .formatToParts(d).map(x => [x.type, x.value]));
        const off = Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - d.getTime()) / 60000);
        const a = Math.abs(off);
        return (off < 0 ? '-' : '+') + String(Math.floor(a / 60)).padStart(2, '0') + String(a % 60).padStart(2, '0');
      }
      throw new Error('unsupported pattern ' + pattern);
    },
  };
  const ctx = vm.createContext({ Utilities, PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) } });
  const dir = path.join(__dirname, '../05-kpi-dashboard-apps-script');
  // `const` at script top level isn't exposed on the context, so append an export line.
  const src = ['Config.gs', 'Tracker.gs', 'BusinessTime.gs', 'Kpi.gs', 'Email.gs']
    .map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  vm.runInContext(src + '\nthis.KPI_CONFIG = KPI_CONFIG; this.renderPlainText_ = renderPlainText_;', ctx);
  return ctx;
}

test('Apps Script business hours', () => {
  const g = loadGas();
  assert.strictEqual(g.businessHoursBetween_('2026-11-20T16:00:00-08:00', '2026-11-23T10:00:00-08:00'), 2);
});

test('Apps Script KPI snapshot', () => {
  const g = loadGas();
  const cf = (name, v) => ({ name, display_value: v });
  const tasks = [
    { created_at: '2026-11-23T09:00:00-08:00', completed: true, completed_at: '2026-11-23T13:00:00-08:00',
      custom_fields: [cf('Request Type', 'Reporting & Measurement'), cf('First Response At', '2026-11-23T09:30:00-08:00'),
        cf('Complete at Submission?', 'Yes'), cf('Repeat Issue?', 'No')] },
    { created_at: '2026-11-23T10:00:00-08:00', completed: false,
      custom_fields: [cf('Request Type', 'Reporting & Measurement'), cf('First Response At', '2026-11-23T12:00:00-08:00'),
        cf('Complete at Submission?', 'No')] },
  ];
  const s = g.calculateSnapshot_(tasks, new Date('2026-11-24T10:00:00-08:00'));
  assert.strictEqual(s.created7, 2);
  assert.strictEqual(s.firstResponseSlaRate, 0.5);
  assert.strictEqual(s.medianResolutionHours, 4);
  assert.strictEqual(s.intakeCompleteRate, 0.5);
  assert.deepStrictEqual(Array.from(s.topRequestTypes[0]), ['Reporting & Measurement', 2]);
  assert.match(g.renderPlainText_(s), /First-response SLA met: 50%/);
});

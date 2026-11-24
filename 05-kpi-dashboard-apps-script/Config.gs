/**
 * All environment-specific values live in Script Properties (Project Settings →
 * Script properties), never in code:
 *   TRACKER_TOKEN      personal access token for the work-tracker API
 *   TRACKER_BASE_URL   e.g. https://tracker.example.com/api/1.0
 *   PROJECT_ID         YOUR_PROJECT_ID
 *   KPI_RECIPIENTS     comma-separated list, e.g. ops-leads@example.com
 *   DASHBOARD_VIEWERS  comma-separated allow-list for the web app
 */
const DAY_MS = 24 * 60 * 60 * 1000;

const KPI_CONFIG = {
  TIME_ZONE: 'America/Los_Angeles',
  BUSINESS_DAY_START_HOUR: 9,
  BUSINESS_DAY_END_HOUR: 17,
  FIRST_RESPONSE_SLA_HOURS: 1,
  TRIAGE_SLA_HOURS: 2,
  HOLIDAYS: ['2026-11-26', '2026-12-25', '2027-01-01'], // placeholder dates
  // Custom-field names on the intake form (see 08-intake-form-design).
  FIELDS: {
    REQUEST_TYPE: ['Request Type'],
    FIRST_RESPONSE_AT: ['First Response At'],
    INTAKE_COMPLETE: ['Complete at Submission?'],
    REPEAT: ['Repeat Issue?'],
    ESCALATED: ['Escalated to Engineering?'],
    AUTOMATION: ['Automation Idea'],
  },
};

function prop_(name, required) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (required && !value) throw new Error('Missing script property: ' + name);
  return value;
}

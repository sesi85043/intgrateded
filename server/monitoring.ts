/**
 * Simple in-memory monitoring helpers used for tests and basic alerts.
 * For production, wire this to Prometheus, Datadog, etc.
 */

type Counters = Record<string, number>;

const counters: Counters = {};

export function incrementCounter(name: string, by = 1): number {
  counters[name] = (counters[name] || 0) + by;
  return counters[name];
}

export function getCounter(name: string): number {
  return counters[name] || 0;
}

export function resetCounters(): void {
  Object.keys(counters).forEach(k => delete counters[k]);
}

// Convenience specific to cPanel
export function incrementCpanelFailure(): number {
  const count = incrementCounter('cpanel.failures');
  const threshold = Number(process.env.CPANEL_FAILURE_THRESHOLD || '5');
  if (count >= threshold) {
    console.warn(`[monitoring] cPanel failure threshold reached: ${count} failures (threshold ${threshold})`);
  }
  return count;
}

export function getCpanelFailures(): number {
  return getCounter('cpanel.failures');
}

export default {
  incrementCounter,
  getCounter,
  resetCounters,
  incrementCpanelFailure,
  getCpanelFailures,
};

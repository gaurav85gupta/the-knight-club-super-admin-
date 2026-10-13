/**
 * Analytics & Intelligence API calls (Phase 25 — Super Admin Analytics).
 * The ONLY place that knows the admin analytics URLs; pages call these and
 * never build a path or query string by hand. Uses the shared Api client
 * (cookies, CSRF marker, silent refresh) — no second auth mechanism.
 * Mirrors orders-api.js / dashboard-api.js.
 *
 * READ-ONLY (spec Step 45): every method here is a GET. There is no
 * create/update/action call — this admin surface never mutates data.
 */

const AnalyticsApi = (() => {
  const BASE = '/admin/analytics';

  /** Builds ?a=b from ONLY the supported, non-empty parameters. */
  function toQuery(params) {
    const allowed = ['dateFilter', 'dateFrom', 'dateTo', 'course', 'category', 'instructor', 'groupBy'];
    const qs = new URLSearchParams();
    for (const key of allowed) {
      const v = params[key];
      if (v !== undefined && v !== null && String(v).trim() !== '') qs.set(key, String(v).trim());
    }
    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  return {
    options: () => Api.get(`${BASE}/options`),
    students: (params = {}) => Api.get(`${BASE}/students${toQuery(params)}`),
    courses: (params = {}) => Api.get(`${BASE}/courses${toQuery(params)}`),
    revenue: (params = {}) => Api.get(`${BASE}/revenue${toQuery(params)}`),
    learning: (params = {}) => Api.get(`${BASE}/learning${toQuery(params)}`),
  };
})();

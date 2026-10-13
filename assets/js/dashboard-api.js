/**
 * Super Admin Dashboard API calls (Phase 24). The ONLY place that knows
 * the admin dashboard URL; the page calls this and never builds the path
 * by hand. Uses the shared Api client (cookies, CSRF marker, silent
 * refresh) — no second auth mechanism. Mirrors orders-api.js.
 *
 * READ-ONLY: the dashboard has exactly one GET — no query parameters, no
 * write call.
 */

const DashboardApi = (() => {
  const BASE = '/admin/dashboard';

  return {
    get: () => Api.get(BASE),
  };
})();

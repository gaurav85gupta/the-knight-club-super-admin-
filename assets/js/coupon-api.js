/**
 * Coupon-management API calls (Phase 19 — Super Admin Coupon Management).
 * The ONLY place that knows the admin coupon URLs; pages call these and
 * never build a path or a query string by hand. Uses the shared Api client
 * (cookies, CSRF marker, silent refresh) — no second auth mechanism.
 * Mirrors courses-api.js exactly.
 */

const CouponApi = (() => {
  const BASE = '/admin/coupons';

  /** Builds ?a=b from ONLY the supported, non-empty parameters. */
  function toQuery(params) {
    const allowed = ['search', 'status', 'discountType', 'scope', 'sort', 'page', 'limit'];
    const qs = new URLSearchParams();
    for (const key of allowed) {
      const v = params[key];
      if (v !== undefined && v !== null && String(v).trim() !== '') qs.set(key, String(v).trim());
    }
    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  const action = (id, name) => Api.post(`${BASE}/${encodeURIComponent(id)}/${name}`);

  return {
    list: (params = {}) => Api.get(`${BASE}${toQuery(params)}`),
    get: (id) => Api.get(`${BASE}/${encodeURIComponent(id)}`),
    create: (body) => Api.post(BASE, body),
    update: (id, body) => Api.patch(`${BASE}/${encodeURIComponent(id)}`, body),
    activate: (id) => action(id, 'activate'),
    deactivate: (id) => action(id, 'deactivate'),
    archive: (id) => action(id, 'archive'),
    usage: (id) => Api.get(`${BASE}/${encodeURIComponent(id)}/usage`),
    courses: () => Api.get(`${BASE}/options/courses`),
  };
})();

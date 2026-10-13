/**
 * Category & instructor management API calls (Phase 8.1). The ONLY place that
 * knows the admin category/instructor URLs; pages call these and never build
 * a path or a query string by hand. Uses the shared Api client (cookies, CSRF
 * marker, silent refresh) — no second auth mechanism, same pattern as
 * courses-api.js.
 *
 * Availability changes are ACTIONS (activate / deactivate), not a `status`
 * field on an edit: the backend rejects `status` in a PATCH body.
 */

const CatalogApi = (() => {
  const ALLOWED_QUERY = ['search', 'status', 'sort', 'page', 'limit'];

  /** Builds ?a=b from ONLY the supported, non-empty parameters. */
  function toQuery(params) {
    const qs = new URLSearchParams();
    for (const key of ALLOWED_QUERY) {
      const v = params[key];
      if (v !== undefined && v !== null && String(v).trim() !== '') qs.set(key, String(v).trim());
    }
    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  function resource(base) {
    const one = (id) => `${base}/${encodeURIComponent(id)}`;
    return {
      list: (params = {}) => Api.get(`${base}${toQuery(params)}`),
      get: (id) => Api.get(one(id)),
      create: (body) => Api.post(base, body),
      update: (id, body) => Api.patch(one(id), body),
      activate: (id) => Api.post(`${one(id)}/activate`),
      deactivate: (id) => Api.post(`${one(id)}/deactivate`),
    };
  }

  return {
    categories: resource('/admin/categories'),
    instructors: resource('/admin/instructors'),
  };
})();

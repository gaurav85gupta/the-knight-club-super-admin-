/**
 * Super Admin Leads API calls (Phase L4 — Leads / Inquiry Management UI).
 * The ONLY place that knows the admin leads URLs; pages call these and
 * never build a path or query string by hand. Uses the shared Api client
 * (cookies, CSRF marker, silent refresh) — no second auth mechanism.
 * Mirrors orders-api.js / coupon-api.js exactly.
 *
 * API CONTRACT (backend/src/routes/adminLeads.routes.js — Phase L3):
 *   GET   /admin/leads        list, server-side search/filter/pagination,
 *                             fixed createdAt-descending sort
 *   GET   /admin/leads/:id    full lead detail, including adminNotes/message
 *   PATCH /admin/leads/:id    update ONLY status / adminNotes / lastContactedAt
 *
 * ContactMessage IS the Lead — there is no separate Lead model and this
 * file never talks to anything else. No create, no delete: those routes do
 * not exist on the backend (spec Step 27-28 of Phase L3), so this module
 * does not expose them either.
 */

const LeadApi = (() => {
  const BASE = '/admin/leads';

  /** Builds ?a=b from ONLY the supported, non-empty parameters. */
  function toQuery(params) {
    const allowed = ['search', 'status', 'enquiryType', 'courseId', 'page', 'limit'];
    const qs = new URLSearchParams();
    for (const key of allowed) {
      const v = params[key];
      if (v !== undefined && v !== null && String(v).trim() !== '') qs.set(key, String(v).trim());
    }
    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  return {
    list: (params = {}) => Api.get(`${BASE}${toQuery(params)}`),
    get: (id) => Api.get(`${BASE}/${encodeURIComponent(id)}`),
    /**
     * PATCH with an EXPLICIT allow-list payload only (spec Step 18 — never
     * spread the whole lead object in). Callers construct `body` from just
     * the fields that actually changed; see leads-list.js / leads-details.js.
     */
    update: (id, body) => Api.patch(`${BASE}/${encodeURIComponent(id)}`, body),
  };
})();

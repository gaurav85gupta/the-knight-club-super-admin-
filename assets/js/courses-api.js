/**
 * Course-management API calls. The ONLY place that knows the admin course
 * URLs; pages call these and never build a path or a query string by hand.
 * Uses the shared Api client (cookies, CSRF marker, silent refresh) — no
 * second auth mechanism.
 */

const CoursesApi = (() => {
  const BASE = '/admin/courses';

  /** Builds ?a=b from ONLY the supported, non-empty parameters. */
  function toQuery(params) {
    const allowed = ['search', 'status', 'visibility', 'category', 'instructor', 'sort', 'page', 'limit'];
    const qs = new URLSearchParams();
    for (const key of allowed) {
      const v = params[key];
      if (v !== undefined && v !== null && String(v).trim() !== '') qs.set(key, String(v).trim());
    }
    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  const action = (id, name) => Api.post(`${BASE}/${encodeURIComponent(id)}/${name}`);

  /**
   * Upload a course thumbnail image via raw binary body, reusing the same
   * existing Bunny Storage Zone architecture as the 1% Club founder-image
   * upload (see assets/js/membership-api.js#uploadImage for the original
   * pattern this mirrors). Sends the file bytes directly — no multipart —
   * with Content-Type set to the image MIME type and fileName in the query
   * string. Not nested under a course id: on create, no course id exists
   * yet, so this returns a Bunny CDN URL that the form stores in the
   * existing `thumbnail` field; the existing create/update Course API is
   * what actually persists it.
   *
   * @param {File} file          browser File object
   * @param {string} [previousUrl]  prior Bunny-hosted CDN URL being
   *   replaced, if any — passed through for best-effort cleanup. A plain
   *   admin-entered reference URL (not a Bunny CDN URL) is safely ignored
   *   server-side rather than deleted.
   * @returns {Promise<{ cdnUrl: string }>}
   */
  async function uploadThumbnail(file, previousUrl) {
    const apiBase = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : '/api/v1';
    const qs = new URLSearchParams({ fileName: file.name });
    if (previousUrl) qs.set('previousUrl', previousUrl);
    const url = `${apiBase}${BASE}/thumbnail?${qs.toString()}`;

    async function doFetch() {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: file,
        credentials: 'include',
        cache: 'no-store',
      });
    }

    let res = await doFetch();

    // Session refresh on 401 (mirrors Api.request behaviour)
    if (res.status === 401) {
      await Api.refreshOnce().catch(() => {});
      res = await doFetch();
    }

    const body = await res.json().catch(() => null);
    if (!res.ok || !body || !body.success) {
      const msg = (body && body.message) || 'Thumbnail upload failed.';
      const err = new Error(msg);
      err.status = res.status;
      err.fieldErrors = (body && body.errors) || null;
      throw err;
    }
    return body.data;
  }

  return {
    list: (params = {}) => Api.get(`${BASE}${toQuery(params)}`),
    get: (id) => Api.get(`${BASE}/${encodeURIComponent(id)}`),
    create: (body) => Api.post(BASE, body),
    update: (id, body) => Api.patch(`${BASE}/${encodeURIComponent(id)}`, body),
    publish: (id) => action(id, 'publish'),
    unpublish: (id) => action(id, 'unpublish'),
    archive: (id) => action(id, 'archive'),
    restore: (id) => action(id, 'restore'),
    setVisibility: (id, visibility) => Api.post(`${BASE}/${encodeURIComponent(id)}/visibility`, { visibility }),
    categories: () => Api.get(`${BASE}/options/categories`),
    instructors: () => Api.get(`${BASE}/options/instructors`),
    uploadThumbnail,
  };
})();

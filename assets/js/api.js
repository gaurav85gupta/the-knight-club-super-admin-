/**
 * Super Admin API client.
 *
 * Wraps fetch() against CONFIG.API_BASE_URL and unwraps the backend's
 * standard envelope:
 *
 *   success: { success: true,  message, data }
 *   failure: { success: false, message, errorCode, requestId?, errors? }
 *
 * WHAT THIS FILE IS RESPONSIBLE FOR (and why)
 * -------------------------------------------
 * 1. CSRF marker. The backend rejects every state-changing request that
 *    lacks `X-Requested-With: XMLHttpRequest` (backend/src/middleware/
 *    csrf.js). It is sent on every non-GET request, here and nowhere else,
 *    so no page can forget it.
 *
 * 2. Credentials. Authentication lives in HttpOnly cookies that JavaScript
 *    cannot read, so every request uses `credentials: 'include'`. This file
 *    never sees, stores or logs a token — there is none to see.
 *
 * 3. Structured errors. Failures throw an `ApiError` keeping the HTTP
 *    status, the machine-readable `errorCode`, and per-field `errors`.
 *
 * 4. Silent session refresh. The admin access cookie is short-lived
 *    (10 min). On a 401 the client makes ONE attempt to refresh and retries
 *    the original request once. Concurrent 401s share a single in-flight
 *    refresh (`refreshOnce`) so a burst never triggers competing rotations
 *    of the refresh token.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * - No Authorization header; no token in localStorage/sessionStorage.
 * - No refresh attempt for the credential endpoints themselves
 *   (login/refresh/logout): a 401 from /admin/auth/login means "wrong
 *   credentials", not "session expired", and retrying would be wrong.
 */

class ApiError extends Error {
  constructor(message, { status = 0, errorCode = 'UNKNOWN', errors = [], requestId } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.errors = errors;
    this.requestId = requestId;
  }

  get isNetworkError() {
    return this.status === 0;
  }
  get isUnauthorized() {
    return this.status === 401;
  }
  get isRateLimited() {
    return this.status === 429;
  }
  get isValidation() {
    return this.status === 422;
  }
}

const Api = (() => {
  const REQUEST_TIMEOUT_MS = 15000;

  // Endpoints whose 401 must NEVER trigger a refresh-and-retry.
  const NO_REFRESH_PATHS = new Set(['/admin/auth/login', '/admin/auth/refresh', '/admin/auth/logout']);

  let refreshInFlight = null;

  /** Performs one raw HTTP call and returns the unwrapped `data`. */
  async function send(path, { method = 'GET', body, headers = {} } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const finalHeaders = { Accept: 'application/json', ...headers };
    if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
    // CSRF marker: required by the backend on every state-changing request.
    if (method !== 'GET' && method !== 'HEAD') finalHeaders['X-Requested-With'] = 'XMLHttpRequest';

    let res;
    try {
      res = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
        method,
        headers: finalHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });
    } catch (err) {
      const timedOut = err && err.name === 'AbortError';
      throw new ApiError(
        timedOut
          ? 'The request took too long. Please check your connection and try again.'
          : 'Unable to reach the server. Please check your connection and try again.',
        { status: 0, errorCode: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR' }
      );
    } finally {
      clearTimeout(timer);
    }

    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload || payload.success === false) {
      throw new ApiError((payload && payload.message) || `Request failed (${res.status}).`, {
        status: res.status,
        errorCode: (payload && payload.errorCode) || 'UNKNOWN',
        errors: (payload && Array.isArray(payload.errors) && payload.errors) || [],
        requestId: payload && payload.requestId,
      });
    }

    return payload.data;
  }

  /**
   * Refreshes the admin session. All concurrent callers share ONE request:
   * the backend rotates the refresh token on every call, so two parallel
   * refreshes with the same cookie would make the second a "reuse".
   * @returns {Promise<object|null>} refreshed payload, or null when logged out.
   */
  function refreshOnce() {
    if (!refreshInFlight) {
      refreshInFlight = send('/admin/auth/refresh', { method: 'POST' })
        .catch(() => null)
        .finally(() => {
          refreshInFlight = null;
        });
    }
    return refreshInFlight;
  }

  async function request(path, options = {}) {
    try {
      return await send(path, options);
    } catch (err) {
      const canRefresh =
        err instanceof ApiError && err.status === 401 && !NO_REFRESH_PATHS.has(path) && !options._retried;
      if (!canRefresh) throw err;

      const refreshed = await refreshOnce();
      if (!refreshed) throw err; // genuinely logged out: surface the original 401
      return request(path, { ...options, _retried: true });
    }
  }

  return {
    request,
    refreshOnce,
    get: (path) => request(path, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body: body === undefined ? {} : body }),
    patch: (path, body) => request(path, { method: 'PATCH', body: body === undefined ? {} : body }),
  };
})();

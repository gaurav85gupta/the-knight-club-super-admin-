/**
 * Auth — the single owner of "who is the signed-in administrator".
 *
 * PAGES NEVER TALK TO THE AUTH ENDPOINTS DIRECTLY. They call this module,
 * so every authentication rule lives in one file instead of being
 * re-implemented (and subtly diverging) on each page.
 *
 * WHAT IS — AND IS NOT — STORED IN THE BROWSER
 * --------------------------------------------
 * The real credentials are two HttpOnly cookies set by the backend. This
 * file cannot read them and never tries to. There is NO token in
 * localStorage, sessionStorage, a JS variable, or a URL.
 *
 * Unlike the public website, the admin app also keeps NO persistent "signed
 * in" hint. A privileged console should not leave a forgeable/stale client
 * flag lying around, and the hint only saved a network call for anonymous
 * visitors — irrelevant here. Every protected page load asks the SERVER
 * (GET /admin/auth/me). The admin profile is held in memory only.
 *
 * The one thing that IS in sessionStorage is a one-shot, non-sensitive
 * notice string ("Your session has expired") shown once on the login page.
 *
 * PROTECTED PAGES
 * ---------------
 * `Auth.requireAuth()` is the guard. It asks the SERVER and redirects to the
 * login page on 401. THIS IS UX, NOT SECURITY: hiding UI never protects
 * anything. The backend authorizes every API call regardless of what this
 * file does; a visitor who bypasses this guard sees an empty shell and
 * receives 401 from every API call.
 *
 * SESSION EXPIRY
 * --------------
 * If a session dies while a page is open (expired, revoked, suspended), the
 * next protected API call fails 401 after a failed refresh. Callers pass
 * that error to `Auth.handleSessionError()`, which clears state and returns
 * to login with a notice.
 *
 * CROSS-TAB SIGN-OUT
 * ------------------
 * Signing out in one tab must sign out the others. A BroadcastChannel (no
 * persistent storage) tells other tabs to leave; each tab also re-verifies
 * with the server, which is the actual authority.
 */

const Auth = (() => {
  const NOTICE_KEY = 'tnc_admin_notice'; // one-shot message for the login page
  const CHANNEL_NAME = 'tnc_admin_auth';

  // Page paths, relative to the app root. Centralized so a rename is one edit.
  const PATHS = Object.freeze({
    login: 'pages/login.html',
    home: 'index.html',
  });

  /** In-memory only. Never persisted. */
  let currentAdmin = null;

  let channel = null;
  try {
    channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL_NAME) : null;
  } catch {
    channel = null;
  }

  // ---- helpers ------------------------------------------------------------

  /** Resolves an app-root-relative path from any page depth (root or /pages/). */
  function urlFor(path) {
    const inPages = window.location.pathname.includes('/pages/');
    return (inPages ? '../' : '') + path;
  }

  function setNotice(message, kind = 'info') {
    try {
      sessionStorage.setItem(NOTICE_KEY, JSON.stringify({ message, kind }));
    } catch {
      /* storage disabled: the notice is optional */
    }
  }

  function consumeNotice() {
    try {
      const raw = sessionStorage.getItem(NOTICE_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(NOTICE_KEY);
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // ---- public API ---------------------------------------------------------

  /**
   * Asks the server who the current administrator is. A 401 is the NORMAL
   * answer for a logged-out visitor, so it resolves to null rather than
   * throwing. Only unexpected failures (network, 5xx) propagate.
   * @returns {Promise<object|null>}
   */
  async function fetchCurrentAdmin() {
    try {
      const data = await Api.get('/admin/auth/me');
      currentAdmin = data.admin || null;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        currentAdmin = null;
      } else {
        throw err;
      }
    }
    return currentAdmin;
  }

  /** @returns {object|null} the in-memory admin (call requireAuth() first). */
  function getAdmin() {
    return currentAdmin;
  }

  /** Signs in with Admin ID + password. Credentials are never stored. */
  async function login({ adminId, password }) {
    const data = await Api.post('/admin/auth/login', { adminId, password });
    currentAdmin = data.admin || null;
    return currentAdmin;
  }

  /**
   * Signs out. Local state is cleared even if the network call fails, so the
   * UI never keeps showing a signed-in state the operator asked to leave.
   * The server call is what actually revokes the session.
   */
  async function logout() {
    try {
      await Api.post('/admin/auth/logout');
    } catch {
      /* best effort: local state is cleared regardless */
    }
    currentAdmin = null;
    try {
      if (channel) channel.postMessage({ type: 'logout' });
    } catch {
      /* ignore */
    }
  }

  /**
   * Route guard for protected pages. Call at the top of the page script:
   *
   *     const admin = await Auth.requireAuth();   // redirects if not signed in
   *
   * Resolves with the admin when authenticated. When not, it redirects and
   * returns a promise that never settles, so the code after the `await`
   * cannot run and briefly render protected UI. FAILS CLOSED: if the server
   * cannot be reached, protected UI is not shown.
   */
  async function requireAuth() {
    let admin = null;
    try {
      admin = await fetchCurrentAdmin();
    } catch {
      setNotice('We could not verify your session. Please sign in again.', 'error');
    }
    if (admin) return admin;

    window.location.replace(urlFor(PATHS.login));
    return new Promise(() => {});
  }

  /**
   * For the login page: if already signed in, skip it.
   * @returns {Promise<boolean>} true when a redirect was started
   */
  async function redirectIfAuthenticated() {
    let admin = null;
    try {
      admin = await fetchCurrentAdmin();
    } catch {
      return false; // server unreachable: show the login form
    }
    if (admin) {
      window.location.replace(urlFor(PATHS.home));
      return true;
    }
    return false;
  }

  /**
   * Call when a protected API request fails with 401 after Api's refresh
   * attempt: the session is gone. Clears state and returns to login.
   * @returns {boolean} true if it handled the error
   */
  function handleSessionError(err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      currentAdmin = null;
      setNotice('Your session has expired. Please sign in again.', 'error');
      window.location.replace(urlFor(PATHS.login));
      return true;
    }
    return false;
  }

  // Cross-tab sign-out: another tab logged out, so leave the protected area.
  if (channel) {
    channel.onmessage = (e) => {
      if (e && e.data && e.data.type === 'logout') {
        currentAdmin = null;
        if (!window.location.pathname.includes('/pages/login')) {
          window.location.replace(urlFor(PATHS.login));
        }
      }
    };
  }

  return {
    PATHS,
    urlFor,
    fetchCurrentAdmin,
    getAdmin,
    login,
    logout,
    requireAuth,
    redirectIfAuthenticated,
    handleSessionError,
    setNotice,
    consumeNotice,
  };
})();

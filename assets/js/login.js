/**
 * Super Admin login page controller.
 *
 * Flow:  validate -> Auth.login (POST /admin/auth/login) -> redirect to the
 *        protected admin home.
 *
 * ERROR HANDLING MAP (what the backend can answer, and what the operator sees)
 *   401  any credential failure   -> the backend's ONE generic message
 *                                    ("Invalid admin credentials."). This is
 *                                    intentionally the same for unknown ID,
 *                                    wrong password, suspended and locked, and
 *                                    is shown in the banner — never beside a
 *                                    single field, which would hint which
 *                                    part was wrong.
 *   429  rate limited             -> "too many attempts" message
 *   0    network / timeout        -> connection message
 *   422  malformed input          -> generic message
 *
 * SECURITY BEHAVIOURS
 *   - The password field is ALWAYS cleared after a failed attempt.
 *   - Credentials are sent only in the POST JSON body: never in the URL or
 *     query string (the <form> has no action/method, and submit is handled
 *     with preventDefault, so a JS failure can never fall back to a GET that
 *     would put the password in the address bar).
 *   - The password is never written to localStorage/sessionStorage/console.
 *   - The submit button is disabled while a request is in flight, and a
 *     re-entrancy guard blocks duplicate submissions (Enter-key mashing).
 *   - No `?next=` redirect is honoured: after login the admin always lands
 *     on the fixed admin home, so the login page can never be used as an
 *     open redirector.
 */

(function initAdminLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const alertEl = document.getElementById('form-alert');
  const submitBtn = document.getElementById('submit-btn');

  Forms.initPasswordToggles(form);

  // One-shot notice from a session-expiry redirect.
  const notice = Auth.consumeNotice();
  if (notice) Forms.showAlert(alertEl, notice.message, notice.kind === 'error' ? 'error' : 'info');

  // Already signed in? Skip the form.
  Auth.redirectIfAuthenticated();

  let inFlight = false;

  function validate() {
    let firstInvalid = null;
    const idError = Forms.normalizeAdminId(form.adminId.value) ? '' : 'Please provide your Admin ID.';
    const pwError = form.password.value ? '' : 'Please provide your password.';

    if (idError) { Forms.setFieldError(form.adminId, idError); firstInvalid = form.adminId; } else Forms.clearFieldError(form.adminId);
    if (pwError) { Forms.setFieldError(form.password, pwError); firstInvalid = firstInvalid || form.password; } else Forms.clearFieldError(form.password);

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  for (const input of [form.adminId, form.password]) {
    input.addEventListener('input', () => {
      if (input.closest('.field').classList.contains('has-error')) Forms.clearFieldError(input);
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (inFlight || submitBtn.disabled) return; // no duplicate login requests

    Forms.hideAlert(alertEl);
    Forms.clearAllErrors(form);
    if (!validate()) return;

    inFlight = true;
    Forms.setLoading(submitBtn, true, 'Signing in…');
    try {
      await Auth.login({ adminId: form.adminId.value, password: form.password.value });
      // Wait for the chime to finish BEFORE redirecting: navigating away
      // destroys the Audio object and would cut the sound off. play() always
      // settles (max ~2.5s) and never rejects, so it cannot block sign-in.
      await LoginSound.play();
      window.location.replace(Auth.urlFor(Auth.PATHS.home));
      // Leave the button in its loading state: we are navigating away.
    } catch (err) {
      inFlight = false;
      Forms.setLoading(submitBtn, false);
      form.password.value = ''; // never leave the password sitting in the DOM

      if (!(err instanceof ApiError)) {
        Forms.showAlert(alertEl, 'Something went wrong. Please try again.');
      } else if (err.isNetworkError) {
        Forms.showAlert(alertEl, err.message);
      } else if (err.status === 401) {
        Forms.showAlert(alertEl, err.message); // the backend's generic message
        form.password.focus();
      } else if (err.isRateLimited) {
        Forms.showAlert(alertEl, 'Too many sign-in attempts. Please wait a few minutes and try again.');
      } else if (err.isValidation) {
        Forms.showAlert(alertEl, 'Invalid admin credentials.');
      } else {
        Forms.showAlert(alertEl, 'Something went wrong. Please try again.');
      }
      if (!alertEl.hidden && alertEl.focus) alertEl.focus();
    }
  });
})();
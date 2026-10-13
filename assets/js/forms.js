/**
 * Forms — small shared helpers for the admin login page.
 *
 * Client-side validation here exists ONLY to give instant feedback and save
 * a round trip. It is a convenience, never a control: the backend
 * re-validates everything and is the source of truth.
 *
 * All text is written with textContent, never innerHTML, so nothing a user
 * types (or the API returns) can be interpreted as markup.
 */

const Forms = (() => {
  /** Same normalization as the backend (backend/src/utils/normalize.js). */
  function normalizeAdminId(v) {
    return String(v || '').normalize('NFKC').trim().toLowerCase();
  }

  function fieldEl(input) {
    return input.closest('.field');
  }

  function errorEl(input) {
    return fieldEl(input).querySelector('.field-error');
  }

  function setFieldError(input, message) {
    fieldEl(input).classList.add('has-error');
    input.setAttribute('aria-invalid', 'true');
    errorEl(input).textContent = message;
  }

  function clearFieldError(input) {
    fieldEl(input).classList.remove('has-error');
    input.removeAttribute('aria-invalid');
    errorEl(input).textContent = '';
  }

  function clearAllErrors(form) {
    form.querySelectorAll('.input').forEach(clearFieldError);
  }

  /** Shows a banner alert. kind: 'error' | 'success' | 'info'. */
  function showAlert(el, message, kind = 'error') {
    el.className = `alert alert-${kind}`;
    el.textContent = message;
    el.hidden = false;
  }

  function hideAlert(el) {
    el.hidden = true;
    el.textContent = '';
  }

  /** Toggles a submit button's loading state and blocks double submits. */
  function setLoading(button, isLoading, loadingLabel) {
    const label = button.querySelector('.label');
    if (isLoading) {
      button.dataset.label = label.textContent;
      label.textContent = loadingLabel;
    } else if (button.dataset.label) {
      label.textContent = button.dataset.label;
    }
    button.classList.toggle('is-loading', isLoading);
    button.disabled = isLoading;
    button.setAttribute('aria-busy', String(isLoading));
  }

  /** Wires every ".toggle-password" button to reveal/hide its sibling input. */
  function initPasswordToggles(root = document) {
    root.querySelectorAll('.toggle-password').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.textContent = show ? 'Hide' : 'Show';
        btn.setAttribute('aria-pressed', String(show));
      });
    });
  }

  return {
    normalizeAdminId,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    showAlert,
    hideAlert,
    setLoading,
    initPasswordToggles,
  };
})();

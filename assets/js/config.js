/**
 * Centralized frontend API configuration for Super Admin.
 * Mirrors public-website/assets/js/config.js — no secrets belong here.
 */

const CONFIG = Object.freeze({
  API_BASE_URL: (() => {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return isLocal
      ? 'http://localhost:5000/api/v1'
      : 'https://the-knight-club-backend-.onrender.com/api/v1';
  })(),
});
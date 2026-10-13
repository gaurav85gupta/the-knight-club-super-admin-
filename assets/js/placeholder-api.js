/**
 * Super Admin — Placeholders API client (Central Placeholders System).
 *
 * THE ONLY place that knows the admin placeholder URLs. Pages call this
 * module and never build a path or query by hand. Uses the shared Api client
 * (cookies, CSRF marker, silent session refresh) — no second auth mechanism.
 *
 * Endpoints (all behind /api/v1/admin/placeholders):
 *   GET    /                               — list implemented placeholders
 *   GET    /:key                           — one placeholder's config
 *   POST   /:key/video/upload              — init Bunny TUS upload (returns creds)
 *   POST   /:key/video/:videoId/uploaded   — mark TUS complete
 *   POST   /:key/video/:videoId/failed     — report TUS failure
 *   GET    /:key/video/status              — poll video processing status
 *   POST   /:key/video/preview             — get signed admin preview URL
 *   DELETE /:key/video                     — remove video configuration
 *
 * The Bunny API key is NEVER returned by any endpoint here — it is the
 * signing input server-side, never the output. Credentials from
 * initVideoUpload() contain only { endpoint, libraryId, videoId,
 * expirationTime, signature }.
 */

const PlaceholderApi = (() => {
  const BASE = '/admin/placeholders';

  function keyPath(key) {
    return `${BASE}/${encodeURIComponent(key)}`;
  }

  /**
   * List all implemented placeholders with their current configuration.
   * @returns {Promise<{ items: object[] }>}
   */
  function listPlaceholders() {
    return Api.get(BASE);
  }

  /**
   * Get one placeholder's configuration by key.
   * @param {string} key  e.g. "home.skills.video"
   * @returns {Promise<object>}
   */
  function getPlaceholder(key) {
    return Api.get(keyPath(key));
  }

  /**
   * Initialize a Bunny Stream TUS video upload for a placeholder.
   * Returns TUS credentials — the Bunny API key is NEVER included.
   *
   * @param {string} key
   * @param {{ fileName: string, fileSize: number, mimeType?: string, replace?: boolean }} body
   * @returns {Promise<{ upload: object, resumed: boolean, placeholder: object }>}
   */
  function initVideoUpload(key, body) {
    return Api.post(`${keyPath(key)}/video/upload`, body);
  }

  /**
   * Mark the TUS video upload as complete and sync status from Bunny.
   * @param {string} key
   * @param {string} videoId  the Bunny video ID from the TUS credentials
   * @returns {Promise<{ placeholder: object, bunnyStatusCode: number }>}
   */
  function markVideoUploaded(key, videoId) {
    return Api.post(`${keyPath(key)}/video/${encodeURIComponent(videoId)}/uploaded`, {});
  }

  /**
   * Report that the TUS upload (browser → Bunny) failed.
   * @param {string} key
   * @param {string} videoId
   * @param {string} [reason]
   */
  function reportVideoFailure(key, videoId, reason) {
    return Api.post(`${keyPath(key)}/video/${encodeURIComponent(videoId)}/failed`, {
      reason: reason || 'UNKNOWN',
    });
  }

  /**
   * Poll the current video processing status from Bunny.
   * @param {string} key
   * @returns {Promise<{ videoStatus: string, bunnyStatusCode: number|null }>}
   */
  function getVideoStatus(key) {
    return Api.get(`${keyPath(key)}/video/status`);
  }

  /**
   * Get a short-lived signed Bunny embed URL for admin preview.
   * Returns { embedUrl, expiresAt } — no Bunny credentials.
   * @param {string} key
   */
  function previewVideo(key) {
    return Api.post(`${keyPath(key)}/video/preview`, {});
  }

  /**
   * Remove the video configuration from a placeholder.
   * Does NOT delete the Bunny Stream asset (conservative by design).
   * @param {string} key
   */
  function removeVideo(key) {
    return Api.request(`${keyPath(key)}/video`, { method: 'DELETE', body: {} });
  }

  return {
    listPlaceholders,
    getPlaceholder,
    initVideoUpload,
    markVideoUploaded,
    reportVideoFailure,
    getVideoStatus,
    previewVideo,
    removeVideo,
  };
})();

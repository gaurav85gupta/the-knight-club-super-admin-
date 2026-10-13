/**
 * Lesson-video API calls (Phase 8). The ONLY place that knows the admin video
 * URLs. Uses the shared Api client (cookies, CSRF marker, silent refresh).
 *
 * These calls carry only small JSON. The video itself goes browser -> Bunny
 * (see video-upload.js); it is never sent through Api / our backend.
 */

const VideoApi = (() => {
  const base = (c, m, l) =>
    `/admin/courses/${encodeURIComponent(c)}/modules/${encodeURIComponent(m)}/lessons/${encodeURIComponent(l)}/video`;
  const item = (c, m, l, v) => `${base(c, m, l)}/${encodeURIComponent(v)}`;
  const del = (path) => Api.request(path, { method: 'DELETE', body: {} });

  return {
    overview: (c, m, l) => Api.get(base(c, m, l)),
    status: (c, m, l) => Api.get(`${base(c, m, l)}/status`),
    initializeUpload: (c, m, l, body) => Api.post(`${base(c, m, l)}/upload`, body),
    markUploaded: (c, m, l, v) => Api.post(`${item(c, m, l, v)}/uploaded`, {}),
    reportFailure: (c, m, l, v, reason) => Api.post(`${item(c, m, l, v)}/failed`, { reason }),
    discard: (c, m, l, v) => Api.post(`${item(c, m, l, v)}/discard`, {}),
    preview: (c, m, l, v) => Api.post(v ? `${item(c, m, l, v)}/preview` : `${base(c, m, l)}/preview`, {}),
    removeFromLesson: (c, m, l) => Api.post(`${base(c, m, l)}/remove`, {}),
    deleteAsset: (c, m, l, v) => del(item(c, m, l, v)),
  };
})();

/**
 * Curriculum-management API calls (Phase 7). The ONLY place that knows the
 * admin curriculum URLs; the builder page calls these and never builds a
 * path or a query string by hand. Uses the shared Api client (cookies,
 * CSRF marker, silent refresh) — no second auth mechanism, same pattern as
 * courses-api.js.
 */

const CurriculumApi = (() => {
  const base = (courseId) => `/admin/courses/${encodeURIComponent(courseId)}`;

  return {
    // ---- Curriculum tree ----------------------------------------------------
    getTree: (courseId) => Api.get(`${base(courseId)}/curriculum`),

    // ---- Modules --------------------------------------------------------------
    listModules: (courseId) => Api.get(`${base(courseId)}/modules`),
    createModule: (courseId, body) => Api.post(`${base(courseId)}/modules`, body),
    getModule: (courseId, moduleId) => Api.get(`${base(courseId)}/modules/${encodeURIComponent(moduleId)}`),
    updateModule: (courseId, moduleId, body) => Api.patch(`${base(courseId)}/modules/${encodeURIComponent(moduleId)}`, body),
    deleteModule: (courseId, moduleId) => Api.request(`${base(courseId)}/modules/${encodeURIComponent(moduleId)}`, { method: 'DELETE', body: {} }),
    reorderModules: (courseId, moduleIds) => Api.post(`${base(courseId)}/modules/reorder`, { moduleIds }),

    // ---- Lessons (module-scoped) ------------------------------------------------
    listLessons: (courseId, moduleId) => Api.get(`${base(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons`),
    createLesson: (courseId, moduleId, body) => Api.post(`${base(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons`, body),
    getLesson: (courseId, moduleId, lessonId) =>
      Api.get(`${base(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}`),
    updateLesson: (courseId, moduleId, lessonId, body) =>
      Api.patch(`${base(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}`, body),
    deleteLesson: (courseId, moduleId, lessonId) =>
      Api.request(`${base(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}`, {
        method: 'DELETE',
        body: {},
      }),
    reorderLessons: (courseId, moduleId, lessonIds) =>
      Api.post(`${base(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons/reorder`, { lessonIds }),
  };
})();

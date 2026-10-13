/** Category management page (Phase 8.1): config for the shared CatalogPage controller. */

CatalogPage.init({
  api: CatalogApi.categories,
  noun: 'category',
  plural: 'categories',
  titleCase: 'Category',

  columns: [
    {
      render: (c) => Dom.el('div', {}, [
        Dom.el('div', { class: 'cell-title', text: c.name }),
        Dom.el('div', { class: 'cell-sub', text: c.slug }),
        c.description ? Dom.el('div', { class: 'cell-sub', text: c.description }) : null,
      ]),
    },
  ],

  // Explicit list of writable fields — the ONLY keys the page can ever send.
  fields: [
    { key: 'name', label: 'Name', required: true, min: 2, max: 60, requiredMessage: 'The name must be at least 2 characters.' },
    { key: 'slug', label: 'Slug', required: false, max: 100, hint: 'Lowercase letters, digits and hyphens. Leave blank to generate it from the name.' },
    { key: 'description', label: 'Description', required: false, max: 500, multiline: true },
  ],

  statusCopy: (c) => ({
    deactivate: {
      title: 'Deactivate this category?',
      message: `“${c.name}” will no longer be offered when creating a new course. ${c.courseCount ? `The ${c.courseCount} course${c.courseCount === 1 ? '' : 's'} already using it are not changed. ` : ''}You can activate it again at any time.`,
      confirmLabel: 'Deactivate',
      danger: true,
    },
    activate: {
      title: 'Activate this category?',
      message: `“${c.name}” will be available again when creating a new course.`,
      confirmLabel: 'Activate',
    },
  }),
});

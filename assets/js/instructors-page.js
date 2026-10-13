/** Instructor management page (Phase 8.1): config for the shared CatalogPage controller. */

CatalogPage.init({
  api: CatalogApi.instructors,
  noun: 'instructor',
  plural: 'instructors',
  titleCase: 'Instructor',

  columns: [
    {
      render: (i) => Dom.el('div', {}, [
        Dom.el('div', { class: 'cell-title', text: i.name }),
        Dom.el('div', { class: 'cell-sub', text: i.designation || i.slug }),
        i.designation ? Dom.el('div', { class: 'cell-sub', text: i.slug }) : null,
      ]),
    },
  ],

  // Explicit list of writable fields — the ONLY keys the page can ever send.
  // These are exactly the Instructor model's editable fields; no contact
  // details exist on the model, so none are collected.
  fields: [
    { key: 'name', label: 'Name', required: true, min: 2, max: 80, requiredMessage: 'The name must be at least 2 characters.' },
    { key: 'slug', label: 'Slug', required: false, max: 100, hint: 'Lowercase letters, digits and hyphens. Leave blank to generate it from the name. Two instructors may share a name, but never a slug.' },
    { key: 'designation', label: 'Designation', required: false, max: 100, hint: 'Shown under the name, e.g. “Senior SEO Strategist”.' },
    { key: 'bio', label: 'Bio', required: false, max: 2000, multiline: true },
    { key: 'profileImage', label: 'Profile image', required: false, max: 500, hint: 'An https:// image address. Uploading images is not part of this phase.' },
  ],

  statusCopy: (i) => ({
    deactivate: {
      title: 'Deactivate this instructor?',
      message: `“${i.name}” will no longer be offered when creating a new course. ${i.courseCount ? `The ${i.courseCount} course${i.courseCount === 1 ? '' : 's'} already assigned to them are not changed. ` : ''}You can activate them again at any time.`,
      confirmLabel: 'Deactivate',
      danger: true,
    },
    activate: {
      title: 'Activate this instructor?',
      message: `“${i.name}” will be available again when creating a new course.`,
      confirmLabel: 'Activate',
    },
  }),
});

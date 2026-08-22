import type { ComponentSpec } from './types.js';

export const dataDisplayComponents: ComponentSpec[] = [
  {
    id: 'table',
    name: 'Table',
    category: 'data-display',
    status: 'stable',
    summary:
      'Relational data in rows and columns. Built on real table semantics, because a grid of divs is unusable with a screen reader no matter how many ARIA attributes are bolted on.',
    whenToUse: ['Data with two or more attributes per item that users compare across rows.', 'Anything sortable, filterable or selectable in bulk.'],
    whenNotToUse: [
      'Layout. Never.',
      'A single attribute per item — use a list.',
      'Rich, image-led items — use a card grid.',
          'A spreadsheet. Column resizing and reordering, frozen columns, inline editing, grouping and row virtualisation are a **data grid**, which this system deliberately does not ship — see the note below.',
],
    anatomy: [
      { part: 'Caption or heading', required: true, description: 'Identifies the dataset. Visually hidden if a nearby heading already does the job.' },
      { part: 'Scroll container', required: true, description: 'A focusable, labelled region so keyboard users can scroll a wide table.' },
      { part: 'Head', required: true, description: '<thead> with <th scope="col">.' },
      { part: 'Body', required: true, description: 'Rows. The first cell of each row is <th scope="row"> when it identifies the row.' },
      { part: 'Selection column', required: false, description: 'Checkboxes with a tri-state header.' },
      { part: 'Actions column', required: false, description: 'A menu per row, with a row-specific accessible name.' },
      { part: 'Empty state', required: true, description: 'Spanning row when there is nothing to show.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-table', description: 'Row rules, no vertical lines.', use: 'Most data.' },
      { name: 'Striped', className: 'sk-table--striped', description: 'Alternating row tint.', use: 'Wide tables where the eye loses the row. Costs some visual calm.' },
      { name: 'Bordered', className: 'sk-table--bordered', description: 'Full grid lines.', use: 'Dense numeric data where cell boundaries genuinely help.' },
      { name: 'Sticky header', className: 'sk-table--sticky-head', description: 'Header pinned during scroll.', use: 'Tables longer than a viewport.' },
    ],
    sizes: [
      { name: 'Dense', className: 'sk-table--dense', height: '2rem rows', typeStyle: 'body-sm', description: 'Log and audit views.' },
      { name: 'Compact', className: 'sk-table--compact', height: '2.5rem rows', typeStyle: 'body-sm', description: 'Operator consoles.' },
      { name: 'Medium', className: '', height: '3rem rows', typeStyle: 'body-sm', description: 'Default.' },
    ],
    states: [
      { name: 'Rest', description: 'Normal.', trigger: 'default' },
      { name: 'Row hover', description: 'Subtle wash across the whole row.', trigger: 'tr:hover' },
      { name: 'Row selected', description: 'Selected surface plus a leading brand bar, and the row checkbox checked.', trigger: '[aria-selected="true"]' },
      { name: 'Sorted column', description: 'aria-sort plus a directional icon and a bolder header.', trigger: '[aria-sort]' },
      { name: 'Loading', description: 'Skeleton rows replacing the body, row count preserved.', trigger: '[aria-busy="true"]' },
      { name: 'Empty', description: 'A single cell spanning all columns with an Empty state.', trigger: '[data-empty]' },
    ],
    props: [
      { name: 'caption', type: 'string', required: true, description: 'Dataset name. Screen reader users use it to decide whether to explore the table.' },
      { name: 'sortable', type: 'boolean', default: 'false', description: 'Enable column sorting.' },
      { name: 'selectable', type: 'boolean', default: 'false', description: 'Enable row selection.' },
      { name: 'stickyHeader', type: 'boolean', default: 'false', description: 'Pin the header.' },
      { name: 'density', type: "'dense' | 'compact' | 'medium'", default: "'medium'", description: 'Row height.' },
    ],
    tokensUsed: ['color-surface-raised', 'color-surface-subtle', 'color-border-subtle', 'color-surface-hover', 'color-surface-selected', 'color-border-brand', 'color-text-secondary'],
    /*
     * On data grids.
     *
     * This is a table: semantic markup, sorting, selection, a scroll container
     * and a caption. It is not a data grid, and the system does not ship one.
     *
     * A grid with resizable and reorderable columns, frozen columns, inline
     * editing, grouping and virtualisation is a product in its own right —
     * TanStack Table and AG Grid exist because it takes years to get right, and
     * a half-built one inside a design system is something teams outgrow in a
     * quarter and then have to work around.
     *
     * What the system does own is the part those libraries get wrong by
     * default: they are headless or canvas-based and ship no accessible
     * markup. Style them with these tokens, keep `role="grid"` and its
     * `aria-rowcount`/`aria-colcount` contract, keep the scroll container
     * focusable and named, and keep sort state on `aria-sort` — the rules in
     * this component apply whichever library draws the cells.
     */
    darkMode:
      'Row separators use border-subtle, which must go *darker* on dark (neutral-800) rather than lighter. This is counter-intuitive and is the most common dark-mode table bug: reusing a light-mode neutral-200 rule on a dark page produces bright lines that visually dominate the data. The sticky header uses surface-subtle plus an explicit bottom border, because in dark mode a shadow alone will not separate it from the rows scrolling beneath. Striping uses a 4% white overlay rather than a fixed grey, so it composites correctly over both selected and hovered rows.',
    accessibility: {
      role: 'Native <table>. For a fully interactive spreadsheet-style grid, role="grid" with full arrow-key navigation — but that is a different, much heavier component, and most tables should not be grids.',
      keyboard: [
        { keys: 'Tab', action: 'Moves between interactive elements in the table, not between cells. This is correct for a data table.' },
        { keys: 'Enter / Space on a sort header', action: 'Toggle sort.' },
        { keys: 'Space on a row checkbox', action: 'Toggle selection.' },
        { keys: 'Shift+Click / Shift+Space', action: 'Range selection.' },
        { keys: 'Arrow keys on the scroll container', action: 'Scroll a wide table. The container has tabindex="0" so this is possible at all.' },
      ],
      aria: [
        '<caption> naming the dataset, or aria-labelledby pointing at a nearby heading.',
        'scope="col" on column headers and scope="row" on row headers. Without scope, cell-to-header association breaks in complex tables.',
        'aria-sort="ascending" | "descending" | "none" on the sorted column header.',
        'The horizontally scrollable wrapper needs tabindex="0", role="region" and an accessible name, or keyboard users cannot scroll it.',
        'Row action menus need row-specific names: "Actions for Website redesign".',
        'Announce sort and filter results in a polite live region — the visual reorder is silent.',
        'Never place secret values or internal identifiers in data attributes; they are readable by anyone with the page.',
      ],
      wcag: [
        '1.3.1 Info and Relationships — the core criterion for tables.',
        '1.3.2 Meaningful Sequence.',
        '1.4.10 Reflow — the table scrolls in its own container rather than the page.',
        '2.1.1 Keyboard.',
        '2.4.7 Focus Visible.',
        '4.1.3 Status Messages.',
      ],
      screenReader: 'Announced as "<caption>, table, N columns, M rows". Navigating cells reads the associated headers.',
      targetSize: 'Row checkboxes and action buttons meet 24x24 CSS px; dense mode extends the hit area with padding rather than shrinking the target.',
    },
    content: [
      'Column headers are short nouns: "Owner", "Status", "Due".',
      'Right-align numeric columns and use tabular figures so digits line up.',
      'Use absolute timestamps with a relative one as supporting detail, not the other way round.',
      'Never show a count that includes rows the user is not permitted to see.',
    ],
    dos: [
      'Use real table semantics.',
      'Give the scroll container a tabindex and a name.',
      'Announce sort and filter results.',
      'Keep sort, filter and page state in the URL.',
    ],
    donts: [
      'Do not use a table for layout.',
      'Do not make an entire row a link; put the link in the identifying cell.',
      'Do not hide critical columns on narrow screens without an alternative view.',
      'Do not use divs with grid roles unless you are genuinely building a spreadsheet.',
    ],
    html: `<div class="sk-table" role="region" aria-labelledby="projects-caption" tabindex="0">
  <table>
    <caption id="projects-caption" class="sk-table__caption">
      Projects
      <span class="sk-table__caption-detail">128 projects, sorted by name</span>
    </caption>
    <thead>
      <tr>
        <th scope="col" class="sk-table__select-col">
          <label class="sk-checkbox">
            <input type="checkbox" class="sk-checkbox__input" />
            <span class="sk-checkbox__box" aria-hidden="true"></span>
            <span class="sk-visually-hidden">Select all projects on this page</span>
          </label>
        </th>
        <th scope="col" aria-sort="ascending">
          <button type="button" class="sk-table__sort">
            Project name
            <svg aria-hidden="true" focusable="false" width="14" height="14"><use href="#sk-icon-sort-asc" /></svg>
          </button>
        </th>
        <th scope="col">Environment</th>
        <th scope="col">Status</th>
        <th scope="col" class="sk-table__cell--numeric">Records</th>
        <th scope="col"><span class="sk-visually-hidden">Actions</span></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <label class="sk-checkbox">
            <input type="checkbox" class="sk-checkbox__input" />
            <span class="sk-checkbox__box" aria-hidden="true"></span>
            <span class="sk-visually-hidden">Select Website redesign</span>
          </label>
        </td>
        <th scope="row"><a class="sk-link sk-link--quiet" href="/projects/website-redesign">Website redesign</a></th>
        <td>Production</td>
        <td>
          <span class="sk-status sk-status--success">
            <span class="sk-status__dot" aria-hidden="true"></span>
            <span class="sk-status__label">Applied</span>
          </span>
        </td>
        <td class="sk-table__cell--numeric">128</td>
        <td>
          <button type="button" class="sk-icon-button sk-icon-button--sm" aria-haspopup="menu" aria-expanded="false">
            <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-more" /></svg>
            <span class="sk-visually-hidden">Actions for Website redesign</span>
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
<p class="sk-visually-hidden" role="status">Sorted by project name, ascending. 128 projects.</p>`,
    css: `.sk-table {
  /* The table scrolls inside its own container so the page never scrolls
     horizontally — this is what satisfies WCAG 1.4.10 Reflow. */
  inline-size: 100%;
  min-inline-size: 0;
  overflow-x: auto;
  background-color: var(--sk-color-surface-raised);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  border-radius: var(--sk-radius-lg);
}

/* tabindex="0" makes this focusable so keyboard users can scroll it at all. */
.sk-table:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}

.sk-table table { inline-size: 100%; border-collapse: collapse; }

.sk-table__caption {
  padding: var(--sk-space-12) var(--sk-space-16);
  text-align: start;
  font-size: var(--sk-font-size-heading-sm);
  font-weight: var(--sk-font-weight-semibold);
  color: var(--sk-color-text-primary);
}
.sk-table__caption-detail {
  display: block;
  font-size: var(--sk-font-size-body-xs);
  font-weight: var(--sk-font-weight-regular);
  color: var(--sk-color-text-tertiary);
}

.sk-table th,
.sk-table td {
  padding: var(--sk-space-12) var(--sk-space-16);
  text-align: start;
  vertical-align: middle;
  font-size: var(--sk-font-size-body-sm);
  line-height: var(--sk-line-height-body-sm);
}

.sk-table thead th {
  background-color: var(--sk-color-surface-subtle);
  color: var(--sk-color-text-secondary);
  font-weight: var(--sk-font-weight-semibold);
  white-space: nowrap;
}

/* Separators go DARKER on dark, not lighter. Reusing the light-mode rule colour
   produces bright lines that outrank the data itself. */
.sk-table tbody tr { border-block-start: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle); }

.sk-table tbody tr:hover { background-color: var(--sk-color-surface-hover); }

.sk-table tbody tr[aria-selected="true"] {
  background-color: var(--sk-color-surface-selected);
  /* Leading bar, because the tint alone is imperceptible on dark. */
  box-shadow: inset 3px 0 0 0 var(--sk-color-border-brand);
}

.sk-table__cell--numeric { text-align: end; font-variant-numeric: tabular-nums; }
.sk-table__cell--mono { font-family: var(--sk-font-family-mono); font-size: var(--sk-font-size-code-sm); }

/* Cells that can hold long values truncate rather than widening the table. */
.sk-table__cell--truncate {
  max-inline-size: 20rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sk-table__select-col { inline-size: 1px; white-space: nowrap; }

.sk-table__sort {
  display: inline-flex;
  align-items: center;
  gap: var(--sk-space-4);
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: inherit;
  cursor: pointer;
}
.sk-table__sort:hover { color: var(--sk-color-text-primary); }
.sk-table__sort:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
  border-radius: var(--sk-radius-xs);
}
.sk-table__sort > svg { fill: currentColor; opacity: 0.5; }
.sk-table th[aria-sort] .sk-table__sort { color: var(--sk-color-text-primary); }
.sk-table th[aria-sort] .sk-table__sort > svg { opacity: 1; }

/* Striping uses a translucent overlay so it composites correctly on top of
   hover and selection rather than fighting them. */
.sk-table--striped tbody tr:nth-child(even) { background-color: var(--sk-color-surface-hover); }

.sk-table--bordered th,
.sk-table--bordered td { border: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle); }

.sk-table--sticky-head thead th {
  position: sticky;
  inset-block-start: 0;
  z-index: var(--sk-z-sticky);
  /* An explicit border, because a shadow will not separate the header from the
     rows beneath it on a dark page. */
  border-block-end: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
}

.sk-table--compact th, .sk-table--compact td { padding-block: var(--sk-space-8); }
.sk-table--dense th, .sk-table--dense td { padding-block: var(--sk-space-4); padding-inline: var(--sk-space-12); }

.sk-table__empty { padding: 0; }
.sk-table__empty td { padding: 0; }

/* A selected row is a tinted background and nothing else, so in HCM the
   selection disappears completely — including from the bulk action the user is
   about to confirm. */
@media (forced-colors: active) {
  .sk-table tbody tr[aria-selected="true"] { background-color: Highlight; color: HighlightText; }
  .sk-table thead { border-block-end: 1px solid CanvasText; }
  .sk-table tbody tr + tr { border-block-start-color: CanvasText; }
  .sk-table:focus-visible { outline-color: Highlight; }
}
`,
    related: ['pagination', 'checkbox', 'menu', 'empty-state', 'skeleton', 'status-indicator'],
  },

  {
    id: 'card',
    name: 'Card',
    category: 'data-display',
    status: 'stable',
    summary:
      'A bounded container grouping related content about one subject. Cards are containers, not buttons — an entire clickable card creates a hit target that swallows the links inside it.',
    whenToUse: ['Grouping related information about one entity.', 'Grid layouts of comparable items.', 'Sectioning a settings or detail page.'],
    whenNotToUse: [
      'Wrapping everything on a page. Nested cards inside cards inside cards is a sign the hierarchy is unresolved.',
      'Tabular data — use a Table.',
      'A single paragraph.',
    ],
    anatomy: [
      { part: 'Container', required: true, description: 'Raised surface with a border and radius.' },
      { part: 'Header', required: false, description: 'Title, optional description, optional actions.' },
      { part: 'Media', required: false, description: 'Image or chart, edge to edge.' },
      { part: 'Body', required: true, description: 'The content.' },
      { part: 'Footer', required: false, description: 'Actions or metadata, separated by a rule.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-card', description: 'Border and elevation 1.', use: 'Standard.' },
      { name: 'Flat', className: 'sk-card--flat', description: 'Border only, no shadow.', use: 'Dense grids where many shadows create visual noise.' },
      { name: 'Interactive', className: 'sk-card--interactive', description: 'Hover elevation, with one primary link inside it.', use: 'Grids of navigable items — uses the pseudo-element link technique so the card is one target but the inner links still work.' },
      { name: 'Selected', className: 'sk-card--selected', description: 'Brand border plus tint.', use: 'Selectable card grids.' },
    ],
    sizes: [
      { name: 'Compact', className: 'sk-card--compact', height: 'auto', typeStyle: 'body-sm', description: 'Dense grids.' },
      { name: 'Medium', className: '', height: 'auto', typeStyle: 'body-md', description: 'Default.' },
    ],
    states: [
      { name: 'Rest', description: 'Elevation 1.', trigger: 'default' },
      { name: 'Hover', description: 'Interactive variant only: elevation 2 and a stronger border.', trigger: ':hover' },
      { name: 'Focus within', description: 'Ring drawn around the whole card when the primary link inside it has focus.', trigger: ':focus-within' },
      { name: 'Selected', description: 'Brand border and tint.', trigger: '[data-selected]' },
    ],
    props: [
      { name: 'variant', type: "'default' | 'flat' | 'interactive'", default: "'default'", description: 'Treatment.' },
      { name: 'selected', type: 'boolean', default: 'false', description: 'Selection state.' },
      { name: 'as', type: "'div' | 'article' | 'section' | 'li'", default: "'div'", description: 'Element. Use article for self-contained content, li inside a list.' },
    ],
    tokensUsed: ['color-surface-raised', 'color-border-default', 'color-border-brand', 'color-surface-selected', 'elevation-1', 'elevation-2', 'radius-lg'],
    darkMode:
      'A card is a raised surface, so in dark mode it goes *lighter* than the page (neutral-900 on neutral-950) while its shadow does almost nothing. The border therefore carries most of the separation on dark and is not optional. The common failure is a card that is styled with only a shadow: it looks correct in light mode and completely disappears in dark mode.',
    accessibility: {
      role: 'A generic container. Use <article> when the content is self-contained, <li> inside a list, <section> with a heading when it is a labelled region.',
      keyboard: [{ keys: 'Tab', action: 'Reaches the interactive elements inside. The card itself is not focusable.' }],
      aria: [
        'The card title is a real heading at the correct outline level.',
        'For an interactive card, put the link on the title and stretch it with a pseudo-element — never add a click handler to the container, which leaves keyboard users with no way in.',
        'A grid of cards is a <ul> of <li>, so screen readers announce the count.',
        'If a card has no heading, give the container an aria-label; an unlabelled region is a navigation dead end.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.4.6 Headings and Labels.', '2.5.8 Target Size.', '4.1.2 Name, Role, Value.'],
      screenReader: 'Read as its heading and content. In a list, "list, 6 items" is announced first.',
      targetSize: 'The stretched-link technique makes the whole card a target while keeping the accessible name confined to the link text.',
    },
    content: [
      'Card titles name the subject, not the card: "Website redesign", not "Project card".',
      'Keep cards in a grid to a comparable length; wildly ragged cards are hard to scan.',
      'Put the most distinguishing information first.',
    ],
    dos: [
      'Use the stretched-link technique for interactive cards.',
      'Give every card a heading.',
      'Keep a card border in dark mode.',
    ],
    donts: [
      'Do not nest cards more than one level.',
      'Do not put a click handler on the container.',
      'Do not put more than one link in a stretched-link card without raising it above the overlay.',
    ],
    html: `<ul class="sk-card-grid">
  <li>
    <article class="sk-card sk-card--interactive">
      <div class="sk-card__header">
        <h3 class="sk-card__title">
          <!-- Stretched link: the whole card is a target, the accessible name is just this text. -->
          <a class="sk-card__link" href="/projects/website-redesign">Website redesign</a>
        </h3>
        <span class="sk-badge sk-badge--neutral">Production</span>
      </div>
      <div class="sk-card__body">
        <p class="sk-card__description">128 records. Last changed 2 hours ago.</p>
      </div>
      <div class="sk-card__footer">
        <span class="sk-status sk-status--success">
          <span class="sk-status__dot" aria-hidden="true"></span>
          <span class="sk-status__label">Applied</span>
        </span>
      </div>
    </article>
  </li>
</ul>`,
    css: `.sk-card {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  /* Raised surface: lighter than the page in dark mode. */
  background-color: var(--sk-color-surface-raised);
  /* The border is not optional — in dark mode the shadow does almost nothing and
     the border is what separates the card from the page. */
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-radius: var(--sk-radius-lg);
  box-shadow: var(--sk-elevation-1);
  position: relative;
  transition:
    box-shadow var(--sk-duration-fast) var(--sk-easing-standard),
    border-color var(--sk-duration-fast) var(--sk-easing-standard);
}

.sk-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sk-space-8);
  padding: var(--sk-space-16);
  padding-block-end: var(--sk-space-8);
}

.sk-card__title {
  flex: 1 1 auto;
  min-inline-size: 0;
  margin: 0;
  font-size: var(--sk-font-size-heading-sm);
  line-height: var(--sk-line-height-heading-sm);
  font-weight: var(--sk-font-weight-semibold);
  color: var(--sk-color-text-primary);
}

.sk-card__body { flex: 1 1 auto; min-inline-size: 0; padding: var(--sk-space-8) var(--sk-space-16) var(--sk-space-16); }
.sk-card__description { margin: 0; color: var(--sk-color-text-secondary); font-size: var(--sk-font-size-body-sm); }

.sk-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--sk-space-12);
  padding: var(--sk-space-12) var(--sk-space-16);
  border-block-start: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
}

.sk-card__media { inline-size: 100%; block-size: auto; border-radius: var(--sk-radius-lg) var(--sk-radius-lg) 0 0; }

.sk-card--flat { box-shadow: none; }

.sk-card--interactive:hover {
  box-shadow: var(--sk-elevation-2);
  border-color: var(--sk-color-border-interactive);
}

/* Stretched link: one hit target, one accessible name, and inner links still
   work as long as they are given a higher z-index. */
.sk-card__link { color: inherit; text-decoration: none; }
.sk-card__link::after { content: ""; position: absolute; inset: 0; border-radius: inherit; }
.sk-card__link:hover { text-decoration: underline; }

.sk-card--interactive:focus-within {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}
.sk-card__link:focus-visible { outline: none; }

/* Anything that must remain clickable inside a stretched-link card. */
.sk-card__above-link { position: relative; z-index: var(--sk-z-raised); }

.sk-card[data-selected] {
  border-color: var(--sk-color-border-brand);
  background-color: var(--sk-color-surface-selected);
  box-shadow: inset 0 0 0 1px var(--sk-color-border-brand);
}

.sk-card--compact .sk-card__header { padding: var(--sk-space-12); padding-block-end: var(--sk-space-4); }
.sk-card--compact .sk-card__body { padding: var(--sk-space-4) var(--sk-space-12) var(--sk-space-12); }

/* Auto-fitting grid: cards share rows when there is room and stack when there
   is not, with no breakpoints. */
.sk-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(18rem, 100%), 1fr));
  gap: var(--sk-space-16);
  margin: 0;
  padding: 0;
  list-style: none;
}
.sk-card-grid > li { display: flex; min-inline-size: 0; }
.sk-card-grid > li > .sk-card { flex: 1 1 auto; }

@media (prefers-reduced-motion: reduce) { .sk-card { transition: none; } }

/* Cards separate from the page by shadow in light mode and by border in dark.
   HCM has neither unless one is drawn. A selected card loses its tint too. */
@media (forced-colors: active) {
  .sk-card { border: 1px solid CanvasText; }
  .sk-card[data-selected] { outline: 2px solid Highlight; outline-offset: -2px; }
  .sk-card--interactive:focus-within { outline-color: Highlight; }
}
`,
    related: ['stat-tile', 'table', 'badge', 'grid'],
  },

  {
    id: 'stat-tile',
    name: 'Stat tile',
    category: 'data-display',
    status: 'stable',
    summary:
      'A single headline number with its label and, optionally, how it has changed. Built for scanning a dashboard in two seconds.',
    whenToUse: ['Dashboard summaries.', 'Key metrics at the top of a detail page.'],
    whenNotToUse: ['More than about six at once — past that nothing is prominent.', 'Numbers needing context to interpret — use a chart.', 'Values that change so fast the tile flickers.'],
    anatomy: [
      { part: 'Label', required: true, description: 'What is being measured.' },
      { part: 'Value', required: true, description: 'The number, in tabular figures.' },
      { part: 'Unit', required: false, description: 'Smaller, beside the value.' },
      { part: 'Delta', required: false, description: 'Change versus a stated comparison period, with a direction arrow.' },
      { part: 'Comparison label', required: false, description: 'What the delta is against. Mandatory when a delta is shown — a change with no baseline is meaningless.' },
      { part: 'Sparkline', required: false, description: 'A small trend line, aria-hidden with the trend stated in text.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-stat', description: 'Label above value.', use: 'Standard.' },
      { name: 'Carded', className: 'sk-stat--carded', description: 'Wrapped in a card.', use: 'Dashboard grids.' },
      { name: 'With trend', className: 'sk-stat--trend', description: 'Includes a delta and sparkline.', use: 'Metrics tracked over time.' },
    ],
    sizes: [
      { name: 'Medium', className: '', height: 'auto', typeStyle: 'heading-xl value', description: 'Default.' },
      { name: 'Large', className: 'sk-stat--lg', height: 'auto', typeStyle: 'display-lg value', description: 'A single hero metric.' },
    ],
    states: [
      { name: 'Loaded', description: 'Value shown.', trigger: 'default' },
      { name: 'Loading', description: 'Skeleton at the value’s exact dimensions.', trigger: '[aria-busy="true"]' },
      { name: 'Unavailable', description: 'An em dash plus a reason, never a zero. Zero and "unknown" are different facts.', trigger: '[data-unavailable]' },
    ],
    props: [
      { name: 'label', type: 'string', required: true, description: 'Metric name.' },
      { name: 'value', type: 'string | number', required: true, description: 'The value.' },
      { name: 'delta', type: '{value: number, direction: "up" | "down", isGood: boolean}', description: 'Change. isGood is separate from direction because down is good for error rates.' },
      { name: 'comparisonLabel', type: 'string', description: 'Required whenever delta is set.' },
    ],
    tokensUsed: ['color-text-primary', 'color-text-secondary', 'color-status-success-text', 'color-status-danger-text', 'color-surface-raised'],
    darkMode:
      'Delta colours are a trap. Green-up / red-down is not universal and is invisible to many users, so the delta always includes a directional arrow *and* a text description in the accessible name. The colour is chosen by `isGood`, not by direction, and both status text tokens are audited against every surface a tile can sit on in all four themes.',
    accessibility: {
      role: 'A labelled group of text.',
      keyboard: [{ keys: 'n/a', action: 'Not interactive unless it links somewhere.' }],
      aria: [
        'The label and value must be programmatically associated — wrap them in a container with aria-labelledby, or put the whole thing in a description list.',
        'Sparklines are aria-hidden with the trend described in text.',
        'The delta needs a complete accessible description: "up 12 percent versus last week", not "+12%".',
        'Do not use a heading element for the label unless it genuinely belongs in the page outline.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '1.4.1 Use of Color — the arrow, not the colour, carries direction.', '1.4.3 Contrast.'],
      screenReader: 'Reads as "Active projects, 128, up 12 percent versus last week".',
      targetSize: 'Not interactive; when linked, the link owns the target.',
    },
    content: [
      'Labels are short noun phrases: "Active projects".',
      'Abbreviate large numbers consistently and keep the exact value in a title or tooltip.',
      'Always name the comparison period.',
      'Show an em dash for unavailable, never a zero.',
    ],
    dos: ['State the comparison period.', 'Use tabular figures so values do not jitter as they update.', 'Pair colour with an arrow and text.'],
    donts: ['Do not show a delta without a baseline.', 'Do not use green/red as the only signal.', 'Do not show more than six tiles in a row.'],
    html: `<div class="sk-stat sk-stat--carded" role="group" aria-labelledby="stat-projects-label">
  <p class="sk-stat__label" id="stat-projects-label">Active projects</p>
  <p class="sk-stat__value">
    128<span class="sk-stat__unit">projects</span>
  </p>
  <p class="sk-stat__delta sk-stat__delta--good">
    <svg aria-hidden="true" focusable="false" width="14" height="14"><use href="#sk-icon-arrow-up" /></svg>
    <span aria-hidden="true">12%</span>
    <span class="sk-visually-hidden">up 12 percent</span>
    <span class="sk-stat__comparison">vs. last week</span>
  </p>
</div>`,
    css: `.sk-stat { display: flex; flex-direction: column; gap: var(--sk-space-4); min-inline-size: 0; }

.sk-stat--carded {
  padding: var(--sk-space-16);
  background-color: var(--sk-color-surface-raised);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-radius: var(--sk-radius-lg);
}

.sk-stat__label {
  margin: 0;
  font-size: var(--sk-font-size-body-sm);
  color: var(--sk-color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sk-stat__value {
  display: flex;
  align-items: baseline;
  gap: var(--sk-space-6);
  margin: 0;
  font-size: var(--sk-font-size-heading-xl);
  line-height: 1.1;
  font-weight: var(--sk-font-weight-bold);
  color: var(--sk-color-text-primary);
  /* Tabular figures: without them the number jitters as it updates. */
  font-variant-numeric: tabular-nums;
}

.sk-stat__unit {
  font-size: var(--sk-font-size-body-sm);
  font-weight: var(--sk-font-weight-regular);
  color: var(--sk-color-text-tertiary);
}

.sk-stat__delta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sk-space-4);
  margin: 0;
  font-size: var(--sk-font-size-body-sm);
  font-variant-numeric: tabular-nums;
}
.sk-stat__delta > svg { flex: 0 0 auto; fill: currentColor; }

/* Colour follows "is this good", not "which way did it point" — down is good
   for an error rate. The arrow and the hidden text carry direction. */
.sk-stat__delta--good { color: var(--sk-color-status-success-text); }
.sk-stat__delta--bad  { color: var(--sk-color-status-danger-text); }
.sk-stat__delta--flat { color: var(--sk-color-text-tertiary); }

.sk-stat__comparison { color: var(--sk-color-text-tertiary); font-weight: var(--sk-font-weight-regular); }

.sk-stat--lg .sk-stat__value { font-size: var(--sk-font-size-display-lg); }

.sk-stat[data-unavailable] .sk-stat__value { color: var(--sk-color-text-tertiary); }

.sk-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(12rem, 100%), 1fr));
  gap: var(--sk-space-16);
}
/* The delta arrow's colour carries "good" or "bad", and HCM removes it. The
   direction and the visually hidden wording survive, which is why both are
   always present rather than colour alone. */
@media (forced-colors: active) {
  .sk-stat--carded { border-color: CanvasText; }
  .sk-stat__delta > svg { fill: CanvasText; }
}
`,
    related: ['card', 'progress', 'grid'],
  },

  {
    id: 'badge',
    name: 'Badge',
    category: 'data-display',
    status: 'stable',
    summary:
      'A small label marking a category, count or attribute. Not interactive — a badge you can click is a Chip or a Button wearing the wrong style.',
    whenToUse: ['Categorising: environment, record type, plan tier.', 'Counts beside a label.', 'Attributes such as "Beta" or "Deprecated".'],
    whenNotToUse: ['Resource state — use Status indicator, which is built for it.', 'Anything clickable — use a Chip or Button.', 'Long text. A badge holds one or two words.'],
    anatomy: [
      { part: 'Container', required: true, description: 'Pill or rounded rectangle.' },
      { part: 'Label', required: true, description: 'One or two words.' },
      { part: 'Icon', required: false, description: 'Leading, decorative.' },
      { part: 'Dot', required: false, description: 'Leading marker for extra non-colour distinction.' },
    ],
    variants: [
      { name: 'Neutral', className: 'sk-badge--neutral', description: 'Grey.', use: 'Default categorisation.' },
      { name: 'Brand', className: 'sk-badge--brand', description: 'Cobalt.', use: 'Highlighting the current or default item.' },
      { name: 'Success', className: 'sk-badge--success', description: 'Jade.', use: 'Positive attributes.' },
      { name: 'Warning', className: 'sk-badge--warning', description: 'Amber.', use: 'Attention-worthy attributes: Beta, Expiring.' },
      { name: 'Danger', className: 'sk-badge--danger', description: 'Crimson.', use: 'Deprecated, Blocked.' },
      { name: 'Solid', className: 'sk-badge--solid', description: 'Filled rather than tinted.', use: 'Counts on icons and maximum prominence.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-badge--sm', height: '1.25rem', typeStyle: 'body-xs', description: 'Inside table cells.' },
      { name: 'Medium', className: '', height: '1.5rem', typeStyle: 'label-sm', description: 'Default.' },
    ],
    states: [{ name: 'Static', description: 'The only state.', trigger: 'default' }],
    props: [
      { name: 'intent', type: "'neutral' | 'brand' | 'success' | 'warning' | 'danger'", default: "'neutral'", description: 'Colour.' },
      { name: 'solid', type: 'boolean', default: 'false', description: 'Filled instead of tinted.' },
    ],
    tokensUsed: ['color-status-neutral-surface', 'color-status-neutral-text', 'color-status-neutral-border', 'color-surface-brand', 'color-text-on-brand', 'radius-full'],
    darkMode:
      'Tinted badges carry a border in addition to the surface tint. In light mode the tint alone is enough to define the shape; on a dark page a 950-step tint against a 950-step surface has almost no edge, so the border is what makes the badge a discrete object. Solid badges need no border in either theme.',
    accessibility: {
      role: 'Plain text.',
      keyboard: [{ keys: 'n/a', action: 'Not interactive.' }],
      aria: [
        'The badge text must make sense read aloud in place: "Production", not "P".',
        'A count badge on an icon needs the full meaning in the icon button’s accessible name: "Notifications, 3 unread".',
        'Do not use aria-label to replace visible badge text; voice control users say what they see.',
        'Do not rely on colour to distinguish badge meanings — the text does that.',
      ],
      wcag: ['1.4.1 Use of Color.', '1.4.3 Contrast.', '2.5.3 Label in Name.'],
      screenReader: 'Read inline as normal text.',
      targetSize: 'Not interactive.',
    },
    content: ['One or two words, sentence case.', 'Do not abbreviate below recognisability.', 'Keep the badge vocabulary consistent product-wide.'],
    dos: ['Keep badges short.', 'Use the same badge for the same concept everywhere.', 'Give tinted badges a border.'],
    donts: ['Do not make badges clickable.', 'Do not use more than three on one item.', 'Do not use a badge for resource state.'],
    html: `<span class="sk-badge sk-badge--neutral">Production</span>
<span class="sk-badge sk-badge--warning">Beta</span>
<span class="sk-badge sk-badge--brand sk-badge--solid">Default</span>`,
    css: `.sk-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--sk-space-4);
  max-inline-size: 100%;
  min-block-size: 1.5rem;
  padding-inline: var(--sk-space-8);
  border: var(--sk-border-width-hairline) solid transparent;
  border-radius: var(--sk-radius-full);
  font-size: var(--sk-font-size-label-sm);
  line-height: var(--sk-line-height-label-sm);
  font-weight: var(--sk-font-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sk-badge > svg { flex: 0 0 auto; fill: currentColor; }

/* Tinted badges carry a border: on dark, a 950-step tint on a 950-step surface
   has almost no edge without one. */
.sk-badge--neutral { background-color: var(--sk-color-status-neutral-surface); border-color: var(--sk-color-status-neutral-border); color: var(--sk-color-status-neutral-text); }
.sk-badge--success { background-color: var(--sk-color-status-success-surface); border-color: var(--sk-color-status-success-border); color: var(--sk-color-status-success-text); }
.sk-badge--warning { background-color: var(--sk-color-status-warning-surface); border-color: var(--sk-color-status-warning-border); color: var(--sk-color-status-warning-text); }
.sk-badge--danger  { background-color: var(--sk-color-status-danger-surface);  border-color: var(--sk-color-status-danger-border);  color: var(--sk-color-status-danger-text); }
.sk-badge--brand   { background-color: var(--sk-color-surface-brand-subtle);   border-color: var(--sk-color-border-brand);           color: var(--sk-color-text-brand); }

.sk-badge--solid { border-color: transparent; }
.sk-badge--solid.sk-badge--neutral { background-color: var(--sk-color-status-neutral-solid); color: var(--sk-color-status-neutral-on-solid); }
.sk-badge--solid.sk-badge--success { background-color: var(--sk-color-status-success-solid); color: var(--sk-color-status-success-on-solid); }
.sk-badge--solid.sk-badge--warning { background-color: var(--sk-color-status-warning-solid); color: var(--sk-color-status-warning-on-solid); }
.sk-badge--solid.sk-badge--danger  { background-color: var(--sk-color-status-danger-solid);  color: var(--sk-color-status-danger-on-solid); }
.sk-badge--solid.sk-badge--brand   { background-color: var(--sk-color-surface-brand);        color: var(--sk-color-text-on-brand); }

.sk-badge--sm { min-block-size: 1.25rem; padding-inline: var(--sk-space-6); font-size: var(--sk-font-size-body-xs); }

/* Count badge anchored to an icon button. */
.sk-badge--count {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  translate: 35% -35%;
  min-inline-size: 1.125rem;
  min-block-size: 1.125rem;
  padding-inline: var(--sk-space-4);
  justify-content: center;
  font-variant-numeric: tabular-nums;
}
/* A tinted badge is a background plus a border. The tint goes; the border is
   what keeps it a discrete object rather than loose text. A solid badge loses
   its fill entirely and needs one back, or it reads as unstyled. */
@media (forced-colors: active) {
  .sk-badge { border-color: CanvasText; }
  .sk-badge--solid { background-color: CanvasText; color: Canvas; }
  .sk-badge > svg { fill: currentColor; }
}
`,
    related: ['status-indicator', 'card', 'table'],
  },

  {
    id: 'avatar',
    name: 'Avatar',
    category: 'data-display',
    status: 'stable',
    summary:
      'Represents a person or entity as an image or initials. Never the only identifier — an avatar without a name is a guessing game.',
    whenToUse: ['Beside a name in a list, comment or audit entry.', 'The account menu trigger.', 'Stacked groups showing collaborators.'],
    whenNotToUse: ['As the sole identifier of a person.', 'For non-entities. An avatar for a "project" is just an icon.'],
    anatomy: [
      { part: 'Container', required: true, description: 'Circle, or a rounded square for organisations.' },
      { part: 'Image', required: false, description: 'The photo, with a graceful fallback.' },
      { part: 'Initials', required: true, description: 'Fallback when there is no image. Deterministic colour derived from the identifier.' },
      { part: 'Status dot', required: false, description: 'Presence marker, needing its own text.' },
    ],
    variants: [
      { name: 'Circle', className: 'sk-avatar', description: 'People.', use: 'Default.' },
      { name: 'Square', className: 'sk-avatar--square', description: 'Organisations, teams, services.', use: 'Distinguishing a team from a person at a glance.' },
      { name: 'Group', className: 'sk-avatar-group', description: 'Overlapping stack with an overflow count.', use: 'Showing several collaborators compactly.' },
    ],
    sizes: [
      { name: 'Extra small', className: 'sk-avatar--xs', height: '1.25rem', typeStyle: 'body-xs', description: 'Inline in dense text.' },
      { name: 'Small', className: 'sk-avatar--sm', height: '1.75rem', typeStyle: 'body-xs', description: 'Table rows, top bar.' },
      { name: 'Medium', className: '', height: '2.5rem', typeStyle: 'body-sm', description: 'Default.' },
      { name: 'Large', className: 'sk-avatar--lg', height: '4rem', typeStyle: 'heading-sm', description: 'Profile headers.' },
    ],
    states: [
      { name: 'Image', description: 'Photo loaded.', trigger: 'default' },
      { name: 'Initials', description: 'No image, or the image failed to load.', trigger: '[data-fallback]' },
      { name: 'Loading', description: 'Neutral placeholder.', trigger: '[data-loading]' },
    ],
    props: [
      { name: 'name', type: 'string', required: true, description: 'Full name. Drives initials and the accessible name.' },
      { name: 'src', type: 'string', description: 'Image URL.' },
      { name: 'shape', type: "'circle' | 'square'", default: "'circle'", description: 'People versus organisations.' },
      { name: 'decorative', type: 'boolean', default: 'true', description: 'True when the name is already visible beside it, which is the normal case.' },
    ],
    tokensUsed: ['color-surface-sunken', 'color-text-secondary', 'color-border-subtle', 'radius-full'],
    darkMode:
      'Initial-fallback backgrounds are derived deterministically from a hash of the identifier, and must be picked from a theme-aware set — a hash mapped onto fixed hex values will produce unreadable pairings in one theme. Sekura derives them from the chart palette, which is already audited at 3:1 per theme, and pairs each with its own on-solid text token.',
    accessibility: {
      role: '<img> with alt when meaningful, or a decorative span when a visible name accompanies it.',
      keyboard: [{ keys: 'n/a', action: 'Not interactive unless it triggers a menu.' }],
      aria: [
        'When the name is visible beside the avatar, mark the avatar aria-hidden — otherwise screen readers announce the name twice.',
        'When the avatar stands alone, it needs alt text with the full name.',
        'Initials must never be the accessible name: "AK" is not a person.',
        'An avatar group needs a summary: "Andre Kim, Ana Silva and 3 others".',
        'A presence dot needs text: "Online".',
      ],
      wcag: ['1.1.1 Non-text Content.', '1.4.11 Non-text Contrast — the initials must be readable.', '4.1.2 Name, Role, Value.'],
      screenReader: 'Either silent (decorative, name visible nearby) or the full name.',
      targetSize: 'Not interactive; as a menu trigger, the button owns the target.',
    },
    content: ['Use full names in accessible text.', 'Two initials maximum.', 'Group overflow reads "+3" visually and "and 3 others" in text.'],
    dos: ['Mark decorative avatars aria-hidden.', 'Derive fallback colours from the audited chart palette.', 'Always pair an avatar with a visible name where space allows.'],
    donts: ['Do not use initials as the accessible name.', 'Do not rely on an avatar alone to identify someone.', 'Do not use fixed hex fallback colours.'],
    html: `<!-- Name is visible, so the avatar is decorative -->
<span class="sk-avatar-with-name">
  <span class="sk-avatar" data-fallback aria-hidden="true">AK</span>
  <span class="sk-avatar-with-name__label">Andre Kim</span>
</span>

<!-- Standalone: needs alt text -->
<img class="sk-avatar" src="/avatars/ak.jpg" alt="Andre Kim" width="40" height="40" />

<div class="sk-avatar-group">
  <span class="sk-avatar sk-avatar--sm" aria-hidden="true">AK</span>
  <span class="sk-avatar sk-avatar--sm" aria-hidden="true">AS</span>
  <span class="sk-avatar sk-avatar--sm sk-avatar--overflow" aria-hidden="true">+3</span>
  <span class="sk-visually-hidden">Andre Kim, Ana Silva and 3 others</span>
</div>`,
    css: `.sk-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  inline-size: 2.5rem;
  block-size: 2.5rem;
  border-radius: var(--sk-radius-full);
  background-color: var(--sk-color-surface-sunken);
  color: var(--sk-color-text-secondary);
  font-size: var(--sk-font-size-body-sm);
  font-weight: var(--sk-font-weight-semibold);
  text-transform: uppercase;
  overflow: hidden;
  object-fit: cover;
  /* A hairline ring so a light avatar on a light page, or a dark one on a dark
     page, still reads as a distinct object. */
  box-shadow: inset 0 0 0 1px var(--sk-color-border-subtle);
}

.sk-avatar--square { border-radius: var(--sk-radius-md); }
.sk-avatar--xs { inline-size: 1.25rem; block-size: 1.25rem; font-size: 0.625rem; }
.sk-avatar--sm { inline-size: 1.75rem; block-size: 1.75rem; font-size: var(--sk-font-size-body-xs); }
.sk-avatar--lg { inline-size: 4rem; block-size: 4rem; font-size: var(--sk-font-size-heading-sm); }

/* Fallback tints come from the chart palette rather than from fixed hex values
   that break in one theme. The initials are TEXT, so each tint is paired with
   its audited on-solid colour (4.5:1) rather than assuming white: white on
   chart-2 reaches only 3.46:1 in light mode, which is a real WCAG 1.4.3
   failure and is what this pairing exists to prevent. */
.sk-avatar[data-tint="1"] { background-color: var(--sk-color-chart-1); color: var(--sk-color-chart-1-on-solid); }
.sk-avatar[data-tint="2"] { background-color: var(--sk-color-chart-2); color: var(--sk-color-chart-2-on-solid); }
.sk-avatar[data-tint="3"] { background-color: var(--sk-color-chart-3); color: var(--sk-color-chart-3-on-solid); }
.sk-avatar[data-tint="4"] { background-color: var(--sk-color-chart-4); color: var(--sk-color-chart-4-on-solid); }
.sk-avatar[data-tint="5"] { background-color: var(--sk-color-chart-5); color: var(--sk-color-chart-5-on-solid); }
.sk-avatar[data-tint="6"] { background-color: var(--sk-color-chart-6); color: var(--sk-color-chart-6-on-solid); }

.sk-avatar-with-name {
  display: inline-flex;
  align-items: center;
  gap: var(--sk-space-8);
  min-inline-size: 0;
}
.sk-avatar-with-name__label { min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.sk-avatar-group { display: inline-flex; align-items: center; }
.sk-avatar-group > .sk-avatar:not(:first-child) { margin-inline-start: -0.5rem; }
/* Ring in the page colour so overlapping avatars stay separable in both themes. */
.sk-avatar-group > .sk-avatar { box-shadow: 0 0 0 2px var(--sk-color-surface-base), inset 0 0 0 1px var(--sk-color-border-subtle); }
.sk-avatar--overflow { background-color: var(--sk-color-surface-sunken); color: var(--sk-color-text-secondary); }
/* Initials on a tint. HCM discards the tint, so the initials would sit on the
   page background with only the inset ring to bound them — forced to a real
   border here so the avatar stays a distinct object. */
@media (forced-colors: active) {
  .sk-avatar { border: 1px solid CanvasText; background-color: Canvas; color: CanvasText; }
}
`,
    related: ['badge', 'top-bar', 'table'],
  },

  {
    id: 'description-list',
    name: 'Description list',
    category: 'data-display',
    status: 'stable',
    summary:
      'Key–value pairs for the attributes of a single object. The right structure for a detail page, where a table would be wrong because there is only one row.',
    whenToUse: ['Detail page metadata.', 'Summary panels before a confirmation.', 'Any label-and-value set about one entity.'],
    whenNotToUse: ['Multiple objects — use a Table.', 'Editable values — use a form.'],
    anatomy: [
      { part: 'List', required: true, description: 'A real <dl>.' },
      { part: 'Terms', required: true, description: '<dt> — the attribute names.' },
      { part: 'Details', required: true, description: '<dd> — the values.' },
      { part: 'Groups', required: false, description: '<div> wrapping each pair, which is valid and makes flex layout straightforward.' },
    ],
    variants: [
      { name: 'Stacked', className: 'sk-dl', description: 'Term above value.', use: 'Narrow columns and side panels.' },
      { name: 'Inline', className: 'sk-dl--inline', description: 'Term and value on one line.', use: 'Compact summaries.' },
      { name: 'Columns', className: 'sk-dl--columns', description: 'Fixed term column with values alongside.', use: 'Wide detail pages.' },
    ],
    sizes: [
      { name: 'Compact', className: 'sk-dl--compact', height: 'auto', typeStyle: 'body-sm', description: 'Dense panels.' },
      { name: 'Medium', className: '', height: 'auto', typeStyle: 'body-md', description: 'Default.' },
    ],
    states: [
      { name: 'Static', description: 'Normal.', trigger: 'default' },
      { name: 'Empty value', description: 'An em dash with a visually hidden "Not set", so the absence is announced rather than skipped.', trigger: '[data-empty]' },
    ],
    props: [
      { name: 'items', type: 'Array<{term, value}>', required: true, description: 'The pairs.' },
      { name: 'layout', type: "'stacked' | 'inline' | 'columns'", default: "'stacked'", description: 'Arrangement.' },
    ],
    tokensUsed: ['color-text-secondary', 'color-text-primary', 'color-border-subtle', 'space-8', 'space-16'],
    darkMode: 'Terms use text-secondary and values text-primary in both themes. The important detail is that the dividing rules between pairs use border-subtle and therefore go darker on dark, matching Table.',
    accessibility: {
      role: 'Native <dl>, <dt>, <dd>.',
      keyboard: [{ keys: 'n/a', action: 'Not interactive.' }],
      aria: [
        'Only <dt>, <dd> and <div> may be direct children of a <dl>. Anything else breaks the semantics.',
        'One term may have several details, and several terms may share one detail.',
        'An empty value needs text, not just a dash — a screen reader announces nothing for a bare em dash.',
        'Do not use a dl for layout.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '1.3.2 Meaningful Sequence.'],
      screenReader: 'Announced as "description list, N items", then each term and detail pair.',
      targetSize: 'Not interactive.',
    },
    content: ['Terms are short nouns without a trailing colon.', 'Order by importance, not alphabetically.', 'Use consistent formatting for dates, sizes and durations.'],
    dos: ['Use real dl semantics.', 'Give empty values readable text.', 'Keep term wording identical to the equivalent form labels.'],
    donts: ['Do not use a dl for two-column layout.', 'Do not put a bare dash for missing values.', 'Do not nest a dl inside a dd without good reason.'],
    html: `<dl class="sk-dl sk-dl--columns">
  <div class="sk-dl__group">
    <dt class="sk-dl__term">Project name</dt>
    <dd class="sk-dl__detail"><code class="sk-code">Website redesign</code></dd>
  </div>
  <div class="sk-dl__group">
    <dt class="sk-dl__term">Environment</dt>
    <dd class="sk-dl__detail">Production</dd>
  </div>
  <div class="sk-dl__group">
    <dt class="sk-dl__term">Last change</dt>
    <dd class="sk-dl__detail">
      <time datetime="2026-08-04T09:12:00Z">4 August 2026, 09:12 UTC</time>
    </dd>
  </div>
  <div class="sk-dl__group" data-empty>
    <dt class="sk-dl__term">Description</dt>
    <dd class="sk-dl__detail">
      <span aria-hidden="true">—</span>
      <span class="sk-visually-hidden">Not set</span>
    </dd>
  </div>
</dl>`,
    css: `.sk-dl { display: flex; flex-direction: column; gap: var(--sk-space-16); margin: 0; min-inline-size: 0; }

.sk-dl__group { display: flex; flex-direction: column; gap: var(--sk-space-2); min-inline-size: 0; }

.sk-dl__term {
  font-size: var(--sk-font-size-body-sm);
  color: var(--sk-color-text-secondary);
}

.sk-dl__detail {
  margin: 0;
  min-inline-size: 0;
  color: var(--sk-color-text-primary);
  overflow-wrap: anywhere;
}

.sk-dl[data-empty] .sk-dl__detail,
.sk-dl__group[data-empty] .sk-dl__detail { color: var(--sk-color-text-tertiary); }

/* Inline: wraps to stacked automatically when the row cannot hold both. */
.sk-dl--inline .sk-dl__group {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--sk-space-8);
}
.sk-dl--inline .sk-dl__term { flex: 0 0 auto; }
.sk-dl--inline .sk-dl__detail { flex: 1 1 8rem; min-inline-size: 0; }

.sk-dl--columns { gap: 0; }
.sk-dl--columns .sk-dl__group {
  flex-direction: column;
  padding-block: var(--sk-space-12);
  border-block-start: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
}
.sk-dl--columns .sk-dl__group:first-child { border-block-start: none; }

@media (min-width: 48rem) {
  .sk-dl--columns .sk-dl__group { flex-direction: row; align-items: baseline; gap: var(--sk-space-24); }
  .sk-dl--columns .sk-dl__term { flex: 0 0 12rem; }
  .sk-dl--columns .sk-dl__detail { flex: 1 1 auto; min-inline-size: 0; }
}

.sk-dl--compact { gap: var(--sk-space-8); font-size: var(--sk-font-size-body-sm); }
/* The divided variant's rule is on border-block-START; setting the end edge
   here would be a no-op that still reads as coverage. */
@media (forced-colors: active) {
  .sk-dl__group { border-block-start-color: CanvasText; }
}
`,
    related: ['table', 'card', 'page-header'],
  },

  {
    id: 'code-block',
    name: 'Code block',
    category: 'data-display',
    status: 'stable',
    summary:
      'Displays code, configuration or structured output as monospace text. Includes copy-to-clipboard, because the reason users look at a code block is usually to take it somewhere else.',
    whenToUse: ['Configuration, API examples, task exports, logs.', 'Any output where whitespace and exact characters matter.'],
    whenNotToUse: ['A single identifier inline — use inline code.', 'Editable content — use a monospace Textarea or an editor.'],
    anatomy: [
      { part: 'Container', required: true, description: 'Sunken surface with a border.' },
      { part: 'Header', required: false, description: 'Language label and filename.' },
      { part: 'Copy button', required: true, description: 'With a confirmed state announced politely.' },
      { part: 'Code', required: true, description: '<pre><code>, horizontally scrollable and focusable.' },
      { part: 'Line numbers', required: false, description: 'CSS-generated so they are never copied with the code.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-code-block', description: 'Sunken with a border.', use: 'Standard.' },
      { name: 'Terminal', className: 'sk-code-block--terminal', description: 'Inverse surface.', use: 'Shell commands and live output.' },
      { name: 'Diff', className: 'sk-code-block--diff', description: 'Added and removed line markers.', use: 'Change previews — the marker character, not the colour, carries the meaning.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-code-block--sm', height: 'auto', typeStyle: 'code-sm', description: 'Inside cards.' },
      { name: 'Medium', className: '', height: 'auto', typeStyle: 'code-md', description: 'Default.' },
    ],
    states: [
      { name: 'Rest', description: 'Normal.', trigger: 'default' },
      { name: 'Copied', description: 'Button shows a tick for two seconds and announces "Copied".', trigger: '[data-copied]' },
      { name: 'Overflowing', description: 'Horizontal scroll with a focusable container.', trigger: '[data-overflow]' },
    ],
    props: [
      { name: 'language', type: 'string', description: 'Shown in the header and used for highlighting.' },
      { name: 'showLineNumbers', type: 'boolean', default: 'false', description: 'CSS counters, never real text.' },
      { name: 'wrap', type: 'boolean', default: 'false', description: 'Wrap long lines instead of scrolling.' },
    ],
    tokensUsed: ['color-surface-sunken', 'color-text-code', 'color-border-default', 'color-surface-inverse', 'radius-md', 'font-family-mono'],
    darkMode:
      'Syntax highlighting must be defined per theme; a light-mode highlight palette on a dark background is the single most common dark-mode failure in developer tools. Sekura maps highlight roles (keyword, string, number, comment, function) onto the chart palette, which is already audited per theme, so highlighted code inherits verified contrast rather than needing a second audit. Comments are the risky role — they are intentionally low-emphasis, so they use text-tertiary, which is still held to 4.5:1.',
    accessibility: {
      role: '<pre><code>. The scroll container needs tabindex="0" and a label.',
      keyboard: [
        { keys: 'Tab', action: 'Reaches the copy button and the scroll container.' },
        { keys: 'Arrow keys', action: 'Scroll the code when the container has focus.' },
      ],
      aria: [
        'The scrollable region needs tabindex="0", role="region" and an accessible name, or keyboard users cannot scroll it (WCAG 2.1.1).',
        'Copy confirmation goes in a polite live region; do not change the button’s accessible name.',
        'Line numbers must be CSS-generated so they are excluded from both the copy and the screen reader output.',
        'Diff markers need a text character (+ / -), not just a background colour.',
        'Long code blocks benefit from a preceding description of what the code does.',
      ],
      wcag: ['1.4.10 Reflow.', '2.1.1 Keyboard.', '1.4.1 Use of Color — for diffs.', '4.1.3 Status Messages.'],
      screenReader: 'Read as preformatted text. Screen readers may read punctuation verbatim, which is correct for code.',
      targetSize: 'The copy button meets minimums.',
    },
    content: [
      'Use placeholder values that are obviously placeholders: Website redesign, 192.0.2.10, YOUR_API_KEY.',
      'Never include real credentials, hostnames or customer data in an example.',
      'Label the language.',
    ],
    dos: ['Make the scroll region focusable and named.', 'Generate line numbers in CSS.', 'Announce copy success politely.'],
    donts: ['Do not put real secrets in examples.', 'Do not rely on colour alone in diffs.', 'Do not make code text smaller than 13px.'],
    html: `<figure class="sk-code-block">
  <figcaption class="sk-code-block__header">
    <span class="sk-code-block__language">task export</span>
    <button type="button" class="sk-button sk-button--ghost sk-button--sm sk-code-block__copy">
      <svg aria-hidden="true" focusable="false" width="14" height="14"><use href="#sk-icon-copy" /></svg>
      Copy
    </button>
  </figcaption>
  <div class="sk-code-block__scroll" tabindex="0" role="region" aria-label="Task export example">
<pre class="sk-code-block__pre"><code>project:  website-redesign
  due:      2026-08-21</code></pre>
  </div>
</figure>
<p class="sk-visually-hidden" role="status" id="copy-status"></p>`,
    css: `.sk-code-block {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  margin: 0;
  background-color: var(--sk-color-surface-sunken);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-radius: var(--sk-radius-md);
  overflow: hidden;
}

.sk-code-block__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--sk-space-8);
  padding: var(--sk-space-6) var(--sk-space-8) var(--sk-space-6) var(--sk-space-12);
  border-block-end: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
}

.sk-code-block__language {
  font-size: var(--sk-font-size-body-xs);
  color: var(--sk-color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: var(--sk-letter-spacing-overline);
}

/* tabindex="0" on this container is what lets a keyboard user scroll wide code. */
.sk-code-block__scroll { min-inline-size: 0; overflow-x: auto; }
.sk-code-block__scroll:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: -2px;
}

.sk-code-block__pre {
  margin: 0;
  padding: var(--sk-space-12) var(--sk-space-16);
  font-family: var(--sk-font-family-mono);
  font-size: var(--sk-font-size-code-md);
  line-height: var(--sk-line-height-code-md);
  color: var(--sk-color-text-code);
  tab-size: 2;
}

.sk-code-block--wrap .sk-code-block__pre { white-space: pre-wrap; overflow-wrap: anywhere; }

/* Line numbers as CSS counters: never selected, never copied, never announced. */
.sk-code-block--numbered .sk-code-block__pre { counter-reset: sk-line; }
.sk-code-block--numbered .sk-code-block__pre .line::before {
  counter-increment: sk-line;
  content: counter(sk-line);
  display: inline-block;
  inline-size: 2.5rem;
  margin-inline-end: var(--sk-space-16);
  text-align: end;
  color: var(--sk-color-text-tertiary);
  user-select: none;
}

.sk-code-block--terminal { background-color: var(--sk-color-surface-inverse); }
.sk-code-block--terminal .sk-code-block__pre { color: var(--sk-color-text-on-inverse); }

/* Diff markers are text characters, so the meaning survives without colour. */
.sk-code-block--diff .line-added    { background-color: var(--sk-color-status-success-surface); }
.sk-code-block--diff .line-removed  { background-color: var(--sk-color-status-danger-surface); }
.sk-code-block--diff .line-added::before   { content: "+ "; color: var(--sk-color-status-success-text); }
.sk-code-block--diff .line-removed::before { content: "- "; color: var(--sk-color-status-danger-text); }

/* Syntax roles map onto the audited chart palette, so highlighted code inherits
   verified per-theme contrast instead of needing a separate audit. */
.sk-code-block .tok-keyword  { color: var(--sk-color-chart-5); }
.sk-code-block .tok-string   { color: var(--sk-color-chart-6); }
.sk-code-block .tok-number   { color: var(--sk-color-chart-3); }
.sk-code-block .tok-function { color: var(--sk-color-chart-1); }
.sk-code-block .tok-comment  { color: var(--sk-color-text-tertiary); font-style: italic; }

.sk-code-block--sm .sk-code-block__pre { font-size: var(--sk-font-size-code-sm); }

/* Inline code, for identifiers inside a sentence. */
.sk-code {
  padding-inline: var(--sk-space-4);
  padding-block: 0.1em;
  background-color: var(--sk-color-surface-sunken);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  border-radius: var(--sk-radius-xs);
  font-family: var(--sk-font-family-mono);
  font-size: 0.9em;
  color: var(--sk-color-text-code);
  overflow-wrap: anywhere;
}
@media (forced-colors: active) {
  .sk-code-block { border-color: CanvasText; }
  .sk-code-block__header { border-block-end-color: CanvasText; }
  .sk-code-block__scroll:focus-visible { outline-color: Highlight; }
}
`,
    related: ['textarea', 'kbd', 'card'],
  },

  {
    id: 'kbd',
    name: 'Keyboard key',
    category: 'data-display',
    status: 'stable',
    summary: 'Renders a keyboard key or chord in text, so shortcuts are visually distinct from surrounding prose.',
    whenToUse: ['Documenting shortcuts.', 'Menu shortcut hints.', 'Onboarding hints.'],
    whenNotToUse: ['Code — use inline code.', 'Buttons.'],
    anatomy: [
      { part: 'Key', required: true, description: 'A <kbd> element styled as a physical key.' },
      { part: 'Chord', required: false, description: 'Several <kbd> elements joined by a "+".' },
    ],
    variants: [
      { name: 'Default', className: 'sk-kbd', description: 'Raised key.', use: 'Standard.' },
      { name: 'Quiet', className: 'sk-kbd--quiet', description: 'Flat, no shadow.', use: 'Inside menus, where a raised key competes with the menu item.' },
    ],
    sizes: [{ name: 'Small', className: '', height: '1.25rem', typeStyle: 'body-xs', description: 'The only size — a key should never dominate its sentence.' }],
    states: [{ name: 'Static', description: 'The only state.', trigger: 'default' }],
    props: [
      { name: 'keys', type: 'string[]', required: true, description: 'Keys in the chord. "Mod" resolves to Cmd on macOS and Ctrl elsewhere.' },
    ],
    tokensUsed: ['color-surface-raised', 'color-border-default', 'color-text-secondary', 'radius-sm', 'font-family-mono'],
    darkMode:
      'The raised-key effect comes from a bottom border plus a small shadow. On dark the shadow is invisible, so the bottom border does all the work and is stepped to border-default rather than border-subtle. Without that adjustment a kbd on dark looks like a flat grey rectangle.',
    accessibility: {
      role: 'Native <kbd>.',
      keyboard: [{ keys: 'n/a', action: 'Not interactive.' }],
      aria: [
        'Resolve platform-specific keys in the rendered text, not in an aria-label — users need to see the right key for their platform.',
        'Spell out symbol keys so they are announced usefully: "Command" rather than a bare ⌘ glyph.',
        'Do not put a "+" inside a kbd; it is a separator, not a key.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '1.4.3 Contrast.'],
      screenReader: 'Read as text. Symbol glyphs may be skipped, which is why spelled-out names matter.',
      targetSize: 'Not interactive.',
    },
    content: ['Match the user’s platform.', 'Use full key names: "Escape", not "Esc", where space allows.', 'Keep chords to three keys.'],
    dos: ['Detect the platform and render the right modifier.', 'Use a real <kbd>.'],
    donts: ['Do not put the separator inside the kbd.', 'Do not use kbd for button labels.'],
    html: `<p>Press <kbd class="sk-kbd">Ctrl</kbd> + <kbd class="sk-kbd">K</kbd> to open the command palette.</p>
<p>Press <kbd class="sk-kbd">Escape</kbd> to close.</p>`,
    css: `.sk-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 1.5rem;
  min-block-size: 1.25rem;
  padding-inline: var(--sk-space-6);
  background-color: var(--sk-color-surface-raised);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  /* The bottom border creates the key depth. On dark the shadow is invisible,
     so this border is the whole effect. */
  border-block-end-width: var(--sk-border-width-thick);
  border-radius: var(--sk-radius-sm);
  box-shadow: 0 1px 0 0 var(--sk-color-border-default);
  font-family: var(--sk-font-family-mono);
  font-size: var(--sk-font-size-body-xs);
  line-height: 1;
  color: var(--sk-color-text-secondary);
  white-space: nowrap;
}

.sk-kbd--quiet { box-shadow: none; border-block-end-width: var(--sk-border-width-hairline); background-color: transparent; }
/* A key cap is a background, a border and a shadow. Two of the three go, so
   the border has to carry the whole "this is a key" reading. */
@media (forced-colors: active) {
  .sk-kbd { border-color: CanvasText; background-color: Canvas; color: CanvasText; }
}
`,
    related: ['code-block', 'menu', 'command-palette'],
  },

  {
    id: 'timeline',
    name: 'Timeline',
    category: 'data-display',
    status: 'beta',
    summary: 'A chronological sequence of events with actor, time and outcome. Built for audit trails and change histories.',
    whenToUse: ['Audit logs and change history.', 'Operation progress with several sub-steps.', 'Activity feeds on a detail page.'],
    whenNotToUse: ['Data users need to sort or filter across columns — use a Table.', 'Fewer than three events.'],
    anatomy: [
      { part: 'List', required: true, description: 'An <ol>, newest first or oldest first — but consistently one of the two.' },
      { part: 'Marker', required: true, description: 'A dot or icon indicating the event type.' },
      { part: 'Connector', required: true, description: 'A line joining markers, aria-hidden.' },
      { part: 'Timestamp', required: true, description: 'Absolute, machine-readable in a <time datetime>.' },
      { part: 'Actor', required: true, description: 'Who or what caused the event.' },
      { part: 'Content', required: true, description: 'What happened, optionally with a diff.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-timeline', description: 'Marker rail with content alongside.', use: 'Standard.' },
      { name: 'Compact', className: 'sk-timeline--compact', description: 'One line per event.', use: 'Long histories.' },
      { name: 'Grouped', className: 'sk-timeline--grouped', description: 'Date headings between groups.', use: 'Histories spanning many days.' },
    ],
    sizes: [{ name: 'Medium', className: '', height: 'auto', typeStyle: 'body-sm', description: 'The only size.' }],
    states: [
      { name: 'Complete', description: 'Settled event.', trigger: 'default' },
      { name: 'In progress', description: 'Pulsing marker.', trigger: '[data-pending]' },
      { name: 'Failed', description: 'Crimson marker with a warning glyph.', trigger: '[data-failed]' },
    ],
    props: [
      { name: 'events', type: 'Array<{id, at, actor, type, summary, detail?}>', required: true, description: 'The events.' },
      { name: 'order', type: "'newest-first' | 'oldest-first'", default: "'newest-first'", description: 'Direction.' },
    ],
    tokensUsed: ['color-border-subtle', 'color-status-success-solid', 'color-status-danger-solid', 'color-text-tertiary', 'radius-full'],
    darkMode: 'The connector rail uses border-subtle and therefore goes darker on dark, matching Table rules. Event markers reuse the status solid tokens, which are audited at 3:1 per theme, so they remain perceptible against the rail and the page.',
    accessibility: {
      role: '<ol> of <li>.',
      keyboard: [{ keys: 'Tab', action: 'Reaches any links or expand controls inside events.' }],
      aria: [
        'Timestamps use <time datetime="..."> with an ISO value, and human-readable visible text.',
        'The connector and markers are aria-hidden; the event type must be in the text.',
        'State the order in a visible heading — "Newest first" — so it is not a guess.',
        'For live-updating timelines, announce new events politely and do not steal focus.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '1.3.2 Meaningful Sequence.', '1.4.1 Use of Color.', '4.1.3 Status Messages.'],
      screenReader: 'Announced as "list, N items" then each event as a sentence.',
      targetSize: 'Interactive elements inside events meet minimums.',
    },
    content: [
      'Write events as complete sentences: "Ana Silva moved Pricing table variants to 13 August."',
      'Use absolute timestamps with the user’s timezone; put relative time in supporting text.',
      'Name the actor, including system actors: "Automatic retry".',
    ],
    dos: ['Use <time datetime>.', 'State the sort order visibly.', 'Put the event type in the text, not only the marker.'],
    donts: ['Do not use relative time alone.', 'Do not rely on marker colour to convey the event type.', 'Do not mix sort orders within one timeline.'],
    html: `<ol class="sk-timeline">
  <li class="sk-timeline__event">
    <span class="sk-timeline__marker" aria-hidden="true"></span>
    <div class="sk-timeline__content">
      <p class="sk-timeline__summary">
        <strong>Ana Silva</strong> moved <em>Pricing table variants</em> from 11 to 13 August.
      </p>
      <p class="sk-timeline__meta">
        <time datetime="2026-08-04T09:12:00Z">4 August 2026, 09:12 UTC</time>
        · Applied
      </p>
    </div>
  </li>
  <li class="sk-timeline__event" data-failed>
    <span class="sk-timeline__marker" aria-hidden="true"></span>
    <div class="sk-timeline__content">
      <p class="sk-timeline__summary">
        <strong>Automatic retry</strong> failed to apply 2 records.
      </p>
      <p class="sk-timeline__meta">
        <time datetime="2026-08-04T08:40:00Z">4 August 2026, 08:40 UTC</time>
        · Failed
      </p>
    </div>
  </li>
</ol>`,
    css: `.sk-timeline { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; min-inline-size: 0; }

.sk-timeline__event {
  display: flex;
  align-items: flex-start;
  gap: var(--sk-space-12);
  min-inline-size: 0;
  padding-block-end: var(--sk-space-20);
  position: relative;
}

/* Connector rail: border-subtle, so it goes darker on dark like table rules. */
.sk-timeline__event:not(:last-child)::before {
  content: "";
  position: absolute;
  inset-block: 1.25rem 0;
  inset-inline-start: 0.4375rem;
  inline-size: var(--sk-border-width-hairline);
  background-color: var(--sk-color-border-subtle);
}

.sk-timeline__marker {
  flex: 0 0 auto;
  inline-size: 0.9375rem;
  block-size: 0.9375rem;
  margin-block-start: 0.25rem;
  border: var(--sk-border-width-thick) solid var(--sk-color-surface-base);
  border-radius: var(--sk-radius-full);
  background-color: var(--sk-color-status-neutral-solid);
  z-index: var(--sk-z-raised);
}

.sk-timeline__event[data-pending] .sk-timeline__marker {
  background-color: var(--sk-color-status-info-solid);
  animation: sk-status-pulse 1.8s var(--sk-easing-standard) infinite;
}
.sk-timeline__event[data-failed] .sk-timeline__marker { background-color: var(--sk-color-status-danger-solid); }
.sk-timeline__event[data-success] .sk-timeline__marker { background-color: var(--sk-color-status-success-solid); }

.sk-timeline__content { flex: 1 1 auto; min-inline-size: 0; display: flex; flex-direction: column; gap: var(--sk-space-2); }
.sk-timeline__summary { margin: 0; font-size: var(--sk-font-size-body-sm); line-height: var(--sk-line-height-body-sm); color: var(--sk-color-text-primary); }
.sk-timeline__meta { margin: 0; font-size: var(--sk-font-size-body-xs); color: var(--sk-color-text-tertiary); }

.sk-timeline__date-heading {
  margin-block: var(--sk-space-16) var(--sk-space-8);
  font-size: var(--sk-font-size-overline);
  letter-spacing: var(--sk-letter-spacing-overline);
  text-transform: uppercase;
  color: var(--sk-color-text-tertiary);
}

.sk-timeline--compact .sk-timeline__event { padding-block-end: var(--sk-space-8); }

@media (prefers-reduced-motion: reduce) {
  .sk-timeline__event[data-pending] .sk-timeline__marker { animation: none; }
}
/* Event status is a marker colour and nothing else once the connecting line
   loses its own. Markers are redrawn as outlined or filled so pending, failed
   and succeeded stay distinguishable by shape rather than hue. */
@media (forced-colors: active) {
  .sk-timeline__event:not(:last-child)::before { background-color: CanvasText; }
  .sk-timeline__marker { background-color: Canvas; border: 2px solid CanvasText; }
  .sk-timeline__event[data-success] .sk-timeline__marker { background-color: CanvasText; }
  .sk-timeline__event[data-failed] .sk-timeline__marker { background-color: Highlight; }
}
`,
    related: ['status-indicator', 'description-list', 'table'],
  },

  {
    id: 'tree-view',
    name: 'Tree view',
    category: 'data-display',
    status: 'beta',
    summary:
      'A hierarchical, expandable list. Powerful and easy to get wrong — the ARIA tree pattern has a demanding keyboard contract that must be implemented completely or not at all.',
    whenToUse: ['Genuine hierarchies: portfolios and their projects, permission scopes, file trees.', 'Structures users navigate by expanding rather than by searching.'],
    whenNotToUse: [
      'Flat lists.',
      'Hierarchies two levels deep — use grouped lists, which need no custom keyboard model.',
      'Anywhere search would serve better. Most trees are worse than a good search box.',
    ],
    anatomy: [
      { part: 'Tree', required: true, description: 'role="tree", a single tab stop.' },
      { part: 'Groups', required: true, description: 'role="group" for child levels.' },
      { part: 'Items', required: true, description: 'role="treeitem" with aria-expanded on parents.' },
      { part: 'Expand control', required: true, description: 'A chevron, part of the item rather than a separate button.' },
      { part: 'Indent guides', required: false, description: 'Vertical rules showing depth.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-tree', description: 'Single selection.', use: 'Navigation trees.' },
      { name: 'Multi-select', className: 'sk-tree--multi', description: 'Checkboxes with tri-state parents.', use: 'Permission scope selection.' },
    ],
    sizes: [
      { name: 'Compact', className: 'sk-tree--compact', height: '1.75rem rows', typeStyle: 'body-sm', description: 'Deep trees.' },
      { name: 'Medium', className: '', height: '2.25rem rows', typeStyle: 'body-sm', description: 'Default.' },
    ],
    states: [
      { name: 'Collapsed', description: 'aria-expanded="false".', trigger: '[aria-expanded="false"]' },
      { name: 'Expanded', description: 'aria-expanded="true".', trigger: '[aria-expanded="true"]' },
      { name: 'Selected', description: 'aria-selected="true" plus the selected surface and a brand bar.', trigger: '[aria-selected="true"]' },
      { name: 'Focused', description: 'Roving tabindex places focus on exactly one item.', trigger: ':focus' },
      { name: 'Loading children', description: 'aria-busy on the item while children load lazily.', trigger: '[aria-busy="true"]' },
    ],
    props: [
      { name: 'nodes', type: 'TreeNode[]', required: true, description: 'The hierarchy.' },
      { name: 'multiSelect', type: 'boolean', default: 'false', description: 'Checkbox selection.' },
      { name: 'loadChildren', type: '(id) => Promise<TreeNode[]>', description: 'Lazy loading.' },
    ],
    tokensUsed: ['color-surface-selected', 'color-border-brand', 'color-border-subtle', 'color-text-secondary', 'color-focus-ring'],
    darkMode: 'Indent guides use border-subtle and go darker on dark. Selection again pairs the tint with a leading brand bar, because a tint-only selected row is invisible on dark — this is the same rule as Side navigation, Table and Pagination, and it applies everywhere selection is shown.',
    accessibility: {
      role: 'ARIA tree pattern: role="tree", role="treeitem", role="group".',
      keyboard: [
        { keys: 'Tab', action: 'Enter and leave the tree. The whole tree is one tab stop.' },
        { keys: 'Arrow Down / Up', action: 'Move to the next or previous visible item, crossing levels.' },
        { keys: 'Arrow Right', action: 'Expand a collapsed node, or move to its first child if already expanded.' },
        { keys: 'Arrow Left', action: 'Collapse an expanded node, or move to its parent if already collapsed.' },
        { keys: 'Home / End', action: 'First or last visible item.' },
        { keys: 'A–Z', action: 'Type-ahead to the next matching visible item.' },
        { keys: '* (asterisk)', action: 'Expand all siblings at the current level.' },
        { keys: 'Enter', action: 'Activate the item.' },
      ],
      aria: [
        'aria-expanded only on nodes that have children. Putting it on a leaf tells users there is more to find when there is not.',
        'aria-level, aria-setsize and aria-posinset when the DOM structure does not make position derivable.',
        'aria-selected for selection; multi-select needs aria-multiselectable on the tree.',
        'Roving tabindex: exactly one item has tabindex="0".',
        'Implement the full keyboard contract or use a plain nested list instead. A partial tree is worse than no tree.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.1.1 Keyboard.', '2.4.3 Focus Order.', '4.1.2 Name, Role, Value.'],
      screenReader: 'Announced as "tree, N items", then "<label>, tree item, level 2, 3 of 7, expanded".',
      targetSize: 'Rows are at least 28px tall with the full row as the target.',
    },
    content: ['Node labels are the entity name only.', 'Show child counts on collapsed parents.', 'Indicate lazily loaded children with a loading state, not an empty expansion.'],
    dos: ['Implement the whole keyboard contract.', 'Use a roving tabindex.', 'Offer search alongside the tree.'],
    donts: ['Do not use a tree for two-level data.', 'Do not put aria-expanded on leaves.', 'Do not make every item a separate tab stop.'],
    html: `<ul class="sk-tree" role="tree" aria-label="Project hierarchy">
  <li class="sk-tree__item" role="treeitem" aria-expanded="true" aria-selected="false" tabindex="0">
    <span class="sk-tree__row">
      <svg class="sk-tree__chevron" aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-chevron-down" /></svg>
      <span class="sk-tree__label">Website redesign</span>
      <span class="sk-tree__count">3</span>
    </span>
    <ul role="group">
      <li class="sk-tree__item" role="treeitem" aria-selected="true" tabindex="-1">
        <span class="sk-tree__row">
          <span class="sk-tree__chevron-spacer" aria-hidden="true"></span>
          <span class="sk-tree__label">website-redesign</span>
        </span>
      </li>
    </ul>
  </li>
</ul>`,
    css: `.sk-tree { margin: 0; padding: 0; list-style: none; min-inline-size: 0; }
.sk-tree ul[role="group"] {
  margin: 0;
  padding: 0;
  list-style: none;
  /* Indent guide: border-subtle, darker on dark like every other rule. */
  margin-inline-start: var(--sk-space-16);
  border-inline-start: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  padding-inline-start: var(--sk-space-8);
}

.sk-tree__row {
  display: flex;
  align-items: center;
  gap: var(--sk-space-6);
  min-inline-size: 0;
  min-block-size: 2.25rem;
  padding-inline: var(--sk-space-8);
  border-radius: var(--sk-radius-md);
  color: var(--sk-color-text-secondary);
  font-size: var(--sk-font-size-body-sm);
  cursor: pointer;
  position: relative;
}

.sk-tree__row:hover { background-color: var(--sk-color-surface-hover); color: var(--sk-color-text-primary); }

.sk-tree__chevron {
  flex: 0 0 auto;
  fill: currentColor;
  transition: rotate var(--sk-duration-fast) var(--sk-easing-standard);
}
.sk-tree__item[aria-expanded="false"] > .sk-tree__row > .sk-tree__chevron { rotate: -90deg; }
[dir="rtl"] .sk-tree__item[aria-expanded="false"] > .sk-tree__row > .sk-tree__chevron { rotate: 90deg; }
.sk-tree__chevron-spacer { flex: 0 0 auto; inline-size: 1rem; }

.sk-tree__label { flex: 1 1 auto; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sk-tree__count { flex: 0 0 auto; font-size: var(--sk-font-size-body-xs); color: var(--sk-color-text-tertiary); font-variant-numeric: tabular-nums; }

.sk-tree__item[aria-selected="true"] > .sk-tree__row {
  background-color: var(--sk-color-surface-selected);
  color: var(--sk-color-text-brand);
  /* Bar, not tint: the same rule as side nav, tables and pagination. */
  box-shadow: inset 3px 0 0 0 var(--sk-color-border-brand);
}

.sk-tree__item:focus-visible > .sk-tree__row,
.sk-tree__item > .sk-tree__row:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: -2px;
}

.sk-tree--compact .sk-tree__row { min-block-size: 1.75rem; }

@media (prefers-reduced-motion: reduce) { .sk-tree__chevron { transition: none; } }

/* Same failure as the table: selection is a background tint. The indent guides
   also vanish, and without them the hierarchy flattens. */
@media (forced-colors: active) {
  .sk-tree__item[aria-selected="true"] > .sk-tree__row { background-color: Highlight; color: HighlightText; }
  .sk-tree ul[role="group"] { border-inline-start-color: CanvasText; }
  .sk-tree__item:focus-visible > .sk-tree__row { outline-color: Highlight; }
}
`,
    related: ['side-nav', 'menu', 'checkbox'],
  },

  /* ------------------------------------------------------------------ *
   * Disclosure
   * ------------------------------------------------------------------ */
  {
    id: 'disclosure',
    name: 'Disclosure',
    category: 'data-display',
    status: 'stable',
    summary:
      'A single trigger that shows and hides one region of content. The simplest interactive pattern in the system, and the one most often built wrong.',
    whenToUse: [
      'Secondary detail that most readers do not need: advanced options, a long changelog entry, raw output.',
      'Shortening a page whose full content is genuinely optional.',
      'A "show more" affordance on truncated content.',
    ],
    whenNotToUse: [
      'Content most readers do need. Hiding the main thing to make a page look tidy trades a scroll for a click and a guess.',
      'Required form fields. A field nobody expands is a field nobody fills, and validation then fails on something invisible.',
      'Several related sections at one level — use an Accordion, which gives them arrow-key navigation and one tab stop.',
      'Anything that must be found by the browser\'s find-in-page. Collapsed content is only searchable where `hidden="until-found"` is supported.',
    ],
    anatomy: [
      { part: 'Trigger', required: true, description: 'A real <button> carrying aria-expanded and aria-controls.' },
      { part: 'Marker', required: true, description: 'A chevron that rotates. Decorative — the state is carried by aria-expanded, not by the icon.' },
      { part: 'Panel', required: true, description: 'The region, labelled by its trigger and removed from the tree with `hidden` when closed.' },
    ],
    variants: [
      { name: 'Bordered', className: 'sk-disclosure', description: 'Boxed, with a border and a hover surface on the trigger.', use: 'Default. A distinct object on the page.' },
      { name: 'Plain', className: 'sk-disclosure--plain', description: 'No border or background; the trigger is a line of text with a marker.', use: 'Inline inside prose, or nested in a card that already has a border.' },
      { name: 'Findable', className: 'sk-disclosure--findable', description: 'Uses `hidden="until-found"`, so the browser can reveal the panel when the user searches the page.', use: 'Long reference content, FAQs and documentation, where find-in-page is how people navigate.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-disclosure--sm', height: '2rem', typeStyle: 'body-sm', description: 'Inside a card or a dense panel.' },
      { name: 'Medium', className: '', height: '2.75rem', typeStyle: 'body-md', description: 'Default.' },
    ],
    states: [
      { name: 'Collapsed', description: 'Marker points to the inline end. Panel is `hidden`, so it is out of the tab order and the accessibility tree.', trigger: '[aria-expanded="false"]' },
      { name: 'Expanded', description: 'Marker points down. Panel is in flow.', trigger: '[aria-expanded="true"]' },
      { name: 'Hover', description: 'Trigger takes surface-hover.', trigger: ':hover' },
      { name: 'Focus visible', description: 'Focus ring on the trigger, inset so it is not clipped by the border.', trigger: ':focus-visible' },
      { name: 'Found', description: 'Revealed by find-in-page on the findable variant. The browser fires `beforematch` and opens it.', trigger: '[hidden="until-found"]' },
    ],
    props: [
      { name: 'label', type: 'string', required: true, description: 'Trigger text. A noun phrase naming the content, not an instruction.' },
      { name: 'expanded', type: 'boolean', default: 'false', description: 'Initial state.' },
      { name: 'findable', type: 'boolean', default: 'false', description: 'Render the panel with hidden="until-found".' },
      { name: 'onToggle', type: '(expanded: boolean) => void', description: 'Fired after the state changes.' },
    ],
    tokensUsed: ['color-surface-base', 'color-surface-hover', 'color-border-subtle', 'color-text-primary', 'color-text-secondary', 'color-focus-ring'],
    darkMode:
      'The border does the work that the light-mode border and shadow share. border-subtle steps darker (neutral-800) rather than lighter, so the box reads as a boundary and not as a highlight. The hover surface is surface-hover, which on dark is a *lighter* step than the page — the opposite direction from light mode, where hover darkens.',
    accessibility: {
      role: 'A native <button> plus a region. No ARIA role on the panel is needed or wanted; the button carries the state.',
      keyboard: [
        { keys: 'Tab', action: 'Moves to the trigger. The collapsed panel contains no tab stops.' },
        { keys: 'Enter / Space', action: 'Toggles. Free with a real <button>; hand-rolled on a <div>, Space is what everyone forgets.' },
      ],
      aria: [
        'aria-expanded on the trigger, always present and always accurate. This is the state; the chevron is decoration.',
        'aria-controls on the trigger, pointing at the panel id.',
        'aria-labelledby on the panel, pointing back at the trigger, so a user landing in the content knows what it belongs to.',
        'The chevron is aria-hidden. Announcing "chevron" adds nothing to "expanded".',
      ],
      wcag: [
        '2.1.1 Keyboard — a <div> with a click handler is the classic failure.',
        '4.1.2 Name, Role, Value — aria-expanded is the value.',
        '2.4.7 Focus Visible',
        '1.4.13 Content on Hover or Focus — a disclosure opens on click, never on hover. Hover-opened content cannot be dismissed or reached.',
      ],
      screenReader:
        'Announced as "Advanced options, button, collapsed". After activation, "expanded". Because the panel is `hidden` when closed, its content is genuinely absent rather than silently focusable.',
      targetSize: 'The trigger is full width and at least 2.75rem tall, well past the 24x24 minimum of 2.5.8.',
    },
    content: [
      'The trigger names the content, it does not describe the action: "Delivery options", not "Click to see delivery options".',
      'It does not change when the state does. A label that flips between "Show" and "Hide" is read at the moment aria-expanded already said which it is, so it says the same thing twice and contradicts itself in the gap.',
      'If a count is useful, put it in the trigger: "Attachments (3)".',
    ],
    dos: [
      'Use a real <button>.',
      'Keep the label stable across states.',
      'Use `hidden` on the panel, so collapsed content leaves the tab order.',
      'Reach for `hidden="until-found"` on reference content, so find-in-page still works.',
    ],
    donts: [
      'Never hide required form fields behind one.',
      'Never open on hover.',
      'Never animate the panel height with a transition on `height: auto` — it does not animate. Use a grid-rows transition, or none.',
      'Never rely on the chevron alone to convey state.',
    ],
    html: `<div class="sk-disclosure">
  <button type="button" class="sk-disclosure__trigger" id="adv-trigger"
          aria-expanded="false" aria-controls="adv-panel">
    <svg class="sk-disclosure__marker" aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-chevron-right" /></svg>
    <span class="sk-disclosure__label">Advanced options</span>
  </button>
  <div class="sk-disclosure__panel" id="adv-panel" aria-labelledby="adv-trigger" hidden>
    <p>Applies to every task in this project.</p>
  </div>
</div>

<!-- Findable: the browser can open this one from find-in-page. -->
<div class="sk-disclosure sk-disclosure--findable">
  <button type="button" class="sk-disclosure__trigger" id="ref-trigger"
          aria-expanded="false" aria-controls="ref-panel">
    <svg class="sk-disclosure__marker" aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-chevron-right" /></svg>
    <span class="sk-disclosure__label">Field reference</span>
  </button>
  <div class="sk-disclosure__panel" id="ref-panel" aria-labelledby="ref-trigger" hidden="until-found">
    <p>Every field, its type and its default.</p>
  </div>
</div>`,
    css: `.sk-disclosure {
  background-color: var(--sk-color-surface-base);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  border-radius: var(--sk-radius-md);
}
.sk-disclosure + .sk-disclosure { margin-block-start: var(--sk-space-8); }

.sk-disclosure__trigger {
  display: flex;
  align-items: center;
  gap: var(--sk-space-8);
  inline-size: 100%;
  min-block-size: var(--sk-control-height-md);
  padding: var(--sk-space-8) var(--sk-space-16);
  background: none;
  border: none;
  border-radius: inherit;
  font: inherit;
  font-weight: var(--sk-font-weight-medium);
  color: var(--sk-color-text-primary);
  text-align: start;
  cursor: pointer;
}
.sk-disclosure__trigger:hover { background-color: var(--sk-color-surface-hover); }
.sk-disclosure__trigger:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  /* Inset, so the ring is not clipped by the container's own border. */
  outline-offset: calc(var(--sk-focus-ring-offset) * -1);
}

/* The marker rotates from the inline-end direction to down. Using a logical
   start rotation would point the wrong way in RTL; the icon itself is mirrored
   by the sheet's dir-scale, so this stays a single rule. */
.sk-disclosure__marker {
  flex: 0 0 auto;
  color: var(--sk-color-text-secondary);
  transition: transform var(--sk-duration-fast) var(--sk-easing-standard);
  transform: rotate(0deg);
}
.sk-disclosure__trigger[aria-expanded="true"] .sk-disclosure__marker { transform: rotate(90deg); }

.sk-disclosure__label { flex: 1 1 auto; min-inline-size: 0; }

.sk-disclosure__panel {
  padding: 0 var(--sk-space-16) var(--sk-space-16);
  color: var(--sk-color-text-secondary);
}
.sk-disclosure__panel > :first-child { margin-block-start: 0; }
.sk-disclosure__panel > :last-child { margin-block-end: 0; }

.sk-disclosure--plain {
  background: none;
  border: none;
  border-radius: 0;
}
.sk-disclosure--plain .sk-disclosure__trigger { padding-inline: 0; }
.sk-disclosure--plain .sk-disclosure__panel { padding-inline: 0; }

.sk-disclosure--sm .sk-disclosure__trigger {
  min-block-size: var(--sk-control-height-sm);
  font-size: var(--sk-font-size-body-sm);
}

/* Windows High Contrast Mode discards background colours, so the boundary and
   the focus ring have to be redrawn from system colours. */
@media (forced-colors: active) {
  .sk-disclosure { border-color: CanvasText; }
  .sk-disclosure__marker { color: CanvasText; }
  .sk-disclosure__trigger:focus-visible { outline-color: Highlight; }
}

@media (prefers-reduced-motion: reduce) {
  .sk-disclosure__marker { transition: none; }
}`,
    related: ['accordion', 'tabs', 'card'],
  },

  /* ------------------------------------------------------------------ *
   * Accordion
   * ------------------------------------------------------------------ */
  {
    id: 'accordion',
    name: 'Accordion',
    category: 'data-display',
    status: 'stable',
    summary:
      'A vertical group of disclosures sharing one tab stop and arrow-key navigation. Use it for peer sections at one level of a hierarchy.',
    whenToUse: [
      'Three or more peer sections a reader consults selectively: an FAQ, a settings group, a specification broken into parts.',
      'Long reference content where a full page of prose would bury the structure.',
      'Small screens, where content that sits side by side on a wide viewport has to stack.',
    ],
    whenNotToUse: [
      'Two sections. Two disclosures cost less and imply less structure.',
      'Content a reader compares across sections — they will fight the collapse. Show it all, or use a Table.',
      'Alternate views of one subject — use Tabs. An accordion says "these are parts of a whole"; tabs say "these are views of one thing".',
      'Sequential steps — use a Stepper.',
      'A single section — use a Disclosure.',
    ],
    anatomy: [
      { part: 'Container', required: true, description: 'Owns the roving tabindex, so the whole group is one tab stop.' },
      { part: 'Headers', required: true, description: 'A heading element wrapping a real <button>. The heading level must match the surrounding outline.' },
      { part: 'Panels', required: true, description: 'One region per header, labelled by it, `hidden` when collapsed.' },
      { part: 'Expand all', required: false, description: 'A single control for long accordions. Also a strong hint the content should not have been collapsed.' },
    ],
    variants: [
      { name: 'Multiple', className: 'sk-accordion', description: 'Any number of panels open at once.', use: 'Default. Closing something the reader opened is a surprise.' },
      { name: 'Single', className: 'sk-accordion--single', description: 'Opening one closes the others.', use: 'Only when panels are tall enough that two open at once cause real disorientation.' },
      { name: 'Separated', className: 'sk-accordion--separated', description: 'Each item is its own bordered card with a gap between.', use: 'Items that are objects in their own right, such as a list of policies.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-accordion--sm', height: '2rem', typeStyle: 'body-sm', description: 'Inside a card or a drawer.' },
      { name: 'Medium', className: '', height: '2.75rem', typeStyle: 'body-md', description: 'Default.' },
    ],
    states: [
      { name: 'Collapsed', description: 'Panel `hidden`, marker at rest.', trigger: '[aria-expanded="false"]' },
      { name: 'Expanded', description: 'Panel in flow, marker rotated.', trigger: '[aria-expanded="true"]' },
      { name: 'Hover', description: 'Header takes surface-hover.', trigger: ':hover' },
      { name: 'Focus visible', description: 'Focus ring on the header button.', trigger: ':focus-visible' },
      { name: 'Roving', description: 'Exactly one header has tabindex="0"; the rest are -1.', trigger: '[tabindex="0"]' },
    ],
    props: [
      { name: 'items', type: 'Array<{id, label, content, expanded?}>', required: true, description: 'The sections.' },
      { name: 'single', type: 'boolean', default: 'false', description: 'Only one panel open at a time.' },
      { name: 'collapsible', type: 'boolean', default: 'true', description: 'With single, whether the last open panel may be closed.' },
      { name: 'headingLevel', type: '2 | 3 | 4 | 5 | 6', default: '3', description: 'Heading level for the headers. Must fit the page outline, not be chosen for its size.' },
      { name: 'onChange', type: '(openIds: string[]) => void', description: 'Fired with the ids currently open.' },
    ],
    tokensUsed: ['color-surface-base', 'color-surface-hover', 'color-border-subtle', 'color-text-primary', 'color-text-secondary', 'color-focus-ring'],
    darkMode:
      'Dividers between items use border-subtle, which steps *darker* on dark rather than lighter. Reusing the light-mode neutral-200 here produces a set of bright rules that read as more important than the headers they separate — the same rule the Table row divider follows.',
    accessibility: {
      role: 'Headings wrapping native buttons, plus regions. There is no `role="accordion"`; inventing one is a common and harmful mistake.',
      keyboard: [
        { keys: 'Tab', action: 'Moves into the accordion, landing on one header, then straight out to the next control. A ten-item accordion is one tab stop, not ten.' },
        { keys: 'Arrow Down / Up', action: 'Move between headers, wrapping.' },
        { keys: 'Home / End', action: 'First or last header.' },
        { keys: 'Enter / Space', action: 'Toggles the focused section.' },
      ],
      aria: [
        'Each header button carries aria-expanded and aria-controls.',
        'Each panel carries aria-labelledby pointing at its header button.',
        'Header buttons are wrapped in a heading element of the correct level, so the accordion appears in the document outline and a screen reader user can jump between sections by heading.',
        'Roving tabindex across the headers: exactly one is 0, the rest are -1.',
      ],
      wcag: [
        '2.1.1 Keyboard',
        '2.4.3 Focus Order — the roving tabindex must follow visual order.',
        '2.4.6 Headings and Labels — the header text has to describe the section, because it becomes a heading in the outline.',
        '4.1.2 Name, Role, Value',
        '1.3.1 Info and Relationships — headings are what carry the structure to assistive technology.',
      ],
      screenReader:
        'Each header is announced as a heading and a button with its expanded state, so the accordion can be navigated by heading shortcut as well as by arrow key. Collapsed panels are absent from the tree entirely.',
      targetSize: 'Headers are full width and at least 2.75rem tall.',
    },
    content: [
      'Header text describes the section as a heading would, because it is one: "Billing and invoices", not "Click here for billing".',
      'Front-load the distinguishing word. "Delivery options" and "Delivery restrictions" scan badly as a pair; "Options for delivery" and "Restrictions on delivery" scan worse.',
      'Do not number the headers unless the order matters — numbering implies sequence, which is a Stepper.',
    ],
    dos: [
      'Wrap each header button in a heading of the right level.',
      'Default to allowing several panels open.',
      'Keep the group to one tab stop with a roving tabindex.',
      'Open the first panel by default when one section is clearly the common case.',
    ],
    donts: [
      'Never put an accordion inside an accordion. Two levels of collapse is a navigation problem wearing a component.',
      'Never use `role="accordion"` or `role="tablist"` — an accordion is headings and buttons.',
      'Never make every header a tab stop.',
      'Never collapse the only section that matters to make the page look shorter.',
    ],
    html: `<div class="sk-accordion" data-sk-accordion>
  <div class="sk-accordion__item">
    <h3 class="sk-accordion__heading">
      <button type="button" class="sk-accordion__trigger" id="acc-1"
              data-sk-accordion-trigger aria-expanded="true" aria-controls="acc-1-panel">
        <svg class="sk-accordion__marker" aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-chevron-right" /></svg>
        <span class="sk-accordion__label">What happens to my data if I stop paying?</span>
      </button>
    </h3>
    <div class="sk-accordion__panel" id="acc-1-panel" aria-labelledby="acc-1">
      <p>The workspace becomes read-only and export stays enabled indefinitely.</p>
    </div>
  </div>

  <div class="sk-accordion__item">
    <h3 class="sk-accordion__heading">
      <button type="button" class="sk-accordion__trigger" id="acc-2"
              data-sk-accordion-trigger aria-expanded="false" aria-controls="acc-2-panel">
        <svg class="sk-accordion__marker" aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-chevron-right" /></svg>
        <span class="sk-accordion__label">Do you charge per seat?</span>
      </button>
    </h3>
    <div class="sk-accordion__panel" id="acc-2-panel" aria-labelledby="acc-2" hidden>
      <p>No. The price is per workspace.</p>
    </div>
  </div>
</div>`,
    css: `.sk-accordion {
  background-color: var(--sk-color-surface-base);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  border-radius: var(--sk-radius-md);
}

/* A rule between items, not around each one: adjacent borders would double. */
.sk-accordion__item + .sk-accordion__item {
  border-block-start: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
}

/* The heading carries the outline; it must contribute no size of its own, or
   an h3 accordion looks different from an h4 one. */
.sk-accordion__heading {
  margin: 0;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
}

.sk-accordion__trigger {
  display: flex;
  align-items: center;
  gap: var(--sk-space-8);
  inline-size: 100%;
  min-block-size: var(--sk-control-height-md);
  padding: var(--sk-space-8) var(--sk-space-16);
  background: none;
  border: none;
  font: inherit;
  font-weight: var(--sk-font-weight-medium);
  color: var(--sk-color-text-primary);
  text-align: start;
  cursor: pointer;
}
.sk-accordion__trigger:hover { background-color: var(--sk-color-surface-hover); }
.sk-accordion__trigger:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: calc(var(--sk-focus-ring-offset) * -1);
}

.sk-accordion__marker {
  flex: 0 0 auto;
  color: var(--sk-color-text-secondary);
  transition: transform var(--sk-duration-fast) var(--sk-easing-standard);
  transform: rotate(0deg);
}
.sk-accordion__trigger[aria-expanded="true"] .sk-accordion__marker { transform: rotate(90deg); }

.sk-accordion__label { flex: 1 1 auto; min-inline-size: 0; }

.sk-accordion__panel {
  padding: 0 var(--sk-space-16) var(--sk-space-16);
  color: var(--sk-color-text-secondary);
}
.sk-accordion__panel > :first-child { margin-block-start: 0; }
.sk-accordion__panel > :last-child { margin-block-end: 0; }

/* Separated: each item is its own object, so the container border goes away. */
.sk-accordion--separated {
  background: none;
  border: none;
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-8);
}
.sk-accordion--separated .sk-accordion__item {
  background-color: var(--sk-color-surface-base);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  border-radius: var(--sk-radius-md);
}
.sk-accordion--separated .sk-accordion__item + .sk-accordion__item { border-block-start-width: var(--sk-border-width-hairline); }

.sk-accordion--sm .sk-accordion__trigger {
  min-block-size: var(--sk-control-height-sm);
  font-size: var(--sk-font-size-body-sm);
}

@media (forced-colors: active) {
  .sk-accordion,
  .sk-accordion--separated .sk-accordion__item { border-color: CanvasText; }
  .sk-accordion__item + .sk-accordion__item { border-block-start-color: CanvasText; }
  .sk-accordion__marker { color: CanvasText; }
  .sk-accordion__trigger:focus-visible { outline-color: Highlight; }
}

@media (prefers-reduced-motion: reduce) {
  .sk-accordion__marker { transition: none; }
}`,
    related: ['disclosure', 'tabs', 'stepper', 'card'],
  },
];

/**
 * Layout recipes — complete page blueprints.
 *
 * Each recipe is a working skeleton: regions, responsive behaviour, the components
 * involved, and paste-ready markup. All of them are flex-first, so most contain no
 * media query at all.
 */

export interface LayoutRegion {
  name: string;
  description: string;
  /** How this region behaves as space runs out. */
  responsive: string;
}

export interface LayoutRecipe {
  id: string;
  name: string;
  summary: string;
  whenToUse: string[];
  regions: LayoutRegion[];
  /** Component ids used. */
  components: string[];
  /** How the whole layout reflows. */
  responsive: string;
  accessibility: string[];
  darkMode: string;
  html: string;
  css: string;
}

export const layouts: LayoutRecipe[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    summary:
      'An at-a-glance overview: metric tiles, a primary chart, and a recent-activity list. Optimised for a two-second scan, not for deep work.',
    whenToUse: [
      'The landing page after sign-in.',
      'A summary view for a resource or environment.',
      'Anywhere the question is "is everything all right?"',
    ],
    regions: [
      { name: 'Page header', description: 'Title, environment badge, time-range control.', responsive: 'Title and controls share a row, wrapping to stacked below roughly 40rem.' },
      { name: 'Metric row', description: 'Three to six stat tiles.', responsive: 'Auto-fit grid: four across, then two, then one. No breakpoint involved.' },
      { name: 'Primary panel', description: 'The main chart or the most important table.', responsive: 'Full width; the chart scrolls inside its own container if needed.' },
      { name: 'Secondary column', description: 'Recent activity, alerts, quick actions.', responsive: 'Sits beside the primary panel above roughly 64rem, wraps beneath it below that.' },
    ],
    components: ['page-header', 'stat-tile', 'card', 'timeline', 'alert', 'grid', 'sidebar-layout'],
    responsive:
      'Built from an auto-fit Grid for the metric row and a Sidebar layout for the panel row. Both reflow on container width, so the dashboard behaves correctly inside a narrow region as well as at full width — which a viewport-breakpoint layout would not.',
    accessibility: [
      'Each metric tile is a labelled group, so the label and value are programmatically associated.',
      'Charts carry a data table alternative in a disclosure.',
      'Do not auto-refresh visible content without announcing it; a silently changing number is disorienting and can move a click target.',
      'Six tiles maximum. Past that nothing is prominent, which defeats the purpose.',
    ],
    darkMode:
      'Tiles are raised surfaces and go lighter than the page. The chart plot area stays on surface-base rather than the card surface, so series colours are judged against the same background they were audited against.',
    html: `<main class="sk-app-shell__main" id="main" tabindex="-1">
  <div class="sk-app-shell__content sk-stack sk-stack--gap-24">

    <header class="sk-page-header">
      <div class="sk-page-header__main">
        <div class="sk-page-header__titles">
          <div class="sk-page-header__title-row">
            <h1 class="sk-page-header__title">Overview</h1>
            <span class="sk-badge sk-badge--warning">Staging</span>
          </div>
          <p class="sk-page-header__description">Zone and record health across all environments.</p>
        </div>
        <div class="sk-page-header__actions">
          <div class="sk-button-group sk-button-group--segmented" role="radiogroup" aria-label="Time range">
            <button type="button" class="sk-button-group__segment" role="radio" aria-checked="false" tabindex="-1">24h</button>
            <button type="button" class="sk-button-group__segment" role="radio" aria-checked="true"  tabindex="0">7d</button>
            <button type="button" class="sk-button-group__segment" role="radio" aria-checked="false" tabindex="-1">30d</button>
          </div>
        </div>
      </div>
    </header>

    <!-- Auto-fit: 4 across, then 2, then 1, driven by container width -->
    <section class="sk-grid sk-grid--min-12" aria-label="Key metrics">
      <div class="sk-stat sk-stat--carded" role="group" aria-labelledby="m1">
        <p class="sk-stat__label" id="m1">Active zones</p>
        <p class="sk-stat__value">128</p>
        <p class="sk-stat__delta sk-stat__delta--good">
          <svg aria-hidden="true" focusable="false" width="14" height="14"><use href="#sk-icon-arrow-up" /></svg>
          <span aria-hidden="true">12%</span><span class="sk-visually-hidden">up 12 percent</span>
          <span class="sk-stat__comparison">vs. last week</span>
        </p>
      </div>
      <div class="sk-stat sk-stat--carded" role="group" aria-labelledby="m2">
        <p class="sk-stat__label" id="m2">Pending changes</p>
        <p class="sk-stat__value">3</p>
      </div>
      <div class="sk-stat sk-stat--carded" role="group" aria-labelledby="m3">
        <p class="sk-stat__label" id="m3">Failed operations</p>
        <p class="sk-stat__value">1</p>
        <p class="sk-stat__delta sk-stat__delta--bad">
          <svg aria-hidden="true" focusable="false" width="14" height="14"><use href="#sk-icon-arrow-up" /></svg>
          <span aria-hidden="true">1</span><span class="sk-visually-hidden">up by 1</span>
          <span class="sk-stat__comparison">vs. yesterday</span>
        </p>
      </div>
    </section>

    <!-- Sidebar layout: wraps to stacked on container width, no media query -->
    <div class="sk-sidebar-layout sk-sidebar-layout--end">
      <div class="sk-sidebar-layout__content">
        <section class="sk-card">
          <div class="sk-card__header"><h2 class="sk-card__title">Resolution volume</h2></div>
          <div class="sk-card__body">
            <figure>
              <div class="sk-chart" role="img" aria-labelledby="chart-desc"> ... </div>
              <figcaption id="chart-desc">
                Queries rose steadily from 1.2M on 28 July to 1.9M on 4 August, with a
                dip on 1 August.
              </figcaption>
            </figure>
            <details>
              <summary>View as table</summary>
              <div class="sk-table" role="region" aria-label="Resolution volume data" tabindex="0"> ... </div>
            </details>
          </div>
        </section>
      </div>

      <aside class="sk-sidebar-layout__sidebar sk-stack sk-stack--gap-16" aria-label="Recent activity">
        <div class="sk-alert sk-alert--warning">
          <svg class="sk-alert__icon" aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-warning" /></svg>
          <div class="sk-alert__content">
            <p class="sk-alert__body">1 operation failed in the last 24 hours.</p>
          </div>
        </div>
        <section class="sk-card">
          <div class="sk-card__header"><h2 class="sk-card__title">Recent changes</h2></div>
          <div class="sk-card__body"><ol class="sk-timeline"> ... </ol></div>
        </section>
      </aside>
    </div>

  </div>
</main>`,
    css: `/* Nothing bespoke: the recipe is composed entirely from Grid, Sidebar layout
   and Stack, all of which respond to container width rather than the viewport.
   The only rule needed is the chart's own scroll container. */
.sk-chart {
  inline-size: 100%;
  min-inline-size: 0;
  min-block-size: 16rem;
  overflow-x: auto;
}`,
  },

  {
    id: 'list-page',
    name: 'List page',
    summary:
      'A filterable, sortable, paginated table with bulk actions. The workhorse screen of any operational tool.',
    whenToUse: ['Browsing a collection of resources.', 'Anywhere users search, filter and act in bulk.'],
    regions: [
      { name: 'Page header', description: 'Title, count, primary create action.', responsive: 'Wraps to stacked when the row cannot hold both.' },
      { name: 'Toolbar', description: 'Search, filters, view controls, bulk action bar.', responsive: 'A Cluster: wraps to as many rows as needed, never overflows.' },
      { name: 'Table', description: 'The data, in its own scroll container.', responsive: 'Scrolls horizontally inside itself so the page never does.' },
      { name: 'Pagination', description: 'Range status and page controls.', responsive: 'Page numbers hide below 30rem, leaving Previous/Next and the status.' },
    ],
    components: ['page-header', 'search-field', 'popover', 'table', 'pagination', 'checkbox', 'menu', 'empty-state', 'cluster'],
    responsive:
      'The toolbar is a Cluster, so it reflows to multiple rows rather than overflowing. The table gets its own scroll container with tabindex="0" and a name, which is how the page satisfies WCAG 1.4.10 Reflow without hiding columns.',
    accessibility: [
      'Table scroll container needs tabindex="0", role="region" and an accessible name, or keyboard users cannot scroll it.',
      'Announce result counts politely after filtering — the visual change is silent.',
      'The bulk action bar appears on selection and must announce the selected count.',
      'Keep search, filter, sort and page state in the URL so results are shareable and survive a refresh.',
      'Never show a count that includes rows the user is not permitted to see.',
    ],
    darkMode:
      'Row separators go darker, not lighter. Selected rows pair the tint with a 3px leading brand bar, because on dark the tint alone is imperceptible. The sticky header needs an explicit bottom border since a shadow will not separate it from the rows beneath.',
    html: `<main class="sk-app-shell__main" id="main" tabindex="-1">
  <div class="sk-app-shell__content sk-stack sk-stack--gap-16">

    <header class="sk-page-header">
      <div class="sk-page-header__main">
        <div class="sk-page-header__titles">
          <h1 class="sk-page-header__title">Zones</h1>
          <p class="sk-page-header__description">128 zones across 3 environments.</p>
        </div>
        <div class="sk-page-header__actions">
          <button type="button" class="sk-button sk-button--primary">Create zone</button>
        </div>
      </div>
    </header>

    <!-- Cluster: wraps to multiple rows rather than overflowing -->
    <div class="sk-cluster sk-cluster--gap-8" role="search">
      <form class="sk-search sk-search--sm" role="search">
        <label class="sk-visually-hidden" for="q">Search zones</label>
        <svg class="sk-search__icon" aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-search" /></svg>
        <input class="sk-search__input" id="q" type="search" placeholder="Search zones and tags" />
      </form>

      <button type="button" class="sk-button sk-button--secondary sk-button--sm"
              popovertarget="filters" aria-expanded="false">
        <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-filter" /></svg>
        Filters
        <span class="sk-badge sk-badge--brand sk-badge--sm">2</span>
      </button>

      <span class="sk-cluster__push"></span>

      <div class="sk-button-group sk-button-group--segmented" role="radiogroup" aria-label="Density">
        <button type="button" class="sk-button-group__segment" role="radio" aria-checked="true" tabindex="0">Comfortable</button>
        <button type="button" class="sk-button-group__segment" role="radio" aria-checked="false" tabindex="-1">Compact</button>
      </div>
    </div>

    <!-- Appears only when rows are selected -->
    <div class="sk-bulk-bar sk-cluster sk-cluster--gap-12" role="region" aria-label="Bulk actions" hidden>
      <span class="sk-bulk-bar__count" role="status">3 zones selected</span>
      <button type="button" class="sk-button sk-button--secondary sk-button--sm">Add tag</button>
      <button type="button" class="sk-button sk-button--danger-ghost sk-button--sm">Delete 3 zones</button>
      <button type="button" class="sk-button sk-button--ghost sk-button--sm sk-cluster__push">Clear selection</button>
    </div>

    <!-- tabindex + role + label: without these a keyboard user cannot scroll it -->
    <div class="sk-table" role="region" aria-labelledby="zones-caption" tabindex="0">
      <table>
        <caption id="zones-caption" class="sk-visually-hidden">DNS zones, sorted by name</caption>
        <thead> ... </thead>
        <tbody> ... </tbody>
      </table>
    </div>

    <nav class="sk-pagination" aria-label="Pagination"> ... </nav>
    <p class="sk-visually-hidden" role="status">Showing 1 to 20 of 128 zones.</p>

  </div>
</main>`,
    css: `.sk-bulk-bar {
  padding: var(--sk-space-8) var(--sk-space-12);
  background-color: var(--sk-color-surface-selected);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-brand);
  border-radius: var(--sk-radius-md);
}
.sk-bulk-bar__count {
  font-size: var(--sk-font-size-body-sm);
  font-weight: var(--sk-font-weight-medium);
  color: var(--sk-color-text-brand);
}

/* Sticky bulk bar on narrow screens, where it would otherwise scroll away
   from the rows it acts on. */
@media (max-width: 48rem) {
  .sk-bulk-bar {
    position: sticky;
    inset-block-start: var(--sk-space-8);
    z-index: var(--sk-z-sticky);
    background-color: var(--sk-color-surface-raised);
    box-shadow: var(--sk-elevation-2);
  }
}`,
  },

  {
    id: 'list-detail',
    name: 'List and detail',
    summary:
      'A master list beside a detail panel. The panel is inline on wide screens and a modal drawer on narrow ones — two genuinely different interaction models behind one layout.',
    whenToUse: ['Inspecting items without losing the list.', 'Triage workflows: logs, alerts, operations.'],
    regions: [
      { name: 'List', description: 'Scrollable list of items with a selected state.', responsive: 'Full width when nothing is selected on narrow screens.' },
      { name: 'Detail', description: 'The selected item.', responsive: 'Inline flex sibling above 64rem; modal drawer below it.' },
    ],
    components: ['side-nav', 'drawer', 'table', 'description-list', 'sidebar-layout', 'page-header'],
    responsive:
      'Above lg the detail panel is a flex sibling, so opening it makes the list narrower rather than covering it. Below lg it becomes a modal drawer with focus trapping. The two modes need different ARIA — inline must NOT set aria-modal, or it tells assistive technology the list is unavailable when it is not.',
    accessibility: [
      'Selecting a list item moves focus to the detail heading on narrow screens (where the panel is modal) and leaves focus alone on wide ones (where it is not).',
      'The selected list row carries aria-selected and a visible non-colour marker.',
      'Escape closes the modal drawer and restores focus to the originating row.',
      'A closed drawer must be inert, or it leaves invisible tab stops.',
      'Keep the selected item id in the URL so the view is linkable.',
    ],
    darkMode:
      'The inline drawer has no scrim, so its edge is the only separation between the two regions — that edge must be an explicit border at border-default. A shadow alone leaves the two regions looking like one continuous surface.',
    html: `<div class="sk-app-shell__body">
  <main class="sk-app-shell__main" id="main" tabindex="-1">
    <div class="sk-app-shell__content">
      <table class="sk-list-detail__list"> ... </table>
    </div>
  </main>

  <!-- Above lg: a flex sibling, no aria-modal, focus not trapped -->
  <aside class="sk-drawer sk-drawer--inline sk-list-detail__detail"
         data-open aria-labelledby="detail-title">
    <header class="sk-drawer__header">
      <h2 class="sk-drawer__title" id="detail-title">www.example.com</h2>
      <button type="button" class="sk-icon-button sk-icon-button--sm">
        <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-close" /></svg>
        <span class="sk-visually-hidden">Close details panel</span>
      </button>
    </header>
    <div class="sk-drawer__body"><dl class="sk-dl"> ... </dl></div>
  </aside>
</div>`,
    css: `.sk-list-detail__detail { flex: 0 0 28rem; }

@media (max-width: 63.999rem) {
  /* Below lg the panel becomes a modal drawer. The JS must ALSO switch it to
     role="dialog" aria-modal="true" and trap focus — the CSS alone is only half
     the change, and shipping only the CSS half is a real accessibility bug. */
  .sk-list-detail__detail {
    position: fixed;
    inset-block: 0;
    inset-inline-end: 0;
    z-index: var(--sk-z-drawer);
    inline-size: min(28rem, 100vw);
    box-shadow: var(--sk-elevation-4);
  }
}`,
  },

  {
    id: 'form-page',
    name: 'Form page',
    summary:
      'A single-column form with grouped sections, an error summary, and a sticky action bar. Single column because multi-column forms measurably increase completion errors.',
    whenToUse: ['Creating or editing a resource.', 'Any form with more than about three fields.'],
    regions: [
      { name: 'Page header', description: 'Title and cancel.', responsive: 'Standard wrap.' },
      { name: 'Error summary', description: 'Appears above the form after a failed submit, linking to each bad field.', responsive: 'Full width.' },
      { name: 'Form sections', description: 'Fieldsets with legends.', responsive: 'Single column throughout. Related short fields may share a row via a Cluster.' },
      { name: 'Action bar', description: 'Save and cancel.', responsive: 'Sticks to the bottom on long forms.' },
    ],
    components: ['page-header', 'fieldset', 'form-field', 'text-field', 'select', 'checkbox', 'alert', 'button', 'stack'],
    responsive:
      'One column at every width, capped at roughly 40rem. Fields that genuinely belong together (a value and its unit) share a row via a Cluster, which wraps rather than cramping.',
    accessibility: [
      'On failed submit, move focus to the error summary and list each error as a link to its field.',
      'Errors use role="alert" on submit and aria-live="polite" on blur.',
      'Preserve all user input when server validation fails. Never clear a password field.',
      'Warn before discarding unsaved changes.',
      'Mark optional fields, not required ones.',
      'Do not hide required fields inside an unselected tab — a validation error the user cannot see is a dead end.',
    ],
    darkMode:
      'The sticky action bar must be opaque (surface-base plus a top border). A translucent bar lets content scroll visibly beneath it, which is far more distracting on a dark page than a light one.',
    html: `<main class="sk-app-shell__main" id="main" tabindex="-1">
  <div class="sk-form-page">
    <header class="sk-page-header">
      <h1 class="sk-page-header__title">Create zone</h1>
      <p class="sk-page-header__description">Zones group the DNS records for one domain.</p>
    </header>

    <!-- Focus moves here on failed submit -->
    <div class="sk-alert sk-alert--danger" role="alert" id="error-summary" tabindex="-1" hidden>
      <svg class="sk-alert__icon" aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-error" /></svg>
      <div class="sk-alert__content">
        <h2 class="sk-alert__title">There are 2 problems with this form</h2>
        <ul>
          <li><a class="sk-link" href="#zone-name">Enter a zone name</a></li>
          <li><a class="sk-link" href="#ttl">Enter a TTL between 60 and 86400 seconds</a></li>
        </ul>
      </div>
    </div>

    <form class="sk-stack sk-stack--gap-32" novalidate>
      <fieldset class="sk-fieldset sk-fieldset--section">
        <legend class="sk-fieldset__legend">Zone details</legend>
        <div class="sk-fieldset__body">
          <div class="sk-field">
            <label class="sk-field__label" for="zone-name">Zone name</label>
            <p class="sk-field__hint" id="zone-name-hint">A fully qualified domain, lowercase.</p>
            <input class="sk-input sk-input--mono" id="zone-name" name="zoneName" type="text"
                   placeholder="example.com" aria-describedby="zone-name-hint" spellcheck="false" />
          </div>

          <!-- Value and unit share a row, wrapping rather than cramping -->
          <div class="sk-cluster sk-cluster--gap-12 sk-cluster--align-start">
            <div class="sk-field sk-cluster__grow">
              <label class="sk-field__label" for="ttl">Default TTL</label>
              <input class="sk-input" id="ttl" type="text" inputmode="numeric" value="3600" />
            </div>
            <div class="sk-field sk-cluster__grow">
              <label class="sk-field__label" for="env">Environment</label>
              <div class="sk-select-wrapper"><select class="sk-select" id="env"> ... </select></div>
            </div>
          </div>
        </div>
      </fieldset>

      <div class="sk-form-page__actions">
        <div class="sk-cluster sk-cluster--end sk-cluster--gap-8">
          <button type="button" class="sk-button sk-button--secondary">Cancel</button>
          <button type="submit" class="sk-button sk-button--primary">Create zone</button>
        </div>
      </div>
    </form>
  </div>
</main>`,
    css: `.sk-form-page {
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-24);
  /* Single column, capped. Multi-column forms measurably increase errors,
     because the eye's path through them is ambiguous. */
  inline-size: 100%;
  max-inline-size: 40rem;
  margin-inline: auto;
  padding-inline: clamp(var(--sk-space-16), 4vw, var(--sk-space-32));
  padding-block: var(--sk-space-24);
}

.sk-form-page__actions {
  position: sticky;
  inset-block-end: 0;
  /* Opaque: a translucent bar lets content scroll visibly beneath it, which is
     much more distracting on a dark page. */
  background-color: var(--sk-color-surface-base);
  border-block-start: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  padding-block: var(--sk-space-12);
  margin-block-start: var(--sk-space-8);
}`,
  },

  {
    id: 'wizard',
    name: 'Wizard',
    summary: 'A multi-step flow with a stepper, one step visible at a time, and progress preserved between steps.',
    whenToUse: ['Setup and onboarding flows of three to seven steps.', 'Processes with real dependencies between steps.'],
    regions: [
      { name: 'Stepper', description: 'Progress indicator with completed steps clickable.', responsive: 'Horizontal above 48rem; "Step 2 of 5" plus a progress bar below it.' },
      { name: 'Step content', description: 'The current step only.', responsive: 'Single column, capped at 40rem.' },
      { name: 'Navigation', description: 'Back and Next, with Next as primary.', responsive: 'Sticky at the bottom on narrow screens.' },
    ],
    components: ['stepper', 'form-field', 'button', 'alert', 'progress', 'stack'],
    responsive: 'The Stepper is a wrapping flex list, so it collapses to a stacked list before it collapses to the compact "Step 2 of 5" form.',
    accessibility: [
      'Move focus to the step heading on step change, and announce the new step politely.',
      'Only completed steps are focusable; future steps are plain text, not disabled buttons.',
      'Mark steps containing validation errors in the stepper itself, not only in the panel.',
      'Save progress between steps so going back never loses work.',
      'The final step is "Review", showing everything before commit.',
    ],
    darkMode: 'The stepper connector uses border-strong so the steps still read as a sequence on dark; a connector at border-subtle disappears.',
    html: `<main class="sk-app-shell__main" id="main" tabindex="-1">
  <div class="sk-wizard">
    <nav class="sk-stepper" aria-label="Progress"> ... </nav>

    <div class="sk-wizard__panel">
      <!-- Focus moves here on step change -->
      <h1 class="sk-wizard__heading" id="step-heading" tabindex="-1">Records</h1>
      <p class="sk-wizard__description">Add the initial records for this zone. You can add more later.</p>
      <form class="sk-stack sk-stack--gap-24"> ... </form>
    </div>

    <div class="sk-wizard__nav">
      <div class="sk-cluster sk-cluster--between sk-cluster--gap-8">
        <button type="button" class="sk-button sk-button--secondary">Back</button>
        <button type="button" class="sk-button sk-button--primary">Next: Review</button>
      </div>
    </div>
  </div>
  <p class="sk-visually-hidden" role="status">Step 2 of 3, Records.</p>
</main>`,
    css: `.sk-wizard {
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-32);
  inline-size: 100%;
  max-inline-size: 48rem;
  margin-inline: auto;
  padding: var(--sk-space-24) clamp(var(--sk-space-16), 4vw, var(--sk-space-32));
}

.sk-wizard__panel { display: flex; flex-direction: column; gap: var(--sk-space-16); max-inline-size: 40rem; }
.sk-wizard__heading { margin: 0; font-size: var(--sk-font-size-heading-lg); font-weight: var(--sk-font-weight-bold); }
.sk-wizard__heading:focus-visible { outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring); outline-offset: var(--sk-focus-ring-offset); }
.sk-wizard__description { margin: 0; color: var(--sk-color-text-secondary); }

.sk-wizard__nav {
  position: sticky;
  inset-block-end: 0;
  background-color: var(--sk-color-surface-base);
  border-block-start: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  padding-block: var(--sk-space-12);
}`,
  },

  {
    id: 'settings',
    name: 'Settings',
    summary: 'A navigable settings area: section navigation beside grouped controls that apply immediately.',
    whenToUse: ['Account, workspace and application preferences.', 'Anywhere with more than about ten settings.'],
    regions: [
      { name: 'Section navigation', description: 'Links to settings sections.', responsive: 'Sidebar above roughly 48rem; a horizontal scrolling tab strip below it.' },
      { name: 'Section content', description: 'Grouped settings rows.', responsive: 'Single column, capped at 48rem.' },
    ],
    components: ['sidebar-layout', 'side-nav', 'switch', 'fieldset', 'divider', 'button', 'stack'],
    responsive: 'A Sidebar layout with a 14rem rail. It wraps to stacked on container width, and the rail becomes a scrolling tab strip when stacked.',
    accessibility: [
      'Settings that apply immediately use Switch; settings behind a Save button use Checkbox. Mixing the two models in one section is confusing.',
      'Announce the result of an immediate change politely — a switch that moves silently gives no confirmation it worked.',
      'Show a pending state rather than optimistically reporting success.',
      'Each section is a labelled region with a heading.',
      'Destructive settings live in a clearly separated danger zone at the end.',
    ],
    darkMode: 'Divided settings rows use border-subtle and go darker on dark. The danger zone uses the status-danger tinted surface, which is the 950 step rather than a darkened 50.',
    html: `<main class="sk-app-shell__main" id="main" tabindex="-1">
  <div class="sk-app-shell__content">
    <header class="sk-page-header"><h1 class="sk-page-header__title">Settings</h1></header>

    <div class="sk-sidebar-layout sk-sidebar-layout--narrow">
      <nav class="sk-sidebar-layout__sidebar sk-side-nav" aria-label="Settings sections">
        <ul class="sk-side-nav__list">
          <li><a class="sk-side-nav__item" href="#profile" aria-current="page"><span class="sk-side-nav__label">Profile</span></a></li>
          <li><a class="sk-side-nav__item" href="#notifications"><span class="sk-side-nav__label">Notifications</span></a></li>
          <li><a class="sk-side-nav__item" href="#appearance"><span class="sk-side-nav__label">Appearance</span></a></li>
        </ul>
      </nav>

      <div class="sk-sidebar-layout__content sk-stack sk-stack--gap-32">
        <section aria-labelledby="appearance-h">
          <h2 class="sk-fieldset__legend" id="appearance-h">Appearance</h2>
          <ul class="sk-stack sk-stack--divided sk-stack--gap-0" role="list">
            <li class="sk-switch">
              <span class="sk-switch__content">
                <label class="sk-switch__label" for="motion">Reduce motion</label>
                <span class="sk-switch__description" id="motion-desc">Overrides your system setting for this application.</span>
              </span>
              <input type="checkbox" role="switch" class="sk-switch__input" id="motion" aria-describedby="motion-desc" />
              <span class="sk-switch__track" aria-hidden="true"><span class="sk-switch__thumb"></span></span>
            </li>
          </ul>
        </section>

        <section class="sk-danger-zone" aria-labelledby="danger-h">
          <h2 class="sk-fieldset__legend" id="danger-h">Delete account</h2>
          <p>Permanently removes your account and all zones you own. This cannot be undone.</p>
          <button type="button" class="sk-button sk-button--danger">Delete account</button>
        </section>
      </div>
    </div>
  </div>
  <p class="sk-visually-hidden" role="status" id="settings-status"></p>
</main>`,
    css: `.sk-danger-zone {
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-12);
  align-items: flex-start;
  padding: var(--sk-space-16);
  background-color: var(--sk-color-status-danger-surface);
  border: var(--sk-border-width-hairline) solid var(--sk-color-status-danger-border);
  border-radius: var(--sk-radius-lg);
}
.sk-danger-zone p { margin: 0; color: var(--sk-color-status-danger-text); max-inline-size: var(--sk-container-prose); }`,
  },

  {
    id: 'detail-page',
    name: 'Detail page',
    summary: 'Everything about one resource: identity header, metadata, tabbed views.',
    whenToUse: ['Viewing and editing one resource.', 'Anywhere with several substantial views of the same subject.'],
    regions: [
      { name: 'Breadcrumbs', description: 'Path back up the hierarchy.', responsive: 'Collapses to an overflow menu when deep or narrow.' },
      { name: 'Identity header', description: 'Name, status, key metadata, actions.', responsive: 'Wraps to stacked.' },
      { name: 'Tabs', description: 'Views of the resource.', responsive: 'Scrolls horizontally rather than wrapping to two rows.' },
      { name: 'Panel', description: 'The selected view.', responsive: 'Full width.' },
    ],
    components: ['breadcrumbs', 'page-header', 'tabs', 'description-list', 'status-indicator', 'badge', 'menu'],
    responsive: 'The header uses a wrapping Cluster; the tab strip scrolls with scroll-snap because a two-row tab strip destroys the underline metaphor.',
    accessibility: [
      'One h1: the resource name.',
      'Prefer routed tabs (links plus aria-current) so views are bookmarkable and survive a refresh.',
      'Do not use tab roles on routed tabs — mixing link and tab semantics confuses both.',
      'Actions have names meaningful out of context.',
    ],
    darkMode: 'The active tab underline uses border-brand and steps up on dark. The tab strip’s own bottom rule uses border-subtle and goes darker, so it never visually outranks the active indicator.',
    html: `<main class="sk-app-shell__main" id="main" tabindex="-1">
  <div class="sk-app-shell__content">
    <header class="sk-page-header sk-page-header--detail">
      <nav class="sk-breadcrumbs" aria-label="Breadcrumb"> ... </nav>
      <div class="sk-page-header__main">
        <div class="sk-page-header__titles">
          <div class="sk-page-header__title-row">
            <h1 class="sk-page-header__title">example.com</h1>
            <span class="sk-badge sk-badge--neutral">Production</span>
            <span class="sk-status sk-status--success">
              <span class="sk-status__dot" aria-hidden="true"></span>
              <span class="sk-status__label">Applied</span>
            </span>
          </div>
        </div>
        <div class="sk-page-header__actions">
          <button type="button" class="sk-button sk-button--secondary sk-button--sm">Export</button>
          <button type="button" class="sk-button sk-button--primary sk-button--sm">Add record</button>
        </div>
      </div>
      <nav class="sk-tabs sk-tabs--routed" aria-label="Zone views">
        <div class="sk-tabs__list">
          <a class="sk-tabs__tab" href="/zones/example-com" aria-current="page">Overview</a>
          <a class="sk-tabs__tab" href="/zones/example-com/records">Records <span class="sk-tabs__count">128</span></a>
          <a class="sk-tabs__tab" href="/zones/example-com/history">History</a>
        </div>
      </nav>
    </header>

    <div class="sk-sidebar-layout sk-sidebar-layout--end">
      <div class="sk-sidebar-layout__content"> ... </div>
      <aside class="sk-sidebar-layout__sidebar" aria-label="Zone metadata">
        <dl class="sk-dl"> ... </dl>
      </aside>
    </div>
  </div>
</main>`,
    css: `/* Composed entirely from existing primitives. */`,
  },

  {
    id: 'auth',
    name: 'Sign-in',
    summary: 'A single centred card on a plain background. The one place a minimal shell is correct.',
    whenToUse: ['Sign in, sign up, password reset, multi-factor challenge.'],
    regions: [
      { name: 'Brand', description: 'Logo and product name.', responsive: 'Centred above the card.' },
      { name: 'Card', description: 'The form.', responsive: 'Capped at 24rem; full-bleed with no border below 30rem.' },
      { name: 'Footer', description: 'Alternative actions and legal links.', responsive: 'Wrapping cluster.' },
    ],
    components: ['card', 'form-field', 'text-field', 'button', 'alert', 'link', 'stack'],
    responsive: 'A centred flex column. The card loses its border and radius below 30rem so it reads as the page rather than as a floating box on a small screen.',
    accessibility: [
      'Set autocomplete correctly: username, current-password, new-password, one-time-code.',
      'Never block paste on password fields — it breaks password managers and fails WCAG 3.3.8.',
      'Authentication errors must not reveal which of username or password was wrong.',
      'Focus the first field on load. This is one of the few places autofocus is appropriate.',
      'Announce errors with role="alert" and keep the entered username.',
    ],
    darkMode: 'The card is a raised surface and goes lighter than the page. Below 30rem, where the card merges into the page, its background must switch to surface-base or it appears as a lighter block filling the screen for no reason.',
    html: `<body class="sk-auth">
  <main class="sk-auth__main" id="main">
    <div class="sk-auth__brand">
      <svg aria-hidden="true" focusable="false" width="32" height="32"><use href="#sk-logo" /></svg>
      <p class="sk-auth__product">Sekura Console</p>
    </div>

    <div class="sk-card sk-auth__card">
      <div class="sk-card__body sk-stack sk-stack--gap-16">
        <h1 class="sk-auth__heading">Sign in</h1>

        <div class="sk-alert sk-alert--danger" role="alert" hidden>
          <svg class="sk-alert__icon" aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-error" /></svg>
          <div class="sk-alert__content">
            <p class="sk-alert__body">That email address and password do not match an account.</p>
          </div>
        </div>

        <form class="sk-stack sk-stack--gap-16">
          <div class="sk-field">
            <label class="sk-field__label" for="email">Email address</label>
            <input class="sk-input" id="email" name="email" type="email"
                   autocomplete="username" autofocus />
          </div>
          <div class="sk-field">
            <label class="sk-field__label" for="password">Password</label>
            <input class="sk-input" id="password" name="password" type="password"
                   autocomplete="current-password" />
          </div>
          <button type="submit" class="sk-button sk-button--primary sk-button--lg sk-button--full-width">
            Sign in
          </button>
        </form>
      </div>
    </div>

    <div class="sk-cluster sk-cluster--center sk-cluster--gap-16 sk-auth__footer">
      <a class="sk-link" href="/reset">Forgot your password?</a>
      <a class="sk-link" href="/help">Help</a>
    </div>
  </main>
</body>`,
    css: `.sk-auth {
  display: flex;
  min-block-size: 100dvh;
  background-color: var(--sk-color-surface-subtle);
}

.sk-auth__main {
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-24);
  /* Centred without absolute positioning, so it still scrolls when the
     viewport is short. */
  margin: auto;
  padding: var(--sk-space-24) var(--sk-space-16);
  inline-size: 100%;
  max-inline-size: 24rem;
}

.sk-auth__brand { display: flex; flex-direction: column; align-items: center; gap: var(--sk-space-8); color: var(--sk-color-text-brand); }
.sk-auth__product { margin: 0; font-weight: var(--sk-font-weight-semibold); color: var(--sk-color-text-primary); }
.sk-auth__heading { margin: 0; font-size: var(--sk-font-size-heading-lg); font-weight: var(--sk-font-weight-bold); }
.sk-auth__footer { font-size: var(--sk-font-size-body-sm); }

@media (max-width: 30rem) {
  /* The card merges into the page. Its background must follow, or it reads as
     a lighter block filling the screen for no reason. */
  .sk-auth { background-color: var(--sk-color-surface-base); }
  .sk-auth__card { border: none; box-shadow: none; background-color: var(--sk-color-surface-base); }
}`,
  },

  {
    id: 'docs',
    name: 'Documentation',
    summary: 'Long-form content with section navigation and an on-page table of contents.',
    whenToUse: ['Reference documentation, guides, changelogs.'],
    regions: [
      { name: 'Section navigation', description: 'The document tree.', responsive: 'Sidebar above lg; a drawer below it.' },
      { name: 'Content', description: 'Prose, capped at 68 characters.', responsive: 'Always the priority column.' },
      { name: 'On-page contents', description: 'Headings within the page.', responsive: 'Sticky sidebar above xl; hidden below.' },
    ],
    components: ['side-nav', 'sidebar-layout', 'code-block', 'alert', 'breadcrumbs', 'link'],
    responsive: 'Two nested Sidebar layouts. Each wraps independently on container width, so the on-page contents drops away before the section navigation does.',
    accessibility: [
      'Correct heading hierarchy — no skipped levels — since screen reader users navigate documentation by heading.',
      'The on-page contents is a nav landmark with aria-label, using aria-current for the visible section.',
      'Code blocks need a focusable, named scroll container.',
      'Links describe their destination.',
      'Anchor targets need scroll-margin so a sticky header does not cover them.',
    ],
    darkMode: 'Syntax highlighting maps onto the audited chart palette so it inherits verified per-theme contrast. Comments use text-tertiary, which is still held to 4.5:1 despite being low-emphasis by design.',
    html: `<div class="sk-app-shell__body">
  <nav class="sk-side-nav" aria-label="Documentation sections"> ... </nav>

  <main class="sk-app-shell__main" id="main" tabindex="-1">
    <div class="sk-app-shell__content">
      <div class="sk-sidebar-layout sk-sidebar-layout--end sk-sidebar-layout--narrow sk-sidebar-layout--sticky">
        <article class="sk-sidebar-layout__content sk-prose">
          <h1>Managing records</h1>
          <p class="sk-lead">Records map names to values within a zone.</p>
          <h2>Record types</h2>
          <p>…</p>
          <figure class="sk-code-block"> ... </figure>
        </article>

        <nav class="sk-sidebar-layout__sidebar" aria-label="On this page">
          <h2 class="sk-side-nav__group-label">On this page</h2>
          <ul class="sk-side-nav__list">
            <li><a class="sk-side-nav__item" href="#record-types" aria-current="true"><span class="sk-side-nav__label">Record types</span></a></li>
            <li><a class="sk-side-nav__item" href="#ttl"><span class="sk-side-nav__label">TTL</span></a></li>
          </ul>
        </nav>
      </div>
    </div>
  </main>
</div>`,
    css: `/* Anchor targets must clear the sticky header (WCAG 2.4.11). */
.sk-prose :is(h2, h3, h4)[id] { scroll-margin-block-start: 5rem; }

@media (max-width: 79.999rem) {
  /* On-page contents is the first thing to go; section nav survives longer. */
  .sk-sidebar-layout--sticky > nav[aria-label="On this page"] { display: none; }
}`,
  },
];

const byId = new Map(layouts.map((l) => [l.id, l]));

export function getLayout(id: string): LayoutRecipe | undefined {
  return byId.get(id.toLowerCase().trim());
}

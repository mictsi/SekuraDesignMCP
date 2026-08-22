import type { ComponentSpec } from './types.js';

/**
 * Layout primitives.
 *
 * Sekura is flex-first by policy. Every composition primitive below is a flex
 * container, and every one of them:
 *
 *   1. sets `flex-wrap: wrap` unless wrapping is provably wrong,
 *   2. declares `flex` explicitly on its children rather than relying on the
 *      `0 1 auto` default,
 *   3. sets `min-inline-size: 0` on any child that can contain text, because the
 *      default `min-width: auto` on a flex item refuses to shrink below its
 *      content and is the single most common cause of horizontal overflow,
 *   4. expresses widths as `flex-basis` (an *ideal* width) rather than `width`
 *      (a *fixed* width), so the layout responds to its container rather than to
 *      the viewport.
 *
 * Grid is used only for genuinely two-dimensional layouts where rows and columns
 * must align across both axes — card grids and the app shell. Everything else is
 * flex, which means most layouts adapt without a single media query.
 */

export const layoutComponents: ComponentSpec[] = [
  {
    id: 'app-shell',
    name: 'App shell',
    category: 'layout',
    status: 'stable',
    summary:
      'The outermost frame: skip link, top bar, side navigation, main content and optional detail drawer. Defines the regions every page lives inside.',
    whenToUse: ['Every page of the application.'],
    whenNotToUse: ['Sign-in, error and marketing pages, which have their own simpler shells.'],
    anatomy: [
      { part: 'Skip link', required: true, description: 'First focusable element.' },
      { part: 'Top bar', required: true, description: 'Banner landmark.' },
      { part: 'Side navigation', required: false, description: 'Primary nav landmark; a drawer below lg.' },
      { part: 'Main', required: true, description: 'The main landmark, with tabindex="-1" so the skip link can focus it.' },
      { part: 'Detail drawer', required: false, description: 'Inline drawer beside the content on wide screens.' },
      { part: 'Toast region', required: true, description: 'A live region present from page load.' },
    ],
    variants: [
      { name: 'With navigation', className: 'sk-app-shell', description: 'Side rail plus content.', use: 'Standard application pages.' },
      { name: 'Full width', className: 'sk-app-shell--full', description: 'No side rail.', use: 'Focused single-task pages and wizards.' },
      { name: 'With detail', className: 'sk-app-shell--with-detail', description: 'Rail, content and a detail panel.', use: 'List-and-detail workflows.' },
    ],
    sizes: [
      { name: 'Standard', className: '', height: '100dvh', typeStyle: 'body-md', description: 'Fills the viewport, with only the content region scrolling.' },
    ],
    states: [
      { name: 'Wide', description: 'Side rail persistent, detail panel inline.', trigger: '@media (min-width: 64rem)' },
      { name: 'Narrow', description: 'Rail becomes a modal drawer, detail becomes a modal drawer.', trigger: '@media (max-width: 63.999rem)' },
    ],
    props: [
      { name: 'navigation', type: 'ReactNode', description: 'Side navigation content.' },
      { name: 'detail', type: 'ReactNode', description: 'Detail panel content.' },
    ],
    tokensUsed: ['color-surface-base', 'color-surface-subtle', 'z-header', 'z-drawer', 'space-16', 'space-32'],
    darkMode:
      'The shell establishes the base surface, so it is where `color-scheme` is declared. Setting `color-scheme: dark` on the root is what makes browser-rendered UI — scrollbars, form control internals, the native select popup, spellcheck underlines — follow the theme. Without it a dark application still has white scrollbars, which is the most obvious sign a dark mode was retrofitted rather than designed.',
    accessibility: {
      role: 'Landmark structure: banner, navigation, main, complementary, contentinfo.',
      keyboard: [
        { keys: 'Tab (first press)', action: 'Skip link.' },
        { keys: 'Escape', action: 'Closes any open drawer.' },
      ],
      aria: [
        'Exactly one <main> per page, with tabindex="-1".',
        'Every <nav> gets an aria-label, since there will be more than one.',
        'The toast live region must exist at page load, empty.',
        'Only the content region scrolls, so the top bar and rail cannot cover focused elements.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.4.1 Bypass Blocks.', '1.4.10 Reflow — at 320px and 400% zoom, nothing is lost and nothing scrolls horizontally.', '3.2.3 Consistent Navigation.'],
      screenReader: 'Landmarks let users jump directly between regions — this is the primary navigation mechanism for many screen reader users.',
      targetSize: 'Delegated to the components inside.',
    },
    content: ['Every page needs a unique, descriptive <title>.', 'Set the lang attribute on <html>.'],
    dos: [
      'Declare color-scheme on the root so browser UI follows the theme.',
      'Scroll only the content region.',
      'Give every landmark an accessible name where there is more than one of its type.',
    ],
    donts: ['Do not use more than one <main>.', 'Do not let the page scroll horizontally at 320px.', 'Do not nest landmarks of the same type.'],
    html: `<!-- data-sk-theme is set by the theme script before first paint to avoid a flash -->
<html lang="en" data-sk-theme="dark" data-sk-density="comfortable">
<body class="sk-app-shell">
  <a class="sk-skip-link" href="#main">Skip to main content</a>

  <header class="sk-top-bar sk-top-bar--sticky sk-app-shell__header"> ... </header>

  <div class="sk-app-shell__body">
    <nav class="sk-side-nav sk-app-shell__nav" aria-label="Primary"> ... </nav>

    <main class="sk-app-shell__main" id="main" tabindex="-1">
      <div class="sk-app-shell__content"> ... </div>
    </main>

    <aside class="sk-drawer sk-drawer--inline sk-app-shell__detail" aria-labelledby="detail-title"> ... </aside>
  </div>

  <div class="sk-toast-region" role="status" aria-live="polite" aria-label="Notifications"></div>
</body>
</html>`,
    css: `/* The root declares color-scheme so browser-rendered UI — scrollbars, native
   select popups, form control internals — follows the theme. Skipping this is
   what makes a dark mode look retrofitted. */
:root { color-scheme: light; }
[data-sk-theme="dark"], [data-sk-theme="hc-dark"] { color-scheme: dark; }

/* block-size, not min-block-size.
   With a minimum the shell grows with its content, so the content region's
   overflow never engages and the *window* scrolls instead — which scrolls the
   navigation rail away and defeats the whole point of the layout. Pinning the
   shell to the viewport is what makes __main the scroll container. */
.sk-app-shell {
  display: flex;
  flex-direction: column;
  block-size: 100dvh;
  overflow: hidden;
  margin: 0;
  background-color: var(--sk-color-surface-base);
  color: var(--sk-color-text-primary);
}

.sk-app-shell__header { flex: 0 0 auto; }

/* The body row: rail, content and detail are flex siblings, so the content
   simply gets narrower when a panel opens instead of being overlaid. */
.sk-app-shell__body {
  display: flex;
  flex: 1 1 auto;
  min-block-size: 0;
  min-inline-size: 0;
}

.sk-app-shell__nav { flex: 0 0 auto; }

/* flex: 1 1 auto plus min-inline-size: 0 is the whole trick. Without the
   min-inline-size, a wide table inside main refuses to shrink and pushes the
   entire shell wider than the viewport. */
.sk-app-shell__main {
  flex: 1 1 auto;
  min-inline-size: 0;
  min-block-size: 0;
  /* Only this region scrolls, so the sticky bar can never cover focused content. */
  overflow-y: auto;
}

.sk-app-shell__content {
  inline-size: 100%;
  max-inline-size: var(--sk-container-xl);
  margin-inline: auto;
  padding-inline: clamp(var(--sk-space-16), 4vw, var(--sk-space-32));
  padding-block: var(--sk-space-24);
}

.sk-app-shell__detail { flex: 0 0 auto; }

.sk-app-shell--full .sk-app-shell__nav { display: none; }

@media (max-width: 63.999rem) {
  /* Rail and detail become overlays; the content keeps the full width. */
  .sk-app-shell__nav,
  .sk-app-shell__detail { position: fixed; z-index: var(--sk-z-drawer); }
  .sk-app-shell__content { padding-block: var(--sk-space-16); }
}

/* The shell's regions are distinguished only by surface colour, which HCM
   flattens to one. Without borders the nav, the main area and the detail pane
   become a single undifferentiated page. */
@media (forced-colors: active) {
  .sk-app-shell__header { border-block-end: 1px solid CanvasText; }
  .sk-app-shell__nav { border-inline-end: 1px solid CanvasText; }
  .sk-app-shell__detail { border-inline-start: 1px solid CanvasText; }
}
`,
    related: ['top-bar', 'side-nav', 'page-header', 'drawer'],
  },

  {
    id: 'page-header',
    name: 'Page header',
    category: 'layout',
    status: 'stable',
    summary:
      'The top of a page: breadcrumbs, title, supporting metadata and page-level actions. Every page has exactly one.',
    whenToUse: ['The top of every content page.'],
    whenNotToUse: ['Inside a card or panel — use a section heading.'],
    anatomy: [
      { part: 'Breadcrumbs', required: false, description: 'For nested pages.' },
      { part: 'Title', required: true, description: 'The single <h1>.' },
      { part: 'Status', required: false, description: 'Badges and status indicators beside the title.' },
      { part: 'Description', required: false, description: 'One sentence of context.' },
      { part: 'Metadata', required: false, description: 'Key facts as an inline description list.' },
      { part: 'Actions', required: false, description: 'Page-level actions. One primary at most.' },
      { part: 'Tabs', required: false, description: 'Contextual views, at the bottom edge.' },
    ],
    variants: [
      { name: 'Simple', className: 'sk-page-header', description: 'Title and actions.', use: 'List pages.' },
      { name: 'Detail', className: 'sk-page-header--detail', description: 'Breadcrumbs, title, status, metadata, actions and tabs.', use: 'Resource detail pages.' },
      { name: 'Sticky', className: 'sk-page-header--sticky', description: 'Condenses and sticks on scroll.', use: 'Long pages where the actions must stay reachable.' },
    ],
    sizes: [{ name: 'Medium', className: '', height: 'auto', typeStyle: 'heading-xl title', description: 'The only size.' }],
    states: [
      { name: 'Rest', description: 'Full height.', trigger: 'default' },
      { name: 'Condensed', description: 'Sticky variant on scroll: description hidden, title reduced.', trigger: '[data-condensed]' },
    ],
    props: [
      { name: 'title', type: 'string', required: true, description: 'Page title. Should match the document title and the breadcrumb leaf.' },
      { name: 'description', type: 'string', description: 'One sentence.' },
      { name: 'actions', type: 'ReactNode', description: 'Page-level actions.' },
    ],
    tokensUsed: ['color-text-primary', 'color-text-secondary', 'color-border-subtle', 'space-8', 'space-16', 'space-24'],
    darkMode: 'The separator below the header uses border-subtle and goes darker on dark. When sticky and condensed, it also needs an explicit background of surface-base — a transparent sticky header lets content scroll visibly underneath, which is far more obvious and more distracting on a dark page.',
    accessibility: {
      role: 'A <header> inside <main>, containing the <h1>.',
      keyboard: [{ keys: 'Tab', action: 'Reaches breadcrumbs, then actions, then tabs.' }],
      aria: [
        'Exactly one <h1> per page, and it is this one.',
        'The document <title> should begin with the page title so browser tabs and history are useful.',
        'Actions must have names meaningful out of context: "Create project", not "Create".',
        'A sticky header needs scroll-margin on focusable content so it never obscures focus (WCAG 2.4.11).',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.4.2 Page Titled.', '2.4.6 Headings and Labels.', '2.4.11 Focus Not Obscured.'],
      screenReader: 'The h1 is how screen reader users confirm which page they are on.',
      targetSize: 'Actions meet minimums.',
    },
    content: [
      'Titles are the resource name on a detail page, and a plural noun on a list page: "Projects".',
      'Descriptions are one sentence explaining what the page is for.',
      'Do not repeat the title in the description.',
    ],
    dos: ['One h1 per page.', 'Keep the title, breadcrumb leaf and document title consistent.', 'Limit to one primary action.'],
    donts: ['Do not use more than one h1.', 'Do not put a paragraph of prose in the header.', 'Do not stack more than three actions; overflow into a menu.'],
    html: `<header class="sk-page-header sk-page-header--detail">
  <nav class="sk-breadcrumbs" aria-label="Breadcrumb"> ... </nav>

  <div class="sk-page-header__main">
    <div class="sk-page-header__titles">
      <div class="sk-page-header__title-row">
        <h1 class="sk-page-header__title">Website redesign</h1>
        <span class="sk-badge sk-badge--neutral">Production</span>
        <span class="sk-status sk-status--success">
          <span class="sk-status__dot" aria-hidden="true"></span>
          <span class="sk-status__label">Applied</span>
        </span>
      </div>
      <p class="sk-page-header__description">128 records across 3 record sets.</p>
    </div>

    <div class="sk-page-header__actions">
      <button type="button" class="sk-button sk-button--secondary">Export</button>
      <button type="button" class="sk-button sk-button--primary">Add task</button>
    </div>
  </div>

  <nav class="sk-tabs sk-tabs--routed" aria-label="Project views"> ... </nav>
</header>`,
    css: `.sk-page-header {
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-12);
  min-inline-size: 0;
  padding-block-end: var(--sk-space-16);
  border-block-end: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  margin-block-end: var(--sk-space-24);
}

/* Titles and actions share a row when there is room and stack when there is not.
   No breakpoint involved — the wrap does the work. */
.sk-page-header__main {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sk-space-16);
  min-inline-size: 0;
}

/* flex-basis of 20rem means: take a whole row below ~20rem of available space,
   share the row above it. */
.sk-page-header__titles {
  flex: 1 1 20rem;
  min-inline-size: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-6);
}

.sk-page-header__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sk-space-8) var(--sk-space-12);
  min-inline-size: 0;
}

.sk-page-header__title {
  flex: 0 1 auto;
  min-inline-size: 0;
  margin: 0;
  font-size: var(--sk-font-size-heading-xl);
  line-height: var(--sk-line-height-heading-xl);
  font-weight: var(--sk-font-weight-bold);
  letter-spacing: var(--sk-letter-spacing-heading-xl);
  color: var(--sk-color-text-primary);
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.sk-page-header__description {
  margin: 0;
  max-inline-size: var(--sk-container-prose);
  color: var(--sk-color-text-secondary);
  text-wrap: pretty;
}

/* Actions never shrink below their content and wrap as a unit. */
.sk-page-header__actions {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sk-space-8);
}

.sk-page-header--sticky {
  position: sticky;
  inset-block-start: 0;
  z-index: var(--sk-z-sticky);
  /* Opaque, or content scrolls visibly underneath — much more obvious on dark. */
  background-color: var(--sk-color-surface-base);
}
.sk-page-header--sticky[data-condensed] .sk-page-header__description { display: none; }
.sk-page-header--sticky[data-condensed] .sk-page-header__title { font-size: var(--sk-font-size-heading-md); }

/* Sticky headers separate from the scrolling content by background and shadow,
   both discarded. */
@media (forced-colors: active) {
  .sk-page-header--sticky { border-block-end: 1px solid CanvasText; background-color: Canvas; }
}
`,
    related: ['breadcrumbs', 'tabs', 'button', 'badge'],
  },

  {
    id: 'stack',
    name: 'Stack',
    category: 'layout',
    status: 'stable',
    summary:
      'A one-dimensional flex column with a consistent gap. The workhorse of the system: most vertical rhythm in a Sekura interface comes from a Stack rather than from margins on individual elements.',
    whenToUse: ['Any vertical sequence of elements needing consistent spacing.', 'Form field groups, card contents, page sections.'],
    whenNotToUse: ['Two-dimensional alignment across rows and columns — use Grid.', 'A single child.'],
    anatomy: [
      { part: 'Container', required: true, description: 'A flex column.' },
      { part: 'Children', required: true, description: 'Any elements. The Stack owns the spacing between them; the children own none of it.' },
      { part: 'Divider', required: false, description: 'Optional rules between children, drawn without extra markup.' },
    ],
    variants: [
      { name: 'Vertical', className: 'sk-stack', description: 'Column.', use: 'Default.' },
      { name: 'Divided', className: 'sk-stack--divided', description: 'Rules between children.', use: 'Settings lists and grouped rows.' },
      { name: 'Split', className: 'sk-stack--split', description: 'Pushes the last child to the end of the cross axis.', use: 'A card whose footer must sit at the bottom regardless of body length.' },
    ],
    sizes: [
      { name: 'Gap 4 to 64', className: 'sk-stack--gap-{n}', height: 'n/a', typeStyle: 'n/a', description: 'Gap is set from the spacing scale via a modifier or the --sk-stack-gap custom property.' },
    ],
    states: [{ name: 'Static', description: 'Layout only.', trigger: 'default' }],
    props: [
      { name: 'gap', type: 'SpaceToken', default: "'16'", description: 'Space between children.' },
      { name: 'align', type: "'stretch' | 'start' | 'center' | 'end'", default: "'stretch'", description: 'Cross-axis alignment.' },
      { name: 'divided', type: 'boolean', default: 'false', description: 'Rules between children.' },
    ],
    tokensUsed: ['space-4', 'space-8', 'space-12', 'space-16', 'space-24', 'space-32', 'color-border-subtle'],
    darkMode: 'Dividers use border-subtle and go darker on dark, consistently with every other rule in the system.',
    accessibility: {
      role: 'None. Purely presentational.',
      keyboard: [{ keys: 'n/a', action: 'Not interactive.' }],
      aria: [
        'A Stack must not change the meaning of its children. If the children are a list, the Stack should be the <ul>, not a div wrapping one.',
        'Do not use a Stack to reorder content visually away from DOM order — that breaks focus order (WCAG 1.3.2 and 2.4.3).',
      ],
      wcag: ['1.3.2 Meaningful Sequence.', '2.4.3 Focus Order.'],
      screenReader: 'Transparent.',
      targetSize: 'Not applicable.',
    },
    content: ['No content of its own.'],
    dos: [
      'Let the Stack own the spacing. Children should have no margins.',
      'Use the spacing scale, never arbitrary values.',
      'Use the semantic element (ul, ol, dl) as the Stack when the content is a list.',
    ],
    donts: ['Do not add margins to Stack children.', 'Do not use a Stack for two-dimensional layout.', 'Do not use order or row-reverse to change visual sequence.'],
    html: `<div class="sk-stack sk-stack--gap-24">
  <div class="sk-field"> ... </div>
  <div class="sk-field"> ... </div>
  <div class="sk-cluster">
    <button type="button" class="sk-button sk-button--primary">Save</button>
    <button type="button" class="sk-button sk-button--secondary">Cancel</button>
  </div>
</div>

<!-- Divided settings list -->
<ul class="sk-stack sk-stack--divided sk-stack--gap-0">
  <li class="sk-switch"> ... </li>
  <li class="sk-switch"> ... </li>
</ul>`,
    css: `.sk-stack {
  display: flex;
  flex-direction: column;
  gap: var(--sk-stack-gap, var(--sk-space-16));
  /* Lets the stack shrink inside a flex parent instead of forcing it wider. */
  min-inline-size: 0;
}

/* Children never carry their own margins — the stack owns all spacing, which is
   what makes vertical rhythm consistent across the product. */
.sk-stack > * { margin-block: 0; }

.sk-stack--gap-0  { --sk-stack-gap: var(--sk-space-0); }
.sk-stack--gap-4  { --sk-stack-gap: var(--sk-space-4); }
.sk-stack--gap-8  { --sk-stack-gap: var(--sk-space-8); }
.sk-stack--gap-12 { --sk-stack-gap: var(--sk-space-12); }
.sk-stack--gap-16 { --sk-stack-gap: var(--sk-space-16); }
.sk-stack--gap-24 { --sk-stack-gap: var(--sk-space-24); }
.sk-stack--gap-32 { --sk-stack-gap: var(--sk-space-32); }
.sk-stack--gap-48 { --sk-stack-gap: var(--sk-space-48); }

.sk-stack--align-start  { align-items: flex-start; }
.sk-stack--align-center { align-items: center; }
.sk-stack--align-end    { align-items: flex-end; }

/* Dividers without extra markup. */
.sk-stack--divided > * + * {
  border-block-start: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  padding-block-start: var(--sk-stack-gap, var(--sk-space-16));
}
.sk-stack--divided { list-style: none; padding: 0; }

/* Pushes the last child to the far end — a card footer that sits at the bottom
   no matter how short the body is. */
.sk-stack--split > :last-child { margin-block-start: auto; }

/* The divided variant is the only part of Stack that draws anything. */
@media (forced-colors: active) {
  .sk-stack--divided > * + * { border-block-start-color: CanvasText; }
}
`,
    related: ['cluster', 'grid', 'divider'],
  },

  {
    id: 'cluster',
    name: 'Cluster',
    category: 'layout',
    status: 'stable',
    summary:
      'A horizontal flex row that wraps. The counterpart to Stack, and the reason Sekura interfaces do not produce horizontal scrollbars: a Cluster wraps to a second line long before anything overflows.',
    whenToUse: ['Button rows, tag lists, toolbars, metadata rows, filter chips.', 'Any horizontal group whose length is not fully predictable.'],
    whenNotToUse: ['Content that must stay on one line and scroll instead — use a scroll container, as Tabs does.', 'Aligned columns — use Grid.'],
    anatomy: [
      { part: 'Container', required: true, description: 'A wrapping flex row.' },
      { part: 'Children', required: true, description: 'Items with an explicit flex declaration.' },
      { part: 'Spacer', required: false, description: 'A `margin-inline-start: auto` on a child to push it and everything after it to the far end.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-cluster', description: 'Wraps, aligned to the start.', use: 'Most cases.' },
      { name: 'Between', className: 'sk-cluster--between', description: 'First and last pushed apart.', use: 'Header rows with a title and actions.' },
      { name: 'End', className: 'sk-cluster--end', description: 'Aligned to the end.', use: 'Dialog and form footers.' },
      { name: 'Centre', className: 'sk-cluster--center', description: 'Centred.', use: 'Empty states and centred action rows.' },
    ],
    sizes: [
      { name: 'Gap 4 to 32', className: 'sk-cluster--gap-{n}', height: 'n/a', typeStyle: 'n/a', description: 'From the spacing scale.' },
    ],
    states: [{ name: 'Static', description: 'Layout only.', trigger: 'default' }],
    props: [
      { name: 'gap', type: 'SpaceToken', default: "'8'", description: 'Space between items, applied on both axes so wrapped rows are spaced too.' },
      { name: 'justify', type: "'start' | 'between' | 'end' | 'center'", default: "'start'", description: 'Main-axis distribution.' },
      { name: 'align', type: "'center' | 'start' | 'end' | 'baseline'", default: "'center'", description: 'Cross-axis alignment.' },
      { name: 'nowrap', type: 'boolean', default: 'false', description: 'Disable wrapping. Requires an explicit overflow strategy — never use it without one.' },
    ],
    tokensUsed: ['space-4', 'space-8', 'space-12', 'space-16', 'space-24'],
    darkMode:
      'Cluster sets no colour itself, but it is where two dark-mode problems surface. First, gaps: a row of tinted badges that reads clearly on white can look like one continuous block on a dark page, because dark-mode tints are much closer in lightness to their surface. Keep the gap at 8 or more when clustering tinted elements. Second, wrapped rows: the cross-axis gap must be set (the single `gap` value covers both axes) or wrapped rows collide, which is far more visible against dark surfaces where element edges are lower contrast.',
    accessibility: {
      role: 'None. Presentational.',
      keyboard: [{ keys: 'n/a', action: 'Not interactive.' }],
      aria: [
        'Wrapping must never change DOM order, so focus order stays correct at every width.',
        'A cluster of related controls still needs a role="group" with a name — visual grouping is not programmatic grouping.',
      ],
      wcag: ['1.3.2 Meaningful Sequence.', '1.4.10 Reflow — wrapping is what satisfies this at 320px.', '2.4.3 Focus Order.'],
      screenReader: 'Transparent.',
      targetSize: 'Gaps of at least 8px keep adjacent targets from being mis-tapped.',
    },
    content: ['No content of its own.'],
    dos: [
      'Let it wrap. Wrapping is the point.',
      'Set the gap on both axes so wrapped rows are spaced correctly.',
      'Use `margin-inline-start: auto` on a child rather than a `justify-content` fight.',
    ],
    donts: [
      'Do not set nowrap without deciding what overflows and how.',
      'Do not use fixed widths on children; use flex-basis.',
      'Do not rely on visual grouping alone for related controls.',
    ],
    html: `<div class="sk-cluster">
  <span class="sk-badge sk-badge--neutral">Production</span>
  <span class="sk-badge sk-badge--warning">Beta</span>
  <span class="sk-badge sk-badge--neutral">eu-west-1</span>
</div>

<!-- Footer: cancel and save pushed to the end, wrapping cleanly on narrow screens -->
<div class="sk-cluster sk-cluster--end sk-cluster--gap-8">
  <button type="button" class="sk-button sk-button--secondary">Cancel</button>
  <button type="submit" class="sk-button sk-button--primary">Save changes</button>
</div>

<!-- Title left, actions right, stacking when there is not room for both -->
<div class="sk-cluster sk-cluster--between sk-cluster--gap-16">
  <h2 class="sk-cluster__grow">Records</h2>
  <div class="sk-cluster sk-cluster--gap-8">
    <button type="button" class="sk-button sk-button--secondary sk-button--sm">Filter</button>
    <button type="button" class="sk-button sk-button--primary sk-button--sm">Add task</button>
  </div>
</div>`,
    css: `.sk-cluster {
  display: flex;
  /* Wrapping is the whole point: a cluster reaches a second line long before
     anything overflows, which is what keeps the page free of horizontal scroll. */
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sk-cluster-gap, var(--sk-space-8));
  min-inline-size: 0;
}

/* Explicit flex on children: shrink to fit, but never below zero width, and
   never grow unless asked. */
.sk-cluster > * { flex: 0 1 auto; min-inline-size: 0; }

/* Opt-in growth for the item that should absorb the free space. */
.sk-cluster__grow { flex: 1 1 auto; min-inline-size: 0; }

/* Pushes this item and everything after it to the far end. Cleaner than
   fighting justify-content when only one break point is wanted. */
.sk-cluster__push { margin-inline-start: auto; }

.sk-cluster--between { justify-content: space-between; }
.sk-cluster--end     { justify-content: flex-end; }
.sk-cluster--center  { justify-content: center; }

.sk-cluster--align-start    { align-items: flex-start; }
.sk-cluster--align-end      { align-items: flex-end; }
.sk-cluster--align-baseline { align-items: baseline; }

.sk-cluster--gap-4  { --sk-cluster-gap: var(--sk-space-4); }
.sk-cluster--gap-8  { --sk-cluster-gap: var(--sk-space-8); }
.sk-cluster--gap-12 { --sk-cluster-gap: var(--sk-space-12); }
.sk-cluster--gap-16 { --sk-cluster-gap: var(--sk-space-16); }
.sk-cluster--gap-24 { --sk-cluster-gap: var(--sk-space-24); }

/* Only use with an explicit overflow strategy — otherwise this is how
   horizontal scrollbars get shipped. */
.sk-cluster--nowrap { flex-wrap: nowrap; }
.sk-cluster--nowrap.sk-cluster--scroll { overflow-x: auto; scrollbar-width: thin; }
.sk-cluster--nowrap.sk-cluster--truncate > * { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* forced-colors: nothing to repair — a flex container with gaps; it sets no colour, border or shadow at all. */
`,
    related: ['stack', 'grid', 'button-group'],
  },

  {
    id: 'sidebar-layout',
    name: 'Sidebar layout',
    category: 'layout',
    status: 'stable',
    summary:
      'Two flex siblings — a fixed-ideal-width sidebar and a fluid content area — that stack automatically when the content area would become too narrow. It achieves a responsive two-column layout with no media query at all.',
    whenToUse: ['Content with a filter rail, a table of contents, or a detail panel.', 'Any two-column layout where one column has a natural width.'],
    whenNotToUse: ['Three or more columns — use Grid.', 'Columns of equal importance and width — use Grid or a Cluster of equal flex items.'],
    anatomy: [
      { part: 'Container', required: true, description: 'A wrapping flex row.' },
      { part: 'Sidebar', required: true, description: 'flex-basis at its ideal width, allowed to grow to fill a row when wrapped.' },
      { part: 'Content', required: true, description: 'flex-grow with a min-inline-size percentage that forces the wrap.' },
    ],
    variants: [
      { name: 'Start', className: 'sk-sidebar-layout', description: 'Sidebar first in the markup, so it renders first.', use: 'Filters and navigation.' },
      { name: 'End', className: 'sk-sidebar-layout--end', description: 'Sidebar last in the markup, so it renders last. The modifier documents the intent; it does not reorder anything, because reordering would break focus order.', use: 'Detail and metadata panels.' },
      { name: 'Sticky', className: 'sk-sidebar-layout--sticky', description: 'Sidebar sticks while content scrolls.', use: 'Long pages with a table of contents.' },
    ],
    sizes: [
      { name: 'Narrow', className: 'sk-sidebar-layout--narrow', height: '14rem sidebar', typeStyle: 'n/a', description: 'Table of contents.' },
      { name: 'Medium', className: '', height: '18rem sidebar', typeStyle: 'n/a', description: 'Default.' },
      { name: 'Wide', className: 'sk-sidebar-layout--wide', height: '24rem sidebar', typeStyle: 'n/a', description: 'Detail panels.' },
    ],
    states: [
      { name: 'Side by side', description: 'Both columns share a row.', trigger: 'container wide enough' },
      { name: 'Stacked', description: 'Content hit its minimum width, so both columns take full rows.', trigger: 'container too narrow' },
    ],
    props: [
      { name: 'side', type: "'start' | 'end'", default: "'start'", description: 'Which side the sidebar sits on.' },
      { name: 'sidebarWidth', type: 'string', default: "'18rem'", description: 'Ideal sidebar width — a flex-basis, not a fixed width.' },
      { name: 'contentMin', type: 'string', default: "'60%'", description: 'The content width below which the layout stacks. This percentage is the entire breakpoint mechanism.' },
    ],
    tokensUsed: ['space-16', 'space-24', 'space-32'],
    darkMode:
      'The layout sets no colour, but it decides where a boundary is needed. When the sidebar and content have the same surface — the usual case — nothing separates them on a dark page except the gap, and a 24px gap reads as much weaker separation on dark than on light. Either keep the gap at 24 or more, or give the sidebar `surface-subtle` plus a `border-inline-end` at `border-default`. Do not reach for a shadow: it will be invisible in dark mode and the two regions will appear to merge.',
    accessibility: {
      role: 'None. Use semantic children: <aside> for the sidebar, <div> or <section> for the content.',
      keyboard: [{ keys: 'Tab', action: 'Follows DOM order. Because the layout never reorders, focus order is correct at every width.' }],
      aria: [
        'Put the sidebar *after* the main content in the DOM when the content is more important, and use `order` only if you are certain the focus order still makes sense. In practice: prefer getting the DOM order right.',
        'The sidebar is an <aside> with an aria-label when it is complementary content.',
      ],
      wcag: ['1.3.2 Meaningful Sequence.', '1.4.10 Reflow.', '2.4.3 Focus Order.'],
      screenReader: 'Transparent; the semantic children carry the meaning.',
      targetSize: 'Not applicable.',
    },
    content: ['No content of its own.'],
    dos: [
      'Express the sidebar width as a flex-basis so it can flex.',
      'Use the content min-inline-size percentage as the stacking trigger instead of a media query.',
      'Keep DOM order equal to reading order.',
    ],
    donts: ['Do not set a fixed width on the sidebar.', 'Do not use `order` to swap columns visually.', 'Do not add a media query — this pattern does not need one.'],
    html: `<div class="sk-sidebar-layout">
  <aside class="sk-sidebar-layout__sidebar" aria-label="Filters">
    <div class="sk-stack sk-stack--gap-16"> ... </div>
  </aside>

  <div class="sk-sidebar-layout__content">
    <div class="sk-table"> ... </div>
  </div>
</div>`,
    css: `/* This is the whole responsive mechanism, and it uses no media query:
   the sidebar wants --sk-sidebar-width, the content refuses to go below
   --sk-content-min of the row, and when both cannot be satisfied the flex
   container wraps them onto separate rows. */
.sk-sidebar-layout {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sk-space-24);
  min-inline-size: 0;
}

.sk-sidebar-layout__sidebar {
  /* Grows to fill the row once wrapped, so it never sits as a lonely narrow
     column above full-width content. */
  flex: 1 1 var(--sk-sidebar-width, 18rem);
  min-inline-size: 0;
}

.sk-sidebar-layout__content {
  /* flex-basis 0 with a large grow makes this take all remaining space; the
     min-inline-size percentage is what actually triggers the wrap. */
  flex: 999 1 var(--sk-content-min, 60%);
  min-inline-size: 0;
}

/* Placement follows DOM order. There is deliberately no row-reverse here:
   reversing the visual order while leaving the DOM alone makes focus jump
   right-then-left, which is exactly the desynchronisation this component's
   accessibility notes forbid. To put the sidebar last, put it last in the
   markup — this modifier only documents that intent. */
.sk-sidebar-layout--end { flex-direction: row; }

.sk-sidebar-layout--narrow { --sk-sidebar-width: 14rem; }
.sk-sidebar-layout--wide   { --sk-sidebar-width: 24rem; }

.sk-sidebar-layout--sticky .sk-sidebar-layout__sidebar {
  position: sticky;
  inset-block-start: var(--sk-space-24);
  align-self: flex-start;
  max-block-size: calc(100dvh - var(--sk-space-48));
  overflow-y: auto;
}

/* forced-colors: nothing to repair — a flex container with widths and gaps; it sets no colour at all. */
`,
    related: ['app-shell', 'stack', 'grid', 'drawer'],
  },

  {
    id: 'grid',
    name: 'Grid',
    category: 'layout',
    status: 'stable',
    summary:
      'A two-dimensional layout for content that must align across both rows and columns. The one place Sekura reaches for CSS Grid rather than flex — and it uses auto-fit so it still needs no breakpoints.',
    whenToUse: ['Card grids.', 'Dashboard tiles.', 'Form layouts where labels must align across columns.'],
    whenNotToUse: [
      'One-dimensional lists — use Stack or Cluster, which handle wrapping more gracefully.',
      'Layouts where items should size to their content.',
    ],
    anatomy: [
      { part: 'Container', required: true, description: 'A grid with auto-fit or auto-fill columns.' },
      { part: 'Items', required: true, description: 'Grid children. May span columns.' },
    ],
    variants: [
      { name: 'Auto-fit', className: 'sk-grid', description: 'Columns fit as many as will hold the minimum, stretching to fill.', use: 'Card and tile grids. The default.' },
      { name: 'Auto-fill', className: 'sk-grid--fill', description: 'Keeps empty column tracks.', use: 'When items should not stretch to fill a sparse final row.' },
      { name: 'Fixed columns', className: 'sk-grid--cols-{n}', description: 'An explicit column count that collapses to one column below md.', use: 'Form layouts.' },
    ],
    sizes: [
      { name: 'Min 12rem to 24rem', className: 'sk-grid--min-{n}', height: 'n/a', typeStyle: 'n/a', description: 'The minimum column width that drives the column count.' },
    ],
    states: [{ name: 'Static', description: 'Layout only.', trigger: 'default' }],
    props: [
      { name: 'minItemWidth', type: 'string', default: "'18rem'", description: 'Minimum column width. Fewer, wider columns as this grows.' },
      { name: 'gap', type: 'SpaceToken', default: "'16'", description: 'Gap on both axes.' },
      { name: 'columns', type: 'number', description: 'Fixed column count instead of auto-fit.' },
    ],
    tokensUsed: ['space-8', 'space-16', 'space-24', 'space-32'],
    darkMode:
      'Grid sets no colour, but a grid of cards is where the dark-mode card rule becomes obvious at scale. In light mode each card is white against a grey page and separation is free; in dark mode every card is `surface-raised` against a page only one step darker, so without `border-default` on each card the grid reads as one large undifferentiated block. If a grid of cards looks flat in dark mode, the cards are missing their borders — not the grid its gaps.',
    accessibility: {
      role: 'None. Presentational. A grid of cards should be a <ul> of <li>.',
      keyboard: [{ keys: 'Tab', action: 'Follows DOM order.' }],
      aria: [
        'CSS Grid can visually reorder items independently of DOM order. Never do this — it desynchronises focus order from visual order, which is a documented WCAG failure.',
        'Use a list element when the items are a list, so the count is announced.',
        'Do not use role="grid"; that is the interactive data-grid pattern and is unrelated to CSS Grid.',
      ],
      wcag: ['1.3.2 Meaningful Sequence.', '1.4.10 Reflow.', '2.4.3 Focus Order.'],
      screenReader: 'Transparent, or a list when the semantic element is a list.',
      targetSize: 'Not applicable.',
    },
    content: ['No content of its own.'],
    dos: [
      'Use `minmax(min(<width>, 100%), 1fr)` so a single narrow column never overflows its container.',
      'Use auto-fit for content grids.',
      'Keep DOM order equal to visual order.',
    ],
    donts: [
      'Do not use grid-auto-flow: dense; it reorders items visually and breaks focus order.',
      'Do not use CSS Grid for a simple wrapping row — Cluster handles that better.',
      'Do not hard-code column counts without a single-column fallback.',
    ],
    html: `<ul class="sk-grid sk-grid--min-18">
  <li><article class="sk-card"> ... </article></li>
  <li><article class="sk-card"> ... </article></li>
  <li><article class="sk-card"> ... </article></li>
</ul>

<!-- Two-column form that collapses to one below md -->
<div class="sk-grid sk-grid--cols-2 sk-grid--gap-24">
  <div class="sk-field"> ... </div>
  <div class="sk-field"> ... </div>
  <div class="sk-field sk-grid__span-full"> ... </div>
</div>`,
    css: `.sk-grid {
  display: grid;
  /* min(width, 100%) is essential: without it, a container narrower than the
     minimum column width overflows instead of collapsing to one column. */
  grid-template-columns: repeat(auto-fit, minmax(min(var(--sk-grid-min, 18rem), 100%), 1fr));
  gap: var(--sk-grid-gap, var(--sk-space-16));
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sk-grid > * { min-inline-size: 0; }

.sk-grid--fill { grid-template-columns: repeat(auto-fill, minmax(min(var(--sk-grid-min, 18rem), 100%), 1fr)); }

.sk-grid--min-12 { --sk-grid-min: 12rem; }
.sk-grid--min-16 { --sk-grid-min: 16rem; }
.sk-grid--min-18 { --sk-grid-min: 18rem; }
.sk-grid--min-24 { --sk-grid-min: 24rem; }

.sk-grid--gap-8  { --sk-grid-gap: var(--sk-space-8); }
.sk-grid--gap-16 { --sk-grid-gap: var(--sk-space-16); }
.sk-grid--gap-24 { --sk-grid-gap: var(--sk-space-24); }
.sk-grid--gap-32 { --sk-grid-gap: var(--sk-space-32); }

/* Fixed column counts always start at one column and only expand at md, so the
   narrow case is the default rather than an afterthought. */
.sk-grid--cols-2,
.sk-grid--cols-3,
.sk-grid--cols-4 { grid-template-columns: 1fr; }

@media (min-width: 48rem) {
  .sk-grid--cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sk-grid--cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .sk-grid--cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

.sk-grid__span-full { grid-column: 1 / -1; }
.sk-grid__span-2 { grid-column: span 2; }

/* forced-colors: nothing to repair — a grid container with track sizing and gaps; it sets no colour at all. */
`,
    related: ['card', 'stat-tile', 'cluster', 'stack'],
  },

  {
    id: 'divider',
    name: 'Divider',
    category: 'layout',
    status: 'stable',
    summary: 'A rule separating content. Decorative by default; semantic only when it genuinely separates sections of content.',
    whenToUse: ['Separating groups within a menu, card or list.', 'Marking a thematic break in prose.'],
    whenNotToUse: [
      'Where spacing alone would do. Most dividers are unnecessary and add visual noise.',
      'Around every element.',
    ],
    anatomy: [
      { part: 'Rule', required: true, description: 'An <hr> or a bordered element.' },
      { part: 'Label', required: false, description: 'Optional text centred in the rule.' },
    ],
    variants: [
      { name: 'Horizontal', className: 'sk-divider', description: 'Full-width rule.', use: 'Default.' },
      { name: 'Vertical', className: 'sk-divider--vertical', description: 'Rule between inline items.', use: 'Toolbars and metadata rows.' },
      { name: 'Labelled', className: 'sk-divider--labelled', description: 'Text centred in the rule.', use: '"or" between two alternatives.' },
    ],
    sizes: [{ name: 'Hairline', className: '', height: '1px', typeStyle: 'n/a', description: 'The only size.' }],
    states: [{ name: 'Static', description: 'The only state.', trigger: 'default' }],
    props: [
      { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Axis.' },
      { name: 'label', type: 'string', description: 'Optional centred text.' },
      { name: 'decorative', type: 'boolean', default: 'true', description: 'When true, the divider is hidden from assistive technology.' },
    ],
    tokensUsed: ['color-border-subtle', 'color-text-tertiary', 'space-8', 'space-16'],
    darkMode: 'border-subtle goes darker on dark. A divider that reuses a light-mode value on a dark page produces a bright line that draws more attention than the content it separates — the same failure as table row rules.',
    accessibility: {
      role: '<hr> is role="separator" by default. Set aria-hidden="true" when purely decorative.',
      keyboard: [{ keys: 'n/a', action: 'Not interactive.' }],
      aria: [
        'Mark decorative dividers aria-hidden. A screen reader announcing "separator" eight times in a menu is pure noise.',
        'Inside a menu, use role="separator" so the grouping is conveyed.',
        'A vertical divider between inline items should always be decorative.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '1.4.11 Non-text Contrast — a divider carrying meaning must clear 3:1; a decorative one need not.'],
      screenReader: 'Silent when decorative; announced as "separator" when semantic.',
      targetSize: 'Not applicable.',
    },
    content: ['Labels are one or two words, lowercase: "or".'],
    dos: ['Prefer spacing to a divider.', 'Mark decorative dividers aria-hidden.'],
    donts: ['Do not use a divider where spacing would do.', 'Do not use a divider as a decorative flourish.'],
    html: `<hr class="sk-divider" aria-hidden="true" />

<div class="sk-divider sk-divider--labelled" aria-hidden="true">
  <span class="sk-divider__label">or</span>
</div>

<div class="sk-cluster">
  <span>Production</span>
  <span class="sk-divider sk-divider--vertical" aria-hidden="true"></span>
  <span>128 records</span>
</div>`,
    css: `.sk-divider {
  border: none;
  block-size: var(--sk-border-width-hairline);
  /* Darker on dark: a bright rule outranks the content it separates. */
  background-color: var(--sk-color-border-subtle);
  margin-block: var(--sk-space-16);
  inline-size: 100%;
}

.sk-divider--vertical {
  flex: 0 0 auto;
  inline-size: var(--sk-border-width-hairline);
  block-size: 1em;
  margin-block: 0;
  margin-inline: var(--sk-space-4);
  align-self: center;
}

.sk-divider--labelled {
  display: flex;
  align-items: center;
  gap: var(--sk-space-12);
  block-size: auto;
  background: none;
}
.sk-divider--labelled::before,
.sk-divider--labelled::after {
  content: "";
  flex: 1 1 auto;
  block-size: var(--sk-border-width-hairline);
  background-color: var(--sk-color-border-subtle);
}
.sk-divider__label { flex: 0 0 auto; font-size: var(--sk-font-size-body-sm); color: var(--sk-color-text-tertiary); }

/* A divider is entirely a background colour, so in HCM it disappears and the
   sections it separated run together. */
@media (forced-colors: active) {
  .sk-divider { background-color: CanvasText; }
  .sk-divider--labelled::before,
  .sk-divider--labelled::after { background-color: CanvasText; }
}
`,
    related: ['stack', 'menu', 'cluster'],
  },
];

import type { ComponentSpec } from './types.js';

export const navigationComponents: ComponentSpec[] = [
  {
    id: 'skip-link',
    name: 'Skip link',
    category: 'navigation',
    status: 'stable',
    summary:
      'The first focusable element on every page. Lets a keyboard user jump past the navigation straight to the content, instead of tabbing through forty links on every single page.',
    whenToUse: ['On every page. There is no exception.'],
    whenNotToUse: ['Never omit it. If the page has repeated navigation, it needs one.'],
    anatomy: [
      { part: 'Link', required: true, description: 'Anchors to the main landmark id. Hidden until focused.' },
      { part: 'Additional targets', required: false, description: 'Extra skip links to search or primary navigation on complex pages.' },
    ],
    variants: [{ name: 'Default', className: 'sk-skip-link', description: 'Reveals on focus at the top of the viewport.', use: 'Always.' }],
    sizes: [{ name: 'Medium', className: '', height: 'auto', typeStyle: 'body-md', description: 'The only size.' }],
    states: [
      { name: 'Hidden', description: 'Positioned off-screen but still in the tab order and the accessibility tree.', trigger: 'default' },
      { name: 'Focused', description: 'Slides into view at the top of the page with a high-contrast surface.', trigger: ':focus' },
    ],
    props: [
      { name: 'targetId', type: 'string', default: "'main'", description: 'The id of the element to skip to. That element needs tabindex="-1" so focus can actually land on it.' },
    ],
    tokensUsed: ['color-surface-base', 'color-text-primary', 'color-focus-ring', 'z-skip-link', 'elevation-4'],
    darkMode:
      'The skip link must be readable the instant it appears, so it uses surface-base plus a 2px border rather than a translucent overlay. Translucent surfaces are the failure mode here: on a dark page a semi-transparent skip link composites against whatever is underneath and can land anywhere between 1:1 and 15:1.',
    accessibility: {
      role: 'Native <a href="#main">.',
      keyboard: [
        { keys: 'Tab (first press on the page)', action: 'Focuses the skip link.' },
        { keys: 'Enter', action: 'Moves focus to the main landmark.' },
      ],
      aria: [
        'The target element needs tabindex="-1", otherwise the browser scrolls but focus stays behind and the next Tab returns to the navigation.',
        'Must be the first focusable element in the DOM.',
        'Never hide it with display:none or visibility:hidden — both remove it from the tab order entirely.',
      ],
      wcag: ['2.4.1 Bypass Blocks — this is the criterion.', '2.4.7 Focus Visible.', '2.4.11 Focus Not Obscured (Minimum) — it must appear above sticky headers.'],
      screenReader: 'Announced as "Skip to main content, link".',
      targetSize: 'Comfortably exceeds minimums when visible.',
    },
    content: ['"Skip to main content". Do not get creative; this is a phrase users recognise.'],
    dos: ['Place it first in the DOM.', 'Give the target tabindex="-1".', 'Set a z-index above sticky headers.'],
    donts: ['Do not hide it with display:none.', 'Do not point it at a non-existent id.', 'Do not put it after the logo.'],
    html: `<body>
  <a class="sk-skip-link" href="#main">Skip to main content</a>
  <header class="sk-top-bar"> ... </header>
  <main id="main" tabindex="-1"> ... </main>
</body>`,
    css: `.sk-skip-link {
  position: fixed;
  inset-block-start: var(--sk-space-8);
  inset-inline-start: var(--sk-space-8);
  z-index: var(--sk-z-skip-link);
  padding: var(--sk-space-12) var(--sk-space-16);
  /* Opaque, never translucent: a semi-transparent skip link composites against
     unknown content and its contrast becomes unpredictable. */
  background-color: var(--sk-color-surface-base);
  color: var(--sk-color-text-primary);
  border: var(--sk-border-width-thick) solid var(--sk-color-focus-ring);
  border-radius: var(--sk-radius-md);
  box-shadow: var(--sk-elevation-4);
  font-weight: var(--sk-font-weight-medium);
  text-decoration: none;
  /* Moved out of view rather than hidden, so it keeps its place in the tab order. */
  translate: 0 -200%;
  transition: translate var(--sk-duration-fast) var(--sk-easing-entrance);
}

.sk-skip-link:focus { translate: 0 0; }

@media (prefers-reduced-motion: reduce) { .sk-skip-link { transition: none; } }

/* The skip link is invisible until focused, and its focused appearance is a
   background and a shadow. In HCM that leaves it readable only by luck. */
@media (forced-colors: active) {
  .sk-skip-link:focus { background-color: Canvas; color: CanvasText; border: 1px solid CanvasText; outline-color: Highlight; }
}
`,
    related: ['top-bar', 'side-nav'],
  },

  {
    id: 'top-bar',
    name: 'Top bar',
    category: 'navigation',
    status: 'stable',
    summary:
      'The persistent application header: product identity, global search, the theme toggle, notifications and the account menu. It is the one element present on every screen, so it must stay small.',
    whenToUse: ['Every page of an application shell.'],
    whenNotToUse: ['Inside a dialog or an embedded widget.'],
    anatomy: [
      { part: 'Navigation trigger', required: false, description: 'Opens the drawer below the lg breakpoint.' },
      { part: 'Product identity', required: true, description: 'Logo and product name, linking home.' },
      { part: 'Global search', required: false, description: 'Collapses to an icon on narrow screens.' },
      { part: 'Utilities', required: false, description: 'Theme toggle, notifications, help.' },
      { part: 'Account menu', required: true, description: 'Avatar opening a menu with profile, settings and sign out.' },
      { part: 'Environment marker', required: false, description: 'A badge when the user is not in production. Cheap insurance against a very expensive class of mistake.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-top-bar', description: 'Subtle surface with a bottom border.', use: 'Standard applications.' },
      { name: 'Brand', className: 'sk-top-bar--brand', description: 'Brand-filled.', use: 'Marketing and sign-in surfaces.' },
      { name: 'Sticky', className: 'sk-top-bar--sticky', description: 'Pinned to the top of the viewport.', use: 'Long scrolling pages. Costs vertical space, so justify it.' },
    ],
    sizes: [
      { name: 'Compact', className: 'sk-top-bar--compact', height: '3rem', typeStyle: 'body-sm', description: 'Dense operator tools.' },
      { name: 'Medium', className: '', height: '3.5rem', typeStyle: 'body-md', description: 'Default.' },
    ],
    states: [
      { name: 'Rest', description: 'Flat.', trigger: 'default' },
      { name: 'Scrolled', description: 'Gains elevation 2 once the page scrolls, so it separates from the content beneath.', trigger: '[data-scrolled]' },
    ],
    props: [
      { name: 'sticky', type: 'boolean', default: 'true', description: 'Pin to the viewport top.' },
      { name: 'environment', type: 'string', description: 'Shows an environment badge when set to anything but production.' },
    ],
    tokensUsed: ['color-surface-subtle', 'color-border-subtle', 'color-text-primary', 'z-header', 'elevation-2', 'space-16'],
    darkMode:
      'The top bar uses surface-subtle, which is *lighter* than the page in dark mode (neutral-900 against neutral-950) and *darker* in light mode (neutral-50 against white). That inversion is deliberate: in both cases the bar separates from the content, but the direction of separation flips. A single hard-coded grey cannot do this, which is the clearest practical argument for semantic tokens.',
    accessibility: {
      role: '<header> with role="banner". Contains a <nav> for the primary navigation.',
      keyboard: [
        { keys: 'Tab', action: 'Moves through the bar in visual order.' },
        { keys: 'Escape', action: 'Closes any open menu and restores focus to its trigger.' },
      ],
      aria: [
        'role="banner" is implicit on a top-level <header>; do not add it redundantly on a nested one.',
        'The nav trigger uses aria-expanded and aria-controls.',
        'Notification counts need text, not just a dot: "Notifications, 3 unread".',
        'The environment badge must be readable text, not colour alone.',
      ],
      wcag: ['1.3.6 Identify Purpose.', '2.4.1 Bypass Blocks.', '2.4.11 Focus Not Obscured — a sticky bar must not cover a focused element, handled with scroll-margin on focus targets.', '3.2.3 Consistent Navigation.'],
      screenReader: 'Announced as the banner landmark. Screen reader users navigate directly to it by landmark.',
      targetSize: 'Every control in the bar meets 24x24 CSS px; icon buttons get 44px on coarse pointers.',
    },
    content: [
      'Product name, not company name.',
      'The environment badge names the environment plainly: "Staging".',
      'Notification counts are capped: "99+".',
    ],
    dos: [
      'Keep the bar under 64px.',
      'Set scroll-margin-block-start on focusable content so a sticky bar never hides the focused element.',
      'Show the environment whenever it is not production.',
    ],
    donts: [
      'Do not put page-specific actions in the top bar; they belong in the Page header.',
      'Do not make it taller than 64px.',
      'Do not hide global search behind an icon on desktop.',
    ],
    html: `<header class="sk-top-bar sk-top-bar--sticky">
  <button type="button" class="sk-icon-button sk-top-bar__nav-trigger"
          aria-expanded="false" aria-controls="primary-nav">
    <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-menu" /></svg>
    <span class="sk-visually-hidden">Open navigation</span>
  </button>

  <a class="sk-top-bar__identity" href="/">
    <svg class="sk-top-bar__logo" aria-hidden="true" focusable="false" width="24" height="24"><use href="#sk-logo" /></svg>
    <span class="sk-top-bar__product">Sekura Console</span>
  </a>

  <span class="sk-badge sk-badge--warning sk-top-bar__environment">Staging</span>

  <form class="sk-search sk-search--sm sk-top-bar__search" role="search"> ... </form>

  <div class="sk-top-bar__utilities">
    <button type="button" class="sk-icon-button" data-sk-theme-toggle>
      <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-contrast" /></svg>
      <span class="sk-visually-hidden">Change colour theme</span>
    </button>
    <button type="button" class="sk-icon-button" aria-haspopup="menu" aria-expanded="false">
      <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-bell" /></svg>
      <span class="sk-visually-hidden">Notifications, 3 unread</span>
    </button>
    <button type="button" class="sk-top-bar__account" aria-haspopup="menu" aria-expanded="false">
      <span class="sk-avatar sk-avatar--sm" aria-hidden="true">AK</span>
      <span class="sk-visually-hidden">Account menu for Andre Kim</span>
    </button>
  </div>
</header>`,
    css: `.sk-top-bar {
  display: flex;
  align-items: center;
  gap: var(--sk-space-12);
  flex-wrap: nowrap;
  min-block-size: 3.5rem;
  padding-inline: var(--sk-space-16);
  /* Lighter than the page in dark mode, darker in light mode — the separation
     direction inverts, which a hard-coded grey cannot express. */
  background-color: var(--sk-color-surface-subtle);
  border-block-end: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  color: var(--sk-color-text-primary);
}

.sk-top-bar--sticky {
  position: sticky;
  inset-block-start: 0;
  z-index: var(--sk-z-header);
}

.sk-top-bar[data-scrolled] { box-shadow: var(--sk-elevation-2); }

.sk-top-bar__nav-trigger { flex: 0 0 auto; }
@media (min-width: 64rem) { .sk-top-bar__nav-trigger { display: none; } }

.sk-top-bar__identity {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--sk-space-8);
  min-inline-size: 0;
  color: inherit;
  text-decoration: none;
  font-weight: var(--sk-font-weight-semibold);
}
.sk-top-bar__logo { flex: 0 0 auto; fill: var(--sk-color-text-brand); }
.sk-top-bar__product { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* The product name is the first thing to go when space runs out. */
@media (max-width: 30rem) { .sk-top-bar__product { display: none; } }

.sk-top-bar__environment { flex: 0 0 auto; }

/* Search absorbs all remaining space, then yields it back rather than overflowing. */
.sk-top-bar__search { flex: 1 1 auto; min-inline-size: 0; margin-inline: auto; }
@media (max-width: 48rem) { .sk-top-bar__search { display: none; } }

.sk-top-bar__utilities {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--sk-space-4);
  margin-inline-start: auto;
}

.sk-top-bar__account {
  display: inline-flex;
  align-items: center;
  padding: var(--sk-space-4);
  border: none;
  border-radius: var(--sk-radius-full);
  background: transparent;
  cursor: pointer;
}
.sk-top-bar__account:hover { background-color: var(--sk-color-surface-hover); }
.sk-top-bar__account:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}

.sk-top-bar--brand {
  background-color: var(--sk-color-surface-brand);
  color: var(--sk-color-text-on-brand);
  border-block-end-color: transparent;
}
.sk-top-bar--brand .sk-top-bar__logo { fill: currentColor; }

.sk-top-bar--compact { min-block-size: 3rem; }

/* A sticky bar must never cover the element the user just focused. */
:target, [tabindex="-1"]:focus { scroll-margin-block-start: 5rem; }

/* The scrolled state is announced by a shadow appearing, which HCM never
   renders, so the bar needs a permanent bottom edge to stay distinct from the
   content scrolling under it. */
@media (forced-colors: active) {
  .sk-top-bar { border-block-end: 1px solid CanvasText; }
}
`,
    related: ['side-nav', 'menu', 'search-field', 'avatar', 'theme-toggle'],
  },

  {
    id: 'side-nav',
    name: 'Side navigation',
    category: 'navigation',
    status: 'stable',
    summary:
      'The primary navigation rail. Persistent on desktop, a focus-trapped drawer below the lg breakpoint. Shows only destinations the user is actually allowed to reach.',
    whenToUse: ['Applications with more than about five top-level destinations.', 'Anywhere a persistent sense of location matters.'],
    whenNotToUse: ['Fewer than five destinations — put them in the top bar.', 'Marketing sites.'],
    anatomy: [
      { part: 'Nav landmark', required: true, description: '<nav aria-label="Primary">. The label is what distinguishes it from other navs.' },
      { part: 'Groups', required: false, description: 'Labelled sections. Group labels are headings, not clickable.' },
      { part: 'Items', required: true, description: 'Links with an icon and a visible text label.' },
      { part: 'Current marker', required: true, description: 'aria-current="page" plus a 3px leading bar. Two signals, not one.' },
      { part: 'Nested items', required: false, description: 'One level of nesting only, inside a disclosure.' },
      { part: 'Collapse toggle', required: false, description: 'Shrinks the rail to icons. Persisted per user.' },
    ],
    variants: [
      { name: 'Expanded', className: 'sk-side-nav', description: 'Icons and labels.', use: 'Default.' },
      { name: 'Collapsed', className: 'sk-side-nav--collapsed', description: 'Icons only, with tooltips.', use: 'Users who want maximum content width. Never the default for a new user.' },
      { name: 'Drawer', className: 'sk-side-nav--drawer', description: 'Overlay drawer with focus trapping.', use: 'Below the lg breakpoint.' },
    ],
    sizes: [
      { name: 'Standard', className: '', height: '16rem wide', typeStyle: 'body-sm', description: 'Default rail width.' },
      { name: 'Collapsed', className: 'sk-side-nav--collapsed', height: '3.5rem wide', typeStyle: 'icon only', description: 'Icon rail.' },
    ],
    states: [
      { name: 'Rest', description: 'Items at text-secondary.', trigger: 'default' },
      { name: 'Hover', description: 'Subtle wash, text goes primary.', trigger: ':hover' },
      { name: 'Current', description: 'Selected surface, brand text, 3px leading bar, aria-current="page".', trigger: '[aria-current="page"]' },
      { name: 'Focus visible', description: 'Inset focus ring so it is not clipped by the rail edge.', trigger: ':focus-visible' },
      { name: 'Expanded group', description: 'Disclosure open, aria-expanded="true".', trigger: '[aria-expanded="true"]' },
    ],
    props: [
      { name: 'items', type: 'NavItem[]', required: true, description: 'Destinations. Filter server-side by permission — never render and hide.' },
      { name: 'collapsed', type: 'boolean', default: 'false', description: 'Icon-only mode.' },
      { name: 'label', type: 'string', default: "'Primary'", description: 'Accessible name for the nav landmark.' },
    ],
    tokensUsed: ['color-surface-subtle', 'color-surface-selected', 'color-text-secondary', 'color-text-brand', 'color-border-brand', 'color-focus-ring', 'radius-md'],
    darkMode:
      'The current-page marker is the detail that breaks. In light mode a cobalt-50 tint is plainly visible; in dark mode cobalt-950 against neutral-950 is nearly identical in lightness. The 3px brand-coloured leading bar is therefore not decorative — it is the primary signal in dark mode, and the tint is the secondary one. Any implementation that ships only the tint will look broken to dark-mode users.',
    accessibility: {
      role: '<nav aria-label="Primary"> containing a <ul>.',
      keyboard: [
        { keys: 'Tab', action: 'Moves through items. Each is a normal tab stop; do not impose a roving tabindex on a list of links.' },
        { keys: 'Enter', action: 'Navigate.' },
        { keys: 'Escape', action: 'Closes the drawer and returns focus to the trigger.' },
      ],
      aria: [
        'aria-label on the nav, because a page usually has several nav landmarks.',
        'aria-current="page" on exactly one item.',
        'Group headings are real headings or aria-labelledby on a nested list — not styled divs.',
        'Disclosure toggles use aria-expanded and aria-controls.',
        'In drawer mode: role="dialog", aria-modal="true", focus trapped, focus restored on close.',
        'Collapsed mode requires tooltips *and* visually hidden labels; a tooltip is not an accessible name.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.1.2 No Keyboard Trap — the drawer traps deliberately and Escape always exits.', '2.4.1 Bypass Blocks.', '2.4.8 Location.', '3.2.3 Consistent Navigation.'],
      screenReader: 'Announced as "Primary, navigation, list, N items". The current item adds "current page".',
      targetSize: 'Items are at least 36px tall, comfortably above the minimum.',
    },
    content: [
      'Item labels are nouns naming the destination: "Projects", not "Manage projects".',
      'Group labels categorise: "Operations", "Administration".',
      'Keep labels to one or two words so they never wrap in the rail.',
    ],
    dos: [
      'Filter destinations server-side by permission.',
      'Mark the current page with both aria-current and a visible non-colour marker.',
      'Persist the collapsed preference per user.',
    ],
    donts: [
      'Do not render links the user cannot follow.',
      'Do not nest more than one level.',
      'Do not use colour alone for the current item.',
      'Do not default new users into collapsed mode.',
    ],
    html: `<nav class="sk-side-nav" aria-label="Primary" id="primary-nav">
  <ul class="sk-side-nav__list">
    <li>
      <a class="sk-side-nav__item" href="/dashboard">
        <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-home" /></svg>
        <span class="sk-side-nav__label">Dashboard</span>
      </a>
    </li>
    <li>
      <a class="sk-side-nav__item" href="/projects" aria-current="page">
        <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-globe" /></svg>
        <span class="sk-side-nav__label">Projects</span>
        <span class="sk-side-nav__count">128</span>
      </a>
    </li>
  </ul>

  <h2 class="sk-side-nav__group-label" id="nav-admin">Administration</h2>
  <ul class="sk-side-nav__list" aria-labelledby="nav-admin">
    <li>
      <a class="sk-side-nav__item" href="/users">
        <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-users" /></svg>
        <span class="sk-side-nav__label">Users</span>
      </a>
    </li>
  </ul>
</nav>`,
    css: `.sk-side-nav {
  display: flex;
  flex-direction: column;
  gap: var(--sk-space-4);
  /* Fixed basis, allowed to shrink, never to grow: the content area takes the slack. */
  flex: 0 0 16rem;
  min-inline-size: 0;
  padding: var(--sk-space-12) var(--sk-space-8);
  background-color: var(--sk-color-surface-subtle);
  border-inline-end: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.sk-side-nav__list { display: flex; flex-direction: column; gap: var(--sk-space-2); margin: 0; padding: 0; list-style: none; }

.sk-side-nav__group-label {
  margin-block: var(--sk-space-16) var(--sk-space-4);
  padding-inline: var(--sk-space-12);
  font-size: var(--sk-font-size-overline);
  line-height: var(--sk-line-height-overline);
  font-weight: var(--sk-font-weight-semibold);
  letter-spacing: var(--sk-letter-spacing-overline);
  text-transform: uppercase;
  color: var(--sk-color-text-tertiary);
}

.sk-side-nav__item {
  display: flex;
  align-items: center;
  gap: var(--sk-space-10);
  min-inline-size: 0;
  min-block-size: 2.25rem;
  padding-inline: var(--sk-space-12);
  padding-block: var(--sk-space-6);
  border-radius: var(--sk-radius-md);
  color: var(--sk-color-text-secondary);
  font-size: var(--sk-font-size-body-sm);
  text-decoration: none;
  position: relative;
  transition: background-color var(--sk-duration-fast) var(--sk-easing-standard);
}

.sk-side-nav__item > svg { flex: 0 0 auto; fill: currentColor; }
.sk-side-nav__label { flex: 1 1 auto; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sk-side-nav__count {
  flex: 0 0 auto;
  font-size: var(--sk-font-size-body-xs);
  font-variant-numeric: tabular-nums;
  color: var(--sk-color-text-tertiary);
}

.sk-side-nav__item:hover { background-color: var(--sk-color-surface-hover); color: var(--sk-color-text-primary); }

.sk-side-nav__item[aria-current="page"] {
  background-color: var(--sk-color-surface-selected);
  color: var(--sk-color-text-brand);
  font-weight: var(--sk-font-weight-medium);
}

/* In dark mode the selected tint is nearly invisible, so this bar — not the tint —
   is what actually communicates "you are here". It is required, not decorative. */
.sk-side-nav__item[aria-current="page"]::before {
  content: "";
  position: absolute;
  inset-inline-start: 0;
  inset-block: var(--sk-space-6);
  inline-size: 3px;
  border-radius: var(--sk-radius-full);
  background-color: var(--sk-color-border-brand);
}

.sk-side-nav__item:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  /* Inset, so the ring is not clipped by the rail's overflow. */
  outline-offset: -2px;
}

/* --- Collapsed --- */
.sk-side-nav--collapsed { flex-basis: 3.5rem; }
.sk-side-nav--collapsed .sk-side-nav__label,
.sk-side-nav--collapsed .sk-side-nav__count,
.sk-side-nav--collapsed .sk-side-nav__group-label { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.sk-side-nav--collapsed .sk-side-nav__item { justify-content: center; padding-inline: 0; }

/* --- Drawer, below lg --- */
@media (max-width: 63.999rem) {
  .sk-side-nav {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    z-index: var(--sk-z-drawer);
    inline-size: min(20rem, 85vw);
    box-shadow: var(--sk-elevation-4);
    translate: -100% 0;
    transition: translate var(--sk-duration-slow) var(--sk-easing-entrance);
  }
  .sk-side-nav[data-open] { translate: 0 0; }
  [dir="rtl"] .sk-side-nav { translate: 100% 0; }
  [dir="rtl"] .sk-side-nav[data-open] { translate: 0 0; }
}

@media (prefers-reduced-motion: reduce) { .sk-side-nav { transition: none; } }

/* HCM discards the selected item's background and drops the rail's shadow, so
   the current page becomes indistinguishable from its neighbours. The leading
   bar is redrawn from Highlight, which is the one thing HCM guarantees stands
   out against Canvas. */
@media (forced-colors: active) {
  .sk-side-nav { border-inline-end: 1px solid CanvasText; }
  .sk-side-nav__item[aria-current="page"] { background-color: Highlight; color: HighlightText; }
  .sk-side-nav__item[aria-current="page"]::before { background-color: HighlightText; }
  .sk-side-nav__item:focus-visible { outline-color: Highlight; }
}
`,
    related: ['top-bar', 'app-shell', 'breadcrumbs', 'drawer'],
  },

  {
    id: 'breadcrumbs',
    name: 'Breadcrumbs',
    category: 'navigation',
    status: 'stable',
    summary:
      'Shows where the current page sits in the hierarchy and offers one-click escape to any ancestor. Useful exactly when the hierarchy is real and more than two levels deep.',
    whenToUse: ['Hierarchies three or more levels deep.', 'Detail pages reached from a list, where returning to the list is the common next move.'],
    whenNotToUse: ['Flat structures.', 'As a substitute for a back button — they show structure, not history.', 'Single-level applications.'],
    anatomy: [
      { part: 'Nav landmark', required: true, description: '<nav aria-label="Breadcrumb">.' },
      { part: 'Ordered list', required: true, description: '<ol> — the order is meaningful.' },
      { part: 'Ancestor links', required: true, description: 'Each level up.' },
      { part: 'Current page', required: true, description: 'Not a link, marked aria-current="page".' },
      { part: 'Separator', required: true, description: 'A CSS ::after, so screen readers never read "slash" between every item.' },
      { part: 'Overflow', required: false, description: 'A menu replacing middle items when the trail is too long.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-breadcrumbs', description: 'Full trail.', use: 'Most cases.' },
      { name: 'Collapsed', className: 'sk-breadcrumbs--collapsed', description: 'First, an overflow menu, then the last two.', use: 'Deep hierarchies or narrow viewports.' },
    ],
    sizes: [{ name: 'Small', className: '', height: 'auto', typeStyle: 'body-sm', description: 'The only size. Breadcrumbs are supporting information.' }],
    states: [
      { name: 'Rest', description: 'Links at text-secondary, current at text-primary.', trigger: 'default' },
      { name: 'Hover', description: 'Link underlines.', trigger: ':hover' },
      { name: 'Overflowing', description: 'Middle items collapse into a menu.', trigger: '[data-collapsed]' },
    ],
    props: [
      { name: 'items', type: 'Array<{label, href?}>', required: true, description: 'Trail, root first. The last item has no href.' },
      { name: 'maxItems', type: 'number', default: '4', description: 'Collapse threshold.' },
    ],
    tokensUsed: ['color-text-secondary', 'color-text-primary', 'color-text-tertiary', 'color-text-link', 'space-8'],
    darkMode: 'Separators use text-tertiary, which is audited at 4.5:1 in both themes even though a separator is arguably decorative. Holding it to text contrast rather than the 3:1 graphical minimum keeps the trail scannable on dark, where thin glyphs disappear first.',
    accessibility: {
      role: '<nav aria-label="Breadcrumb"> wrapping an <ol>.',
      keyboard: [{ keys: 'Tab', action: 'Through the links. The current page is not focusable because it is not a link.' }],
      aria: [
        'aria-label="Breadcrumb" on the nav.',
        'aria-current="page" on the final item.',
        'Separators must be CSS-generated or aria-hidden. A literal "/" character in the DOM is read aloud between every item.',
        'The final item is plain text, not a link to the current page.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.4.8 Location — this is the criterion breadcrumbs satisfy.', '2.4.4 Link Purpose.'],
      screenReader: 'Announced as "Breadcrumb, navigation, list, 4 items", then each item, with the last as "current page".',
      targetSize: 'Links get vertical padding to reach 24px.',
    },
    content: [
      'Use the same label as the destination page title.',
      'Truncate long middle items with an ellipsis, keeping the full text in a title attribute and in the accessible name.',
      'The root is the application home or the top-level section, not "Home" if that page does not exist.',
    ],
    dos: ['Use an ordered list.', 'Generate separators in CSS.', 'Mark the current page with aria-current.'],
    donts: ['Do not link the current page to itself.', 'Do not use breadcrumbs as history.', 'Do not put separators in the DOM as text.'],
    html: `<nav class="sk-breadcrumbs" aria-label="Breadcrumb">
  <ol class="sk-breadcrumbs__list">
    <li class="sk-breadcrumbs__item"><a class="sk-link sk-link--quiet" href="/projects">Projects</a></li>
    <li class="sk-breadcrumbs__item"><a class="sk-link sk-link--quiet" href="/projects/website-redesign">Website redesign</a></li>
    <li class="sk-breadcrumbs__item"><a class="sk-link sk-link--quiet" href="/projects/website-redesign/tasks">Records</a></li>
    <li class="sk-breadcrumbs__item"><span aria-current="page">www A record</span></li>
  </ol>
</nav>`,
    css: `.sk-breadcrumbs { min-inline-size: 0; }

.sk-breadcrumbs__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sk-space-4) var(--sk-space-8);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--sk-font-size-body-sm);
}

.sk-breadcrumbs__item {
  display: flex;
  align-items: center;
  gap: var(--sk-space-8);
  min-inline-size: 0;
  color: var(--sk-color-text-secondary);
}

/* Separator is generated, never in the DOM: a literal "/" is read aloud between
   every single item by a screen reader. */
.sk-breadcrumbs__item:not(:last-child)::after {
  content: "/";
  color: var(--sk-color-text-tertiary);
  /* Logical flip for RTL. */
  transform: scaleX(var(--sk-dir-scale, 1));
}
[dir="rtl"] .sk-breadcrumbs__item:not(:last-child)::after { content: "\\\\"; }

.sk-breadcrumbs__item > a,
.sk-breadcrumbs__item > span {
  padding-block: var(--sk-space-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-inline-size: 16rem;
}

.sk-breadcrumbs__item [aria-current="page"] {
  color: var(--sk-color-text-primary);
  font-weight: var(--sk-font-weight-medium);
}`,
    related: ['side-nav', 'page-header', 'link'],
  },

  {
    id: 'tabs',
    name: 'Tabs',
    category: 'navigation',
    status: 'stable',
    summary:
      'Switches between peer views of the same subject without leaving the page. Tabs are for alternate views of one thing, not for steps or for unrelated destinations.',
    whenToUse: [
      'Two to seven peer views of one resource: Overview, Records, History, Permissions.',
      'Views a user compares by flipping back and forth.',
    ],
    whenNotToUse: [
      'Sequential steps — use a Stepper.',
      'Unrelated destinations — use navigation.',
      'Content that must be read in order, or printed together.',
      'More than about seven panels.',
    ],
    anatomy: [
      { part: 'Tab list', required: true, description: 'role="tablist", horizontally scrollable when it overflows.' },
      { part: 'Tabs', required: true, description: 'role="tab" with aria-selected and aria-controls.' },
      { part: 'Active indicator', required: true, description: 'A 2px underline on the selected tab.' },
      { part: 'Panels', required: true, description: 'role="tabpanel", labelled by its tab, tabindex="0" so keyboard users can scroll it.' },
      { part: 'Counts', required: false, description: 'Item counts in the tab label.' },
    ],
    variants: [
      { name: 'Underline', className: 'sk-tabs', description: 'Underlined active tab.', use: 'Default, for page-level tabs.' },
      { name: 'Enclosed', className: 'sk-tabs--enclosed', description: 'Folder-style tabs joined to the panel.', use: 'Tabs inside a card, where an underline would compete with the card border.' },
      { name: 'Routed', className: 'sk-tabs--routed', description: 'Each tab is a link that changes the URL.', use: 'Whenever a tab view should be bookmarkable and survive a refresh. Preferred for application tabs.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-tabs--sm', height: '2rem', typeStyle: 'body-sm', description: 'Tabs inside a panel.' },
      { name: 'Medium', className: '', height: '2.75rem', typeStyle: 'body-md', description: 'Default.' },
    ],
    states: [
      { name: 'Rest', description: 'Secondary text, no indicator.', trigger: 'default' },
      { name: 'Hover', description: 'Primary text, faint underline.', trigger: ':hover' },
      { name: 'Selected', description: 'Brand text, 2px brand underline, aria-selected="true".', trigger: '[aria-selected="true"]' },
      { name: 'Focus visible', description: 'Focus ring on the tab.', trigger: ':focus-visible' },
      { name: 'Disabled', description: 'Rare. Prefer hiding a tab over disabling it.', trigger: '[aria-disabled="true"]' },
      { name: 'Overflowing', description: 'The list scrolls horizontally with scroll-snap and fade affordances.', trigger: '[data-overflow]' },
    ],
    props: [
      { name: 'tabs', type: 'Array<{id, label, count?, href?}>', required: true, description: 'The tabs.' },
      { name: 'selected', type: 'string', required: true, description: 'Selected tab id.' },
      { name: 'routed', type: 'boolean', default: 'false', description: 'Render tabs as links driving the URL.' },
      { name: 'activation', type: "'automatic' | 'manual'", default: "'automatic'", description: 'Automatic selects on arrow; manual requires Enter. Use manual when panels are expensive to load.' },
    ],
    tokensUsed: ['color-text-secondary', 'color-text-brand', 'color-border-brand', 'color-border-subtle', 'color-focus-ring'],
    darkMode:
      'The active underline uses border-brand, stepping from cobalt-600 to cobalt-400 so it holds 3:1 against the dark page. The inactive tab-list bottom rule uses border-subtle, which must go *darker* (neutral-800) on dark — reusing the light-mode neutral-200 would produce a bright line that visually outranks the active indicator it is supposed to sit behind.',
    accessibility: {
      role: 'ARIA tabs pattern, or plain links for the routed variant. Routed tabs are links and must not carry role="tab".',
      keyboard: [
        { keys: 'Tab', action: 'Moves to the tab list (landing on the selected tab), then to the panel. The list is one tab stop.' },
        { keys: 'Arrow Left / Right', action: 'Move between tabs, following text direction.' },
        { keys: 'Home / End', action: 'First or last tab.' },
        { keys: 'Enter / Space', action: 'Activates, in manual activation mode.' },
      ],
      aria: [
        'role="tablist" with aria-label.',
        'Each tab: role="tab", aria-selected, aria-controls pointing at its panel.',
        'Each panel: role="tabpanel", aria-labelledby pointing back at its tab, tabindex="0".',
        'Roving tabindex across the tabs.',
        'The routed variant uses <a> plus aria-current="page" and no tab roles at all — mixing link semantics with tab roles confuses everything.',
        'Counts must be inside the accessible name: "Records, 128 items".',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.1.1 Keyboard.', '2.4.3 Focus Order.', '3.2.2 On Input — automatic activation is permitted because the change is local and reversible.', '4.1.2 Name, Role, Value.'],
      screenReader: 'Announced as "<label>, tab list", then "<tab>, tab, selected, 2 of 4".',
      targetSize: 'Tabs are at least 40px tall.',
    },
    content: [
      'Tab labels are nouns, one or two words: "Records", "History".',
      'Include counts where they help scanning, in both the label and the accessible name.',
      'Never label a tab "More".',
    ],
    dos: [
      'Prefer routed tabs so views are linkable and survive refresh.',
      'Keep the panel height stable where you can, to avoid layout jumps.',
      'Scroll the tab list horizontally rather than wrapping it to two rows.',
    ],
    donts: [
      'Do not use tabs for a sequence.',
      'Do not nest tabs inside tabs.',
      'Do not hide required form fields inside an unselected tab — a validation error the user cannot see is a dead end.',
    ],
    html: `<div class="sk-tabs">
  <div class="sk-tabs__list" role="tablist" aria-label="Project views">
    <button class="sk-tabs__tab" role="tab" id="tab-overview"
            aria-selected="true" aria-controls="panel-overview" tabindex="0">Overview</button>
    <button class="sk-tabs__tab" role="tab" id="tab-records"
            aria-selected="false" aria-controls="panel-records" tabindex="-1">
      Tasks <span class="sk-tabs__count">34</span>
    </button>
  </div>

  <div class="sk-tabs__panel" role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" tabindex="0"> ... </div>
  <div class="sk-tabs__panel" role="tabpanel" id="panel-records" aria-labelledby="tab-records" tabindex="0" hidden> ... </div>
</div>

<!-- Routed: links, aria-current, no tab roles -->
<nav class="sk-tabs sk-tabs--routed" aria-label="Project views">
  <div class="sk-tabs__list">
    <a class="sk-tabs__tab" href="/projects/website-redesign" aria-current="page">Overview</a>
    <a class="sk-tabs__tab" href="/projects/website-redesign/tasks">Tasks <span class="sk-tabs__count">34</span></a>
  </div>
</nav>`,
    css: `.sk-tabs { display: flex; flex-direction: column; min-inline-size: 0; }

.sk-tabs__list {
  display: flex;
  align-items: stretch;
  gap: var(--sk-space-4);
  min-inline-size: 0;
  /* Scroll rather than wrap: a two-row tab list destroys the underline metaphor. */
  overflow-x: auto;
  scrollbar-width: thin;
  scroll-snap-type: x proximity;
  border-block-end: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
}

.sk-tabs__tab {
  flex: 0 0 auto;
  scroll-snap-align: start;
  display: inline-flex;
  align-items: center;
  gap: var(--sk-space-8);
  min-block-size: 2.75rem;
  padding-inline: var(--sk-space-12);
  border: none;
  border-block-end: var(--sk-border-width-thick) solid transparent;
  background: transparent;
  color: var(--sk-color-text-secondary);
  font-family: var(--sk-font-family-sans);
  font-size: var(--sk-font-size-body-md);
  font-weight: var(--sk-font-weight-medium);
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
  /* Pulls the underline down onto the list's own bottom rule. */
  margin-block-end: calc(var(--sk-border-width-hairline) * -1);
  transition: color var(--sk-duration-fast) var(--sk-easing-standard),
              border-color var(--sk-duration-fast) var(--sk-easing-standard);
}

.sk-tabs__tab:hover { color: var(--sk-color-text-primary); border-block-end-color: var(--sk-color-border-default); }

.sk-tabs__tab[aria-selected="true"],
.sk-tabs__tab[aria-current="page"] {
  color: var(--sk-color-text-brand);
  border-block-end-color: var(--sk-color-border-brand);
  font-weight: var(--sk-font-weight-semibold);
}

.sk-tabs__tab:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: -2px;
  border-radius: var(--sk-radius-sm);
}

.sk-tabs__tab[aria-disabled="true"] { color: var(--sk-color-text-disabled); cursor: not-allowed; }

.sk-tabs__count {
  padding-inline: var(--sk-space-6);
  border-radius: var(--sk-radius-full);
  background-color: var(--sk-color-surface-sunken);
  font-size: var(--sk-font-size-body-xs);
  font-variant-numeric: tabular-nums;
  color: var(--sk-color-text-secondary);
}

.sk-tabs__panel { padding-block-start: var(--sk-space-24); min-inline-size: 0; }
.sk-tabs__panel:focus-visible { outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring); outline-offset: var(--sk-focus-ring-offset); }

/* --- Enclosed --- */
.sk-tabs--enclosed .sk-tabs__tab {
  border: var(--sk-border-width-hairline) solid transparent;
  border-block-end: none;
  border-radius: var(--sk-radius-md) var(--sk-radius-md) 0 0;
  margin-block-end: 0;
}
.sk-tabs--enclosed .sk-tabs__tab[aria-selected="true"] {
  background-color: var(--sk-color-surface-raised);
  border-color: var(--sk-color-border-default);
}

.sk-tabs--sm .sk-tabs__tab { min-block-size: 2rem; font-size: var(--sk-font-size-body-sm); }

/* The active underline is a border, which survives — but its colour does not,
   so the selected tab has to be re-marked. The enclosed variant relies on a
   background to join the tab to its panel and needs a border instead. */
@media (forced-colors: active) {
  .sk-tabs__list { border-block-end-color: CanvasText; }
  .sk-tabs__tab[aria-selected="true"],
  .sk-tabs__tab[aria-current="page"] { border-block-end-color: Highlight; color: Highlight; }
  .sk-tabs--enclosed .sk-tabs__tab[aria-selected="true"] { border-color: CanvasText; }
  .sk-tabs__tab:focus-visible { outline-color: Highlight; }
  .sk-tabs__tab[aria-disabled="true"] { color: GrayText; }
}
`,
    related: ['button-group', 'stepper', 'card', 'side-nav'],
  },

  {
    id: 'pagination',
    name: 'Pagination',
    category: 'navigation',
    status: 'stable',
    summary:
      'Moves through a paged result set and reports position. Preferred over infinite scroll wherever users need to reach a specific place, share a link, or reach the footer.',
    whenToUse: ['Server-paged lists and tables.', 'Result sets where the total matters.', 'Anything a user might want to link to.'],
    whenNotToUse: ['Feeds where position is meaningless.', 'Fewer results than one page holds — render nothing rather than a disabled control.'],
    anatomy: [
      { part: 'Nav landmark', required: true, description: '<nav aria-label="Pagination">.' },
      { part: 'Previous / Next', required: true, description: 'Disabled at the ends, with aria-disabled so they stay announced.' },
      { part: 'Page numbers', required: false, description: 'With ellipsis truncation for long ranges.' },
      { part: 'Status', required: true, description: '"Showing 21–40 of 128". This is the part users actually read.' },
      { part: 'Page size', required: false, description: 'A select for results per page.' },
    ],
    variants: [
      { name: 'Numbered', className: 'sk-pagination', description: 'Full page numbers.', use: 'Known, bounded totals.' },
      { name: 'Simple', className: 'sk-pagination--simple', description: 'Previous / Next plus status.', use: 'Large or unknown totals, and narrow layouts.' },
      { name: 'Cursor', className: 'sk-pagination--cursor', description: 'Previous / Next only, no totals.', use: 'Cursor-paginated APIs where a count would be expensive or unstable.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-pagination--sm', height: '2rem', typeStyle: 'body-sm', description: 'Inside cards.' },
      { name: 'Medium', className: '', height: '2.5rem', typeStyle: 'body-sm', description: 'Default.' },
    ],
    states: [
      { name: 'Rest', description: 'Current page marked.', trigger: 'default' },
      { name: 'Current', description: 'Selected surface plus aria-current="page".', trigger: '[aria-current="page"]' },
      { name: 'At boundary', description: 'Previous or Next disabled with aria-disabled, not removed.', trigger: '[aria-disabled="true"]' },
      { name: 'Loading', description: 'Controls disabled, "Loading page 3" announced politely.', trigger: '[data-loading]' },
    ],
    props: [
      { name: 'page', type: 'number', required: true, description: 'Current page, 1-based.' },
      { name: 'pageSize', type: 'number', required: true, description: 'Items per page.' },
      { name: 'total', type: 'number', description: 'Total items. Omit for cursor pagination.' },
      { name: 'siblingCount', type: 'number', default: '1', description: 'Page numbers shown either side of the current page.' },
    ],
    tokensUsed: ['color-surface-selected', 'color-text-brand', 'color-text-secondary', 'color-border-default', 'color-focus-ring', 'radius-md'],
    darkMode: 'The current page marker again pairs surface-selected with a brand border, for the same reason as side navigation: the dark-mode tint alone does not read. Disabled arrows use text-disabled, which is deliberately exempt from contrast minimums but must still be visibly different from enabled ones — in dark mode that means neutral-600, not a mere opacity reduction, since opacity on a dark surface flattens toward the background too quickly.',
    accessibility: {
      role: '<nav aria-label="Pagination"> containing a list of links or buttons.',
      keyboard: [
        { keys: 'Tab', action: 'Through each control.' },
        { keys: 'Enter', action: 'Navigate.' },
      ],
      aria: [
        'aria-label="Pagination" on the nav.',
        'aria-current="page" on the current page.',
        'Page links need full names: "Go to page 3", not "3".',
        'Prefer aria-disabled over the disabled attribute on boundary controls so they remain discoverable.',
        'The status region is aria-live="polite" and announces after the page loads.',
        'The ellipsis is aria-hidden.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '2.4.4 Link Purpose.', '2.4.8 Location.', '4.1.3 Status Messages.'],
      screenReader: 'Announced as "Pagination, navigation", then each control. The status announces the new range after navigation.',
      targetSize: 'Every control is at least 32x32, and spacing prevents mis-taps.',
    },
    content: [
      'Status reads "Showing 21–40 of 128 projects" — range, total, and what is being counted.',
      'Use "Previous" and "Next", not "«" and "»" alone.',
      'Never show a count that includes resources the user is not permitted to see.',
    ],
    dos: ['Keep page state in the URL.', 'Announce the new range after navigation.', 'Render nothing when there is only one page.'],
    donts: ['Do not remove boundary controls; disable them.', 'Do not use infinite scroll for data users must reach precisely.', 'Do not reset to page 1 on an unrelated filter change without saying so.'],
    html: `<nav class="sk-pagination" aria-label="Pagination">
  <p class="sk-pagination__status" role="status">Showing 21–40 of 128 projects</p>

  <ul class="sk-pagination__list">
    <li><a class="sk-pagination__control" href="?page=1" rel="prev">
      <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-chevron-left" /></svg>
      Previous
    </a></li>
    <li><a class="sk-pagination__page" href="?page=1"><span class="sk-visually-hidden">Go to page </span>1</a></li>
    <li><span class="sk-pagination__ellipsis" aria-hidden="true">…</span></li>
    <li><a class="sk-pagination__page" href="?page=2" aria-current="page"><span class="sk-visually-hidden">Current page, page </span>2</a></li>
    <li><a class="sk-pagination__page" href="?page=3"><span class="sk-visually-hidden">Go to page </span>3</a></li>
    <li><a class="sk-pagination__control" href="?page=3" rel="next">
      Next
      <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-chevron-right" /></svg>
    </a></li>
  </ul>
</nav>`,
    css: `.sk-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--sk-space-12);
  min-inline-size: 0;
  padding-block: var(--sk-space-12);
}

.sk-pagination__status {
  flex: 1 1 12rem;
  min-inline-size: 0;
  margin: 0;
  font-size: var(--sk-font-size-body-sm);
  color: var(--sk-color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.sk-pagination__list {
  flex: 0 1 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sk-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.sk-pagination__page,
.sk-pagination__control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sk-space-4);
  min-inline-size: 2rem;
  min-block-size: 2rem;
  padding-inline: var(--sk-space-8);
  border: var(--sk-border-width-hairline) solid transparent;
  border-radius: var(--sk-radius-md);
  color: var(--sk-color-text-secondary);
  font-size: var(--sk-font-size-body-sm);
  font-variant-numeric: tabular-nums;
  text-decoration: none;
}

.sk-pagination__page:hover,
.sk-pagination__control:hover { background-color: var(--sk-color-surface-hover); color: var(--sk-color-text-primary); }

.sk-pagination__page[aria-current="page"] {
  background-color: var(--sk-color-surface-selected);
  /* Border carries the state in dark mode, where the tint alone is invisible. */
  border-color: var(--sk-color-border-brand);
  color: var(--sk-color-text-brand);
  font-weight: var(--sk-font-weight-semibold);
}

.sk-pagination__page:focus-visible,
.sk-pagination__control:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}

/* Disabled uses an explicit colour, not opacity: opacity on a dark surface
   collapses toward the background far faster than on a light one. */
.sk-pagination__control[aria-disabled="true"] {
  color: var(--sk-color-text-disabled);
  pointer-events: none;
}

.sk-pagination__control > svg { fill: currentColor; }
.sk-pagination__ellipsis { display: inline-flex; align-items: center; padding-inline: var(--sk-space-4); color: var(--sk-color-text-tertiary); }

@media (max-width: 30rem) {
  /* Page numbers are the first thing to go; Previous/Next and the status stay. */
  .sk-pagination__page:not([aria-current="page"]),
  .sk-pagination__ellipsis { display: none; }
}

/* The current page is shown by a filled background, which HCM removes — leaving
   ten identical numbers and no way to tell where you are. */
@media (forced-colors: active) {
  .sk-pagination__page[aria-current="page"] { background-color: Highlight; color: HighlightText; }
  .sk-pagination__page:focus-visible,
  .sk-pagination__control:focus-visible { outline-color: Highlight; }
  .sk-pagination__control[aria-disabled="true"] { color: GrayText; }
}
`,
    related: ['table', 'search-field', 'select'],
  },

  {
    id: 'stepper',
    name: 'Stepper',
    category: 'navigation',
    status: 'stable',
    summary:
      'Shows progress through a sequence and lets the user move between completed steps. Use it when a task genuinely has an order and the user benefits from seeing how much is left.',
    whenToUse: ['Multi-step creation or configuration flows of three to seven steps.', 'Processes with dependencies between steps.', 'Long forms split to reduce cognitive load.'],
    whenNotToUse: ['Independent views — use Tabs.', 'Two steps — just show both.', 'More than about seven steps, which signals the task needs redesigning rather than more steps.'],
    anatomy: [
      { part: 'Step list', required: true, description: 'An <ol>, because order is the point.' },
      { part: 'Step indicator', required: true, description: 'Number, or a tick when complete. Never a tick alone — the number carries the position.' },
      { part: 'Step label', required: true, description: 'What the step is for.' },
      { part: 'Connector', required: false, description: 'Line between steps, aria-hidden.' },
      { part: 'Status', required: true, description: 'Visually hidden text: "completed", "current", "not started".' },
    ],
    variants: [
      { name: 'Horizontal', className: 'sk-stepper', description: 'Left to right, wrapping to vertical when cramped.', use: 'Wide layouts, up to five steps.' },
      { name: 'Vertical', className: 'sk-stepper--vertical', description: 'Top to bottom, with content beside each step.', use: 'Narrow layouts, or steps needing inline content.' },
      { name: 'Compact', className: 'sk-stepper--compact', description: '"Step 2 of 5" plus a progress bar.', use: 'Very narrow viewports.' },
    ],
    sizes: [{ name: 'Medium', className: '', height: 'auto', typeStyle: 'body-sm', description: 'The only size.' }],
    states: [
      { name: 'Not started', description: 'Neutral outline, muted label, not focusable.', trigger: 'default' },
      { name: 'Current', description: 'Brand fill, aria-current="step".', trigger: '[aria-current="step"]' },
      { name: 'Completed', description: 'Tick, and clickable to go back.', trigger: '[data-complete]' },
      { name: 'Error', description: 'A completed step that failed validation: crimson with a warning glyph.', trigger: '[data-error]' },
      { name: 'Skipped', description: 'Optional step passed over, marked distinctly from both complete and not started.', trigger: '[data-skipped]' },
    ],
    props: [
      { name: 'steps', type: 'Array<{id, label, status}>', required: true, description: 'The steps.' },
      { name: 'current', type: 'number', required: true, description: 'Current step index.' },
      { name: 'allowBack', type: 'boolean', default: 'true', description: 'Whether completed steps are clickable.' },
    ],
    tokensUsed: ['color-surface-brand', 'color-text-on-brand', 'color-border-strong', 'color-status-success-solid', 'color-status-danger-solid', 'color-focus-ring'],
    darkMode:
      'The completed-step tick sits on a jade fill whose on-solid text flips from white to near-black. The connector line between steps uses border-strong so it stays perceptible; a connector drawn with border-subtle disappears on dark and the steps stop reading as a sequence.',
    accessibility: {
      role: '<nav aria-label="Progress"> containing an <ol>.',
      keyboard: [
        { keys: 'Tab', action: 'Reaches only the interactive (completed) steps. Future steps are not focusable, because they cannot be visited.' },
        { keys: 'Enter', action: 'Go back to a completed step.' },
      ],
      aria: [
        'aria-current="step" on the current step.',
        'Status must be in text, not conveyed by colour or a glyph alone — a visually hidden span per step.',
        'Future steps are plain text, not disabled buttons; a disabled control implies it could become enabled here and now.',
        'The connector is aria-hidden.',
        'On step change, announce the new step in a polite live region.',
      ],
      wcag: ['1.3.1 Info and Relationships.', '1.4.1 Use of Color.', '2.4.8 Location.', '3.3.1 Error Identification — a step containing errors must be marked in the stepper, not only in the panel.', '4.1.3 Status Messages.'],
      screenReader: 'Announced as "Progress, navigation, list, 5 items", then "Step 2, Records, current step".',
      targetSize: 'Interactive steps have a 24px minimum target, extended by the label.',
    },
    content: [
      'Step labels are short noun phrases: "Project details", "Records", "Review".',
      'The final step is "Review" or "Confirm", never "Finish".',
      'Say which steps are optional in the label: "Tags (optional)".',
    ],
    dos: [
      'Let users go back without losing entered data.',
      'Mark steps containing validation errors in the stepper itself.',
      'Save progress between steps.',
    ],
    donts: [
      'Do not let users skip forward past incomplete required steps.',
      'Do not use a stepper for fewer than three steps.',
      'Do not rely on colour alone for step status.',
    ],
    html: `<nav class="sk-stepper" aria-label="Progress">
  <ol class="sk-stepper__list">
    <li class="sk-stepper__step" data-complete>
      <a class="sk-stepper__link" href="#step-1">
        <span class="sk-stepper__indicator" aria-hidden="true">
          <svg width="14" height="14"><use href="#sk-icon-check" /></svg>
        </span>
        <span class="sk-stepper__label">Project details</span>
        <span class="sk-visually-hidden">, completed</span>
      </a>
    </li>
    <li class="sk-stepper__step" aria-current="step">
      <span class="sk-stepper__link">
        <span class="sk-stepper__indicator" aria-hidden="true">2</span>
        <span class="sk-stepper__label">Records</span>
        <span class="sk-visually-hidden">, current step</span>
      </span>
    </li>
    <li class="sk-stepper__step">
      <span class="sk-stepper__link">
        <span class="sk-stepper__indicator" aria-hidden="true">3</span>
        <span class="sk-stepper__label">Review</span>
        <span class="sk-visually-hidden">, not started</span>
      </span>
    </li>
  </ol>
</nav>`,
    css: `.sk-stepper { min-inline-size: 0; }

/* Wraps to a stacked list when the row cannot hold the steps, so no media query
   is needed to keep it usable at any width. */
.sk-stepper__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sk-space-8) var(--sk-space-16);
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: sk-step;
}

.sk-stepper__step {
  flex: 1 1 10rem;
  min-inline-size: 0;
  display: flex;
  align-items: center;
  gap: var(--sk-space-8);
}

/* Connector: border-strong, because a subtle line disappears on dark and the
   steps stop reading as a sequence. */
.sk-stepper__step:not(:last-child)::after {
  content: "";
  flex: 1 1 auto;
  min-inline-size: var(--sk-space-16);
  block-size: var(--sk-border-width-hairline);
  background-color: var(--sk-color-border-strong);
}

.sk-stepper__link {
  display: flex;
  align-items: center;
  gap: var(--sk-space-8);
  min-inline-size: 0;
  padding-block: var(--sk-space-4);
  color: var(--sk-color-text-secondary);
  text-decoration: none;
  font-size: var(--sk-font-size-body-sm);
}
a.sk-stepper__link:hover { color: var(--sk-color-text-primary); }
a.sk-stepper__link:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
  border-radius: var(--sk-radius-sm);
}

.sk-stepper__indicator {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border: var(--sk-border-width-thick) solid var(--sk-color-border-strong);
  border-radius: var(--sk-radius-full);
  font-size: var(--sk-font-size-body-sm);
  font-weight: var(--sk-font-weight-semibold);
  font-variant-numeric: tabular-nums;
}
.sk-stepper__indicator > svg { fill: currentColor; }

.sk-stepper__label { min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.sk-stepper__step[aria-current="step"] .sk-stepper__indicator {
  background-color: var(--sk-color-surface-brand);
  border-color: var(--sk-color-surface-brand);
  color: var(--sk-color-text-on-brand);
}
.sk-stepper__step[aria-current="step"] .sk-stepper__label {
  color: var(--sk-color-text-primary);
  font-weight: var(--sk-font-weight-semibold);
}

.sk-stepper__step[data-complete] .sk-stepper__indicator {
  background-color: var(--sk-color-status-success-solid);
  border-color: var(--sk-color-status-success-solid);
  color: var(--sk-color-status-success-on-solid);
}

.sk-stepper__step[data-error] .sk-stepper__indicator {
  background-color: var(--sk-color-status-danger-solid);
  border-color: var(--sk-color-status-danger-solid);
  color: var(--sk-color-status-danger-on-solid);
}

.sk-stepper--vertical .sk-stepper__list { flex-direction: column; align-items: stretch; }
.sk-stepper--vertical .sk-stepper__step { flex: 0 0 auto; }
.sk-stepper--vertical .sk-stepper__step:not(:last-child)::after { display: none; }

/* Step state is carried entirely by indicator fills. Without them a stepper is
   a row of numbers with no progress information at all, so completed and
   current are redrawn with system colours and a border. */
@media (forced-colors: active) {
  .sk-stepper__indicator { border: 1px solid CanvasText; }
  .sk-stepper__step[data-complete] .sk-stepper__indicator { background-color: CanvasText; color: Canvas; }
  .sk-stepper__step[aria-current="step"] .sk-stepper__indicator { background-color: Highlight; color: HighlightText; }
  .sk-stepper__link:focus-visible { outline-color: Highlight; }
}
`,
    related: ['tabs', 'progress', 'button'],
  },

  {
    id: 'menu',
    name: 'Menu',
    category: 'navigation',
    status: 'stable',
    summary:
      'A list of actions revealed by a trigger. Menus contain commands, not navigation destinations and not form controls.',
    whenToUse: ['Row-level and toolbar actions that would not fit as buttons.', 'Account and overflow menus.', 'Contextual actions on a selected object.'],
    whenNotToUse: [
      'Navigation — use links in a nav landmark, so users can middle-click and bookmark.',
      'Selecting a value — use Select or Combobox.',
      'Fewer than three actions — show them as buttons.',
      'Forms. A menu containing inputs is not a menu.',
    ],
    anatomy: [
      { part: 'Trigger', required: true, description: 'A button with aria-haspopup="menu" and aria-expanded.' },
      { part: 'Menu', required: true, description: 'role="menu", anchored to the trigger, flipping when it would overflow the viewport.' },
      { part: 'Items', required: true, description: 'role="menuitem", or menuitemcheckbox / menuitemradio.' },
      { part: 'Groups', required: false, description: 'role="group" with aria-label, separated by dividers.' },
      { part: 'Shortcuts', required: false, description: 'Keyboard hints shown right-aligned.' },
      { part: 'Destructive section', required: false, description: 'Destructive items last, after a divider.' },
    ],
    variants: [
      { name: 'Actions', className: 'sk-menu', description: 'Plain commands.', use: 'Default.' },
      { name: 'Selectable', className: 'sk-menu--selectable', description: 'Checkable items.', use: 'View options, column visibility, sort direction.' },
      { name: 'Context', className: 'sk-menu--context', description: 'Opened by right-click or a keyboard context key.', use: 'Data grids. Must duplicate an always-visible path.' },
    ],
    sizes: [
      { name: 'Small', className: 'sk-menu--sm', height: '2rem items', typeStyle: 'body-sm', description: 'Dense grids.' },
      { name: 'Medium', className: '', height: '2.25rem items', typeStyle: 'body-md', description: 'Default.' },
    ],
    states: [
      { name: 'Closed', description: 'Trigger only.', trigger: 'default' },
      { name: 'Open', description: 'aria-expanded="true", first item focused.', trigger: '[aria-expanded="true"]' },
      { name: 'Item focused', description: 'Real DOM focus moves between items — unlike Combobox, a menu moves focus.', trigger: ':focus' },
      { name: 'Item checked', description: 'Tick shown, aria-checked="true".', trigger: '[aria-checked="true"]' },
      { name: 'Item disabled', description: 'aria-disabled, still focusable so the reason can be discovered.', trigger: '[aria-disabled="true"]' },
    ],
    props: [
      { name: 'items', type: 'MenuItem[]', required: true, description: 'Actions, groups and separators.' },
      { name: 'placement', type: "'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'", default: "'bottom-start'", description: 'Preferred anchor position; flips automatically.' },
      { name: 'closeOnSelect', type: 'boolean', default: 'true', description: 'False for checkable menus, where several toggles in a row is the point.' },
    ],
    tokensUsed: ['color-surface-overlay', 'color-border-default', 'color-surface-hover', 'color-status-danger-text', 'elevation-3', 'z-popover', 'radius-md'],
    darkMode:
      'Menus float, so they use surface-overlay — lighter than the page in dark mode. The border is doing more work in dark mode than in light: with a weak shadow, border-default is what defines the menu edge against the page. A menu with no border looks fine in light mode and looks like floating text in dark mode.',
    accessibility: {
      role: 'ARIA menu pattern: button trigger, role="menu", role="menuitem" children.',
      keyboard: [
        { keys: 'Enter / Space / Arrow Down on trigger', action: 'Open and focus the first item.' },
        { keys: 'Arrow Up on trigger', action: 'Open and focus the last item.' },
        { keys: 'Arrow Up / Down', action: 'Move between items, wrapping at the ends.' },
        { keys: 'Home / End', action: 'First or last item.' },
        { keys: 'A–Z', action: 'Type-ahead to the first matching item.' },
        { keys: 'Escape', action: 'Close and restore focus to the trigger.' },
        { keys: 'Tab', action: 'Close and move on. A menu never traps Tab.' },
      ],
      aria: [
        'The trigger carries aria-haspopup="menu", aria-expanded and aria-controls.',
        'Focus moves into the menu — this is the opposite of the combobox pattern, and mixing them up breaks both.',
        'Focus must return to the trigger on close, including when closing by selecting an item.',
        'Checkable items use menuitemcheckbox or menuitemradio with aria-checked.',
        'Separators are role="separator".',
        'Do not put links inside role="menu" unless they are genuinely commands; a nav in a menu should be a nav.',
      ],
      wcag: ['2.1.1 Keyboard.', '2.1.2 No Keyboard Trap.', '2.4.3 Focus Order.', '2.4.11 Focus Not Obscured.', '4.1.2 Name, Role, Value.'],
      screenReader: 'Trigger announces "Actions, menu pop-up button, collapsed". Open: "menu, 5 items", then each item.',
      targetSize: 'Items are at least 36px tall and span the menu width.',
    },
    content: [
      'Items are verb phrases: "Duplicate project", "Export as CSV".',
      'Group related items and separate destructive ones.',
      'Show keyboard shortcuts right-aligned where they exist.',
      'Never label an item "More".',
    ],
    dos: [
      'Return focus to the trigger on close.',
      'Put destructive actions last, behind a divider.',
      'Flip placement rather than letting the menu leave the viewport.',
    ],
    donts: [
      'Do not put form controls in a menu.',
      'Do not nest submenus more than one level.',
      'Do not use a menu as the only route to an action — context menus need a visible alternative.',
    ],
    html: `<button type="button" class="sk-icon-button" id="row-actions-trigger"
        aria-haspopup="menu" aria-expanded="false" aria-controls="row-actions">
  <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-more" /></svg>
  <span class="sk-visually-hidden">Actions for Website redesign</span>
</button>

<div class="sk-menu" id="row-actions" role="menu" aria-labelledby="row-actions-trigger" hidden>
  <button type="button" class="sk-menu__item" role="menuitem">
    <svg class="sk-menu__icon" aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-edit" /></svg>
    <span class="sk-menu__label">Edit project</span>
    <kbd class="sk-menu__shortcut">E</kbd>
  </button>
  <button type="button" class="sk-menu__item" role="menuitem">
    <svg class="sk-menu__icon" aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-copy" /></svg>
    <span class="sk-menu__label">Duplicate project</span>
  </button>

  <hr class="sk-menu__separator" role="separator" />

  <button type="button" class="sk-menu__item sk-menu__item--danger" role="menuitem">
    <svg class="sk-menu__icon" aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-trash" /></svg>
    <span class="sk-menu__label">Delete project</span>
  </button>
</div>`,
    css: `.sk-menu {
  display: flex;
  flex-direction: column;
  min-inline-size: 12rem;
  max-inline-size: 20rem;
  padding: var(--sk-space-4);
  z-index: var(--sk-z-popover);
  /* Lighter than the page in dark mode; the border, not the shadow, defines the
     edge there, so border-default is not optional. */
  background-color: var(--sk-color-surface-overlay);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-radius: var(--sk-radius-md);
  box-shadow: var(--sk-elevation-3);
}

.sk-menu[hidden] { display: none; }

.sk-menu__item {
  display: flex;
  align-items: center;
  gap: var(--sk-space-10);
  inline-size: 100%;
  min-inline-size: 0;
  min-block-size: 2.25rem;
  padding-inline: var(--sk-space-10);
  padding-block: var(--sk-space-6);
  border: none;
  border-radius: var(--sk-radius-sm);
  background: transparent;
  color: var(--sk-color-text-primary);
  font-family: var(--sk-font-family-sans);
  font-size: var(--sk-font-size-body-sm);
  text-align: start;
  text-decoration: none;
  cursor: pointer;
}

.sk-menu__icon { flex: 0 0 auto; fill: currentColor; color: var(--sk-color-text-secondary); }
.sk-menu__label { flex: 1 1 auto; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sk-menu__shortcut {
  flex: 0 0 auto;
  font-family: var(--sk-font-family-mono);
  font-size: var(--sk-font-size-body-xs);
  color: var(--sk-color-text-tertiary);
}

.sk-menu__item:hover,
.sk-menu__item:focus { background-color: var(--sk-color-surface-hover); outline: none; }
.sk-menu__item:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: -2px;
}

.sk-menu__item[aria-disabled="true"] { color: var(--sk-color-text-disabled); cursor: not-allowed; }
.sk-menu__item[aria-disabled="true"] .sk-menu__icon { color: inherit; }

.sk-menu__item--danger { color: var(--sk-color-status-danger-text); }
.sk-menu__item--danger .sk-menu__icon { color: inherit; }
.sk-menu__item--danger:hover, .sk-menu__item--danger:focus { background-color: var(--sk-color-status-danger-surface); }

.sk-menu__item[aria-checked="true"]::before {
  content: "";
  flex: 0 0 auto;
  inline-size: 1rem;
  block-size: 1rem;
  background-color: currentColor;
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M13.5 4.5l-7 7L3 8' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  mask-size: contain;
  mask-repeat: no-repeat;
}

.sk-menu__separator {
  block-size: var(--sk-border-width-hairline);
  margin-block: var(--sk-space-4);
  margin-inline: calc(var(--sk-space-4) * -1);
  border: none;
  background-color: var(--sk-color-border-subtle);
}

.sk-menu__group-label {
  padding: var(--sk-space-6) var(--sk-space-10) var(--sk-space-2);
  font-size: var(--sk-font-size-overline);
  letter-spacing: var(--sk-letter-spacing-overline);
  text-transform: uppercase;
  color: var(--sk-color-text-tertiary);
}

.sk-menu--sm .sk-menu__item { min-block-size: 2rem; }

@media (prefers-reduced-motion: no-preference) {
  .sk-menu { animation: sk-menu-in var(--sk-duration-fast) var(--sk-easing-entrance); }
}
@keyframes sk-menu-in { from { opacity: 0; translate: 0 -4px; scale: 0.98; } }

/* A floating menu with no shadow merges into whatever is behind it, so it needs
   a real border. The check mark on a checked item is a ::before background,
   which HCM would erase along with every other background. */
@media (forced-colors: active) {
  .sk-menu { border: 1px solid CanvasText; }
  .sk-menu__item:hover,
  .sk-menu__item:focus-visible { background-color: Highlight; color: HighlightText; }
  .sk-menu__item[aria-checked="true"]::before { background-color: CanvasText; }
  .sk-menu__item[aria-disabled="true"] { color: GrayText; }
  .sk-menu__separator { border-block-start-color: CanvasText; }
}
`,
    related: ['button', 'icon-button', 'split-button', 'popover', 'combobox'],
  },

  {
    id: 'command-palette',
    name: 'Command palette',
    category: 'navigation',
    status: 'beta',
    summary:
      'A keyboard-first overlay for searching across everything: navigation, actions, records and settings. It accelerates expert users without adding a single pixel to the interface.',
    whenToUse: ['Applications with many destinations and actions.', 'Products with returning expert users.', 'As the destination for global search on narrow viewports.'],
    whenNotToUse: ['Small applications.', 'As the only way to reach any feature — it must be a shortcut, never a requirement.'],
    anatomy: [
      { part: 'Dialog', required: true, description: 'Modal, focus-trapped, centred near the top of the viewport.' },
      { part: 'Input', required: true, description: 'role="combobox" with immediate focus on open.' },
      { part: 'Result groups', required: true, description: 'Grouped by kind: Navigation, Actions, Records.' },
      { part: 'Results', required: true, description: 'Each with an icon, label, context line and optional shortcut.' },
      { part: 'Footer', required: false, description: 'Key hints: navigate, select, close.' },
      { part: 'Empty state', required: true, description: 'Suggestions when nothing matches.' },
    ],
    variants: [
      { name: 'Default', className: 'sk-command-palette', description: 'Search plus grouped results.', use: 'Standard.' },
      { name: 'Scoped', className: 'sk-command-palette--scoped', description: 'Restricted to one kind, entered with a prefix such as ">" for actions.', use: 'Power users who know what they want.' },
    ],
    sizes: [{ name: 'Medium', className: '', height: '32rem max', typeStyle: 'body-md', description: 'The only size.' }],
    states: [
      { name: 'Closed', description: 'Not rendered.', trigger: 'default' },
      { name: 'Open, empty', description: 'Recent items and suggested actions.', trigger: '[data-empty-query]' },
      { name: 'Searching', description: 'Debounced loading state that does not clear the previous results — a flashing empty list is worse than slightly stale results.', trigger: '[data-loading]' },
      { name: 'Results', description: 'Grouped, with the first item active.', trigger: '[data-results]' },
      { name: 'No results', description: 'Suggestions and a "search everywhere" escape hatch.', trigger: '[data-no-results]' },
    ],
    props: [
      { name: 'sources', type: 'CommandSource[]', required: true, description: 'Providers for each result kind.' },
      { name: 'shortcut', type: 'string', default: "'Mod+K'", description: 'Opening shortcut. Mod is Cmd on macOS, Ctrl elsewhere.' },
      { name: 'recentLimit', type: 'number', default: '5', description: 'Recent items shown on an empty query.' },
    ],
    tokensUsed: ['color-surface-overlay', 'color-surface-scrim', 'color-surface-selected', 'color-border-brand', 'elevation-4', 'z-dialog', 'radius-xl'],
    darkMode:
      'The palette floats highest of anything in the product, so it uses surface-overlay plus elevation-4 plus a border. On dark, the scrim behind it goes to 64% black rather than the light-mode 48% — a scrim that is too weak on a dark page fails to separate the palette from the content behind it, and the whole overlay reads as flat.',
    accessibility: {
      role: 'role="dialog" aria-modal="true" containing the combobox pattern.',
      keyboard: [
        { keys: 'Mod+K', action: 'Open from anywhere, except while a text input has focus.' },
        { keys: 'Arrow Up / Down', action: 'Move the active result. DOM focus stays in the input.' },
        { keys: 'Enter', action: 'Run the active result.' },
        { keys: 'Escape', action: 'Close and restore focus to where the user was.' },
        { keys: 'Tab', action: 'Cycles within the palette; it is a modal, so focus is trapped until Escape.' },
      ],
      aria: [
        'The combobox pattern applies: aria-activedescendant, not real focus movement.',
        'Groups use role="group" with aria-label so their headings are announced.',
        'A polite live region announces result counts.',
        'The opening shortcut needs a discoverable alternative — a visible button in the top bar.',
        'Focus returns exactly where it was on close.',
      ],
      wcag: ['2.1.1 Keyboard.', '2.1.2 No Keyboard Trap.', '2.1.4 Character Key Shortcuts — a single-key shortcut must be remappable or require a modifier.', '2.4.3 Focus Order.', '4.1.3 Status Messages.'],
      screenReader: 'Announced as "Command palette, dialog", then the combobox and result counts.',
      targetSize: 'Results are 44px tall — this is a pointer target as well as a keyboard one.',
    },
    content: [
      'Placeholder names the scope: "Search projects, tasks and actions".',
      'Each result carries a context line so ambiguous names are distinguishable.',
      'The empty state offers concrete next steps, not just "No results".',
      'Show the discoverable shortcut in the top bar button so users learn it.',
    ],
    dos: [
      'Keep the previous results visible while loading.',
      'Rank recent and frequent items first.',
      'Show the keyboard shortcut somewhere visible so it is discoverable.',
    ],
    donts: [
      'Do not make the palette the only path to a feature.',
      'Do not steal Mod+K while a text input has focus.',
      'Do not clear results to an empty list mid-search.',
    ],
    html: `<div class="sk-command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
  <div class="sk-command-palette__panel">
    <div class="sk-command-palette__search">
      <svg aria-hidden="true" focusable="false" width="20" height="20"><use href="#sk-icon-search" /></svg>
      <input class="sk-command-palette__input" type="text" role="combobox"
             aria-expanded="true" aria-controls="cp-results" aria-autocomplete="list"
             aria-activedescendant="cp-item-0" autocomplete="off"
             placeholder="Search projects, tasks and actions" />
      <kbd class="sk-kbd">Esc</kbd>
    </div>

    <div class="sk-command-palette__results" id="cp-results" role="listbox" aria-label="Results">
      <div role="group" aria-label="Navigation">
        <p class="sk-command-palette__group-label" aria-hidden="true">Navigation</p>
        <div class="sk-command-palette__item" id="cp-item-0" role="option" aria-selected="true" data-active>
          <svg aria-hidden="true" focusable="false" width="16" height="16"><use href="#sk-icon-globe" /></svg>
          <span class="sk-command-palette__label">Projects</span>
          <span class="sk-command-palette__context">128 projects</span>
        </div>
      </div>
    </div>

    <p class="sk-visually-hidden" role="status">6 results.</p>
  </div>
</div>`,
    css: `.sk-command-palette {
  position: fixed;
  inset: 0;
  z-index: var(--sk-z-dialog);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: var(--sk-space-16);
  padding-block-start: 10vh;
  /* 64% on dark vs 48% on light: a weak scrim fails to separate the palette from
     the page, and the whole overlay reads as flat. */
  background-color: var(--sk-color-surface-scrim);
}

.sk-command-palette__panel {
  display: flex;
  flex-direction: column;
  /* Grows with the viewport but never past a comfortable reading width. */
  flex: 0 1 40rem;
  min-inline-size: 0;
  max-block-size: min(32rem, 80vh);
  background-color: var(--sk-color-surface-overlay);
  border: var(--sk-border-width-hairline) solid var(--sk-color-border-default);
  border-radius: var(--sk-radius-xl);
  box-shadow: var(--sk-elevation-4);
  overflow: hidden;
}

.sk-command-palette__search {
  display: flex;
  align-items: center;
  gap: var(--sk-space-12);
  flex: 0 0 auto;
  padding: var(--sk-space-16);
  border-block-end: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
}
.sk-command-palette__search > svg { flex: 0 0 auto; fill: var(--sk-color-text-tertiary); }

.sk-command-palette__input {
  flex: 1 1 auto;
  min-inline-size: 0;
  border: none;
  background: transparent;
  color: var(--sk-color-text-primary);
  font-family: var(--sk-font-family-sans);
  font-size: var(--sk-font-size-body-lg);
}
.sk-command-palette__input:focus-visible { outline: none; }
.sk-command-palette__input::placeholder { color: var(--sk-color-text-placeholder); }

.sk-command-palette__results {
  flex: 1 1 auto;
  min-block-size: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--sk-space-8);
}

.sk-command-palette__group-label {
  margin: var(--sk-space-8) var(--sk-space-8) var(--sk-space-4);
  font-size: var(--sk-font-size-overline);
  letter-spacing: var(--sk-letter-spacing-overline);
  text-transform: uppercase;
  color: var(--sk-color-text-tertiary);
}

.sk-command-palette__item {
  display: flex;
  align-items: center;
  gap: var(--sk-space-12);
  min-inline-size: 0;
  min-block-size: 2.75rem;
  padding-inline: var(--sk-space-12);
  border-radius: var(--sk-radius-md);
  cursor: pointer;
}
.sk-command-palette__item > svg { flex: 0 0 auto; fill: var(--sk-color-text-secondary); }
.sk-command-palette__label { flex: 0 1 auto; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--sk-color-text-primary); }
.sk-command-palette__context { flex: 0 1 auto; min-inline-size: 0; margin-inline-start: auto; font-size: var(--sk-font-size-body-xs); color: var(--sk-color-text-tertiary); white-space: nowrap; }

.sk-command-palette__item[data-active] {
  background-color: var(--sk-color-surface-selected);
  box-shadow: inset 3px 0 0 0 var(--sk-color-border-brand);
}

@media (max-width: 30rem) {
  .sk-command-palette { padding: 0; padding-block-start: 0; }
  .sk-command-palette__panel { flex: 1 1 auto; max-block-size: 100dvh; border-radius: 0; }
}

/* The palette is a floating panel over a scrim, and both are backgrounds. */
@media (forced-colors: active) {
  .sk-command-palette__panel { border: 1px solid CanvasText; }
  .sk-command-palette__item[data-active] { background-color: Highlight; color: HighlightText; }
}
`,
    related: ['search-field', 'dialog', 'combobox', 'menu'],
  },
];

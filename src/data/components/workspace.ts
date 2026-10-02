import type { ComponentSpec } from './types.js';

/** Workspace compositions share the same controls and lifecycle contracts as v2. */
function workspace(spec: Pick<ComponentSpec, 'id' | 'name' | 'category' | 'summary' | 'html' | 'css'> & Partial<ComponentSpec>): ComponentSpec {
  return {
    status: 'stable',
    whenToUse: ['Content-focused applications with compact navigation and readable documents.'],
    whenNotToUse: ['As a substitute for application persistence, authorization, or a structured editor.'],
    anatomy: [{ part: 'Content', required: true, description: 'Native semantic markup in source reading order.' }],
    variants: [], sizes: [], states: [], props: [],
    tokensUsed: ['color-surface-base', 'color-text-primary', 'color-border-subtle'],
    darkMode: 'Use neutral canvas and overlay tokens; keep explicit separators. Content is continuous, with elevation reserved for floating surfaces.',
    accessibility: {
      role: 'Native article, header, list or status according to the content.',
      keyboard: [{ keys: 'Tab', action: 'Reach links and controls in reading order.' }],
      aria: ['Name regions and controls. Keep one main landmark per application.', 'Use status only for meaningful asynchronous transitions, never for every keystroke.'],
      wcag: ['1.3.1 Info and Relationships.', '1.4.10 Reflow.', '2.4.7 Focus Visible.', '4.1.3 Status Messages.'],
      screenReader: 'Native structure preserves headings, lists and state text. Do not make the entire document a live region.',
      targetSize: 'Controls use existing button and link targets; touch layouts expand action targets to 44px.',
    },
    content: ['Use real content and explicit storage boundaries; never claim a server save from a local checkpoint.'],
    dos: ['Keep titles, metadata and body aligned.', 'Keep wide tables and code in named local scroll regions.'],
    donts: ['Do not put an elevated card around the entire document.', 'Do not add nonfunctional publication or collaboration controls.'],
    related: ['app-shell', 'page-header', 'drawer'],
    ...spec,
  };
}

export const workspaceComponents: ComponentSpec[] = [
  workspace({
    id: 'document-canvas', name: 'Document canvas', category: 'layout',
    summary: 'A continuous 760px reading surface with aligned title, metadata and body. Wide mode is explicit; narrow screens retain 16px gutters.',
    anatomy: [{ part: 'Article', required: true, description: 'Named article; use the page title as aria-labelledby.' }, { part: 'Header', required: true, description: 'Title and optional eyebrow and metadata, aligned with the body.' }, { part: 'Body', required: true, description: 'Prose with a logical heading hierarchy; locally scroll wide code and tables.' }],
    variants: [{ name: 'Wide', className: 'sk-document--wide', description: 'Use available content width.', use: 'Wide technical documents or data.' }],
    sizes: [{ name: 'Reading', className: '', height: 'auto', typeStyle: 'body-md', description: '760px content plus gutters; 16px gutters on narrow screens.' }],
    states: [{ name: 'Loading', description: 'Keep the article heading and set aria-busy on its body; announce completion separately.', trigger: '[aria-busy="true"]' }],
    props: [{ name: 'wide', type: 'boolean', default: 'false', description: 'Apply sk-document--wide; preserve readable line lengths inside prose.' }],
    html: `<article class="sk-document" aria-labelledby="document-title">
  <header class="sk-document__header">
    <p class="sk-document__eyebrow">Engineering / Handbook</p>
    <h1 class="sk-document__title" id="document-title">Designing a useful workspace</h1>
    <p class="sk-document__meta">Design team · Updated 2 October</p>
  </header>
  <div class="sk-prose"><p>A calm canvas keeps the content in focus. Use compact controls around the document and comfortable text within it.</p><h2>Start with the reader</h2><p>Keep navigation, current location and the next useful action easy to find.</p></div>
</article>`,
    css: `.sk-document { inline-size: 100%; max-inline-size: calc(var(--sk-layout-document-width) + 2 * var(--sk-space-48)); margin-inline: auto; padding: var(--sk-space-40) var(--sk-space-48); min-inline-size: 0; overflow-wrap: anywhere; }
.sk-document__header { display: flex; flex-direction: column; gap: var(--sk-space-12); margin-block-end: var(--sk-space-32); }
.sk-document__eyebrow, .sk-document__meta { margin: 0; color: var(--sk-color-text-secondary); font-size: var(--sk-font-size-body-sm); line-height: var(--sk-line-height-body-sm); }
.sk-document__title { margin: 0; font-size: var(--sk-font-size-heading-xl); line-height: var(--sk-line-height-heading-xl); font-weight: var(--sk-font-weight-bold); letter-spacing: var(--sk-letter-spacing-heading-xl); overflow-wrap: anywhere; }
.sk-document--wide { max-inline-size: none; }
.sk-document__body { min-inline-size: 0; }
@media (max-width: 47.999rem) { .sk-document { padding: var(--sk-space-24) var(--sk-space-16); } }
@media (forced-colors: active) { .sk-document { color: CanvasText; background: Canvas; } }`,
  }),
  workspace({
    id: 'content-header', name: 'Content header', category: 'layout',
    summary: 'A compact context and action strip. It wraps when space is constrained and remains separate from the document title.',
    anatomy: [{ part: 'Context', required: true, description: 'Named breadcrumb navigation, allowed to wrap.' }, { part: 'Actions', required: false, description: 'Wrapping buttons and links with native disabled and busy semantics.' }],
    variants: [{ name: 'Sticky', className: 'sk-content-header--sticky', description: 'Stays at the top of the local scroll container.', use: 'Long documents with persistent actions. Set the offset beneath any fixed app bar.' }],
    sizes: [{ name: 'Compact', className: '', height: 'layout-content-header-height', typeStyle: 'body-sm', description: 'Minimum height, grows with wrapped content and text enlargement.' }],
    props: [{ name: 'stickyOffset', type: 'CSS length', default: '0px', description: 'Set --sk-layout-content-header-offset and matching scroll-padding-block-start on the scroller so focused content remains visible.' }],
    html: `<header class="sk-content-header">
  <nav class="sk-breadcrumbs sk-content-header__context" aria-label="Content location"><ol class="sk-breadcrumbs__list"><li class="sk-breadcrumbs__item"><a class="sk-link" href="example-workspace.html">Handbook</a></li><li class="sk-breadcrumbs__item"><span aria-current="page">Working together</span></li></ol></nav>
  <div class="sk-content-header__actions"><a class="sk-button sk-button--secondary sk-button--sm" href="example-workspace.html">Open document example</a></div>
</header>`,
    css: `.sk-content-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--sk-space-8) var(--sk-space-16); min-block-size: var(--sk-layout-content-header-height); padding: var(--sk-space-8) var(--sk-space-24); border-block-end: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle); background: var(--sk-color-surface-base); min-inline-size: 0; }
.sk-content-header__context { flex: 1 1 14rem; min-inline-size: 0; }
.sk-content-header__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sk-space-8); min-inline-size: 0; }
.sk-content-header__actions > * { max-inline-size: 100%; white-space: normal; overflow-wrap: anywhere; }
.sk-content-header--sticky { position: sticky; inset-block-start: var(--sk-layout-content-header-offset, 0px); z-index: var(--sk-z-sticky); }
@media (max-width: 47.999rem) { .sk-content-header { padding-inline: var(--sk-space-16); } }
@media (forced-colors: active) { .sk-content-header { border-color: CanvasText; } }`,
  }),
  workspace({
    id: 'save-state', name: 'Save state', category: 'feedback',
    summary: 'Quiet, explicit feedback for pending, saving, acknowledged, local-only, failed and conflicting work. The application owns transitions.',
    anatomy: [{ part: 'Status', required: true, description: 'A persistent role=status node with explicit storage-boundary text.' }, { part: 'Indicator', required: false, description: 'Decorative; state must also appear in text.' }, { part: 'Recovery', required: false, description: 'Retry or review buttons adjacent to the status, outside its live region.' }],
    sizes: [{ name: 'Small', className: '', height: 'auto', typeStyle: 'body-sm', description: 'Wraps in narrow headers; never truncate the storage boundary.' }],
    props: [{ name: 'state', type: "'pending' | 'saving' | 'saved' | 'local' | 'error' | 'conflict'", required: true, description: 'Set data-state and visible text together after an actual application transition.' }],
    states: [
      { name: 'Pending', description: 'Work has changed since the last acknowledgment.', trigger: 'data-state="pending"' },
      { name: 'Saving', description: 'A request is in flight; input remains usable.', trigger: 'data-state="saving"' },
      { name: 'Saved', description: 'The current revision is durably acknowledged at the named boundary.', trigger: 'data-state="saved"' },
      { name: 'Local', description: 'Saved on this device only; not synchronized.', trigger: 'data-state="local"' },
      { name: 'Error', description: 'Preserve input and offer Retry beside the status.', trigger: 'data-state="error"' },
      { name: 'Conflict', description: 'Preserve both revisions and offer review.', trigger: 'data-state="conflict"' },
    ],
    html: `<p class="sk-save-state" data-state="local" role="status"><span class="sk-save-state__indicator" aria-hidden="true"></span>Saved on this device</p>`,
    css: `.sk-save-state { display: inline-flex; flex-wrap: wrap; align-items: center; gap: var(--sk-space-6); margin: 0; color: var(--sk-color-text-secondary); font-size: var(--sk-font-size-body-sm); line-height: var(--sk-line-height-body-sm); }
.sk-save-state__indicator { flex: 0 0 auto; inline-size: var(--sk-space-8); block-size: var(--sk-space-8); border-radius: var(--sk-radius-full); background: currentColor; }
.sk-save-state[data-state="error"] { color: var(--sk-color-status-danger-text); }
.sk-save-state[data-state="conflict"] { color: var(--sk-color-status-warning-text); }
.sk-save-state[data-state="saving"] .sk-save-state__indicator { background: transparent; border: var(--sk-border-width-thick) solid currentColor; }
.sk-save-state[data-state="pending"] .sk-save-state__indicator { background: transparent; border: var(--sk-border-width-hairline) solid currentColor; }
.sk-save-state[data-state="local"] .sk-save-state__indicator { border-radius: var(--sk-radius-xs); }
@media (forced-colors: active) { .sk-save-state__indicator { border: 1px solid CanvasText; } }`,
  }),
  workspace({
    id: 'activity-list', name: 'Activity list', category: 'data-display',
    summary: 'Scan recent or saved content using a dominant title, subordinate context and a timestamp. A plain list replaces oversized dashboard cards.',
    anatomy: [{ part: 'List', required: true, description: 'Named ul with li children; keep controls separate from title links.' }, { part: 'Content', required: true, description: 'Dominant linked title and optional context; long titles wrap.' }, { part: 'Timestamp', required: false, description: 'A time element with an absolute datetime value.' }],
    sizes: [{ name: 'Default', className: '', height: 'auto', typeStyle: 'body-sm', description: 'Flexible rows, 12px block padding; metadata wraps below on narrow screens.' }],
    states: [{ name: 'Loading', description: 'Set aria-busy on the list and announce loading in a sibling status.', trigger: '[aria-busy="true"]' }, { name: 'Empty', description: 'One plain list item explains why there is no activity and offers a relevant next step.', trigger: '.sk-activity-list__empty' }, { name: 'Error', description: 'Preserve existing items and put a named retry button beside a separate error status.', trigger: 'application-owned error status' }],
    props: [{ name: 'items', type: 'Array<{title, href, context?, datetime?}>', required: true, description: 'Application-rendered list data; use text nodes for content and validated URLs for links.' }],
    html: `<ul class="sk-activity-list" aria-label="Recent documents"><li class="sk-activity-list__item"><div class="sk-activity-list__content"><a class="sk-link sk-activity-list__title" href="example-workspace.html">Working together</a><p class="sk-activity-list__meta">Engineering / Handbook</p></div><time class="sk-activity-list__time" datetime="2026-10-02">2 October</time></li><li class="sk-activity-list__item"><div class="sk-activity-list__content"><a class="sk-link sk-activity-list__title" href="example-detail.html">Website redesign</a><p class="sk-activity-list__meta">Product / Projects</p></div><time class="sk-activity-list__time" datetime="2026-10-01">1 October</time></li></ul>`,
    css: `.sk-activity-list { list-style: none; margin: 0; padding: 0; }
.sk-activity-list__item { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sk-space-8) var(--sk-space-16); padding: var(--sk-space-12) 0; border-block-end: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle); min-inline-size: 0; }
.sk-activity-list__content { flex: 1 1 14rem; min-inline-size: 0; }
.sk-activity-list__empty { padding-block: var(--sk-space-16); color: var(--sk-color-text-secondary); }
.sk-activity-list__title { font-size: var(--sk-font-size-body-sm); font-weight: var(--sk-font-weight-medium); overflow-wrap: anywhere; }
.sk-activity-list__meta, .sk-activity-list__time { margin: var(--sk-space-4) 0 0; color: var(--sk-color-text-secondary); font-size: var(--sk-font-size-body-xs); line-height: var(--sk-line-height-body-xs); }
@media (forced-colors: active) { .sk-activity-list__item { border-color: CanvasText; } }`,
  }),
];

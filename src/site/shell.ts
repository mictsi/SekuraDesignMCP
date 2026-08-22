/**
 * Documentation site shell.
 *
 * The parts every page must get identically right — the pre-paint theme script,
 * the landmark structure, the skip link, the live region — live here and nowhere
 * else.
 */

import { renderMarkdown, escapeHtml, slugify } from '../lib/markdown.js';

import { VERSION } from '../lib/version.js';

export const SITE_NAME = 'Sekura Design System';
export const SITE_VERSION = VERSION;

/* ------------------------------------------------------------------ *
 * Navigation
 * ------------------------------------------------------------------ */

export interface NavItem {
  file: string;
  label: string;
  /** Shown to the right of the label, e.g. a count. */
  meta?: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Get started',
    items: [
      { file: 'index.html', label: 'Overview' },
      { file: 'structure.html', label: 'How it is structured' },
      { file: 'develop.html', label: 'For developers' },
      { file: 'behaviours.html', label: 'Behaviours package' },
    ],
  },
  {
    label: 'Foundations',
    items: [
      { file: 'principles.html', label: 'Principles' },
      { file: 'color.html', label: 'Colour' },
      { file: 'dark-mode.html', label: 'Dark mode' },
      { file: 'typography.html', label: 'Typography' },
      { file: 'spacing.html', label: 'Spacing & density' },
      { file: 'layout.html', label: 'Layout & responsive' },
      { file: 'elevation.html', label: 'Elevation & motion' },
      { file: 'iconography.html', label: 'Iconography' },
      { file: 'dataviz.html', label: 'Data visualisation' },
      { file: 'content.html', label: 'Content & voice' },
      { file: 'i18n.html', label: 'Internationalisation' },
      { file: 'accessibility.html', label: 'Accessibility' },
      { file: 'theming.html', label: 'Theming' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { file: 'tokens.html', label: 'All tokens' },
      { file: 'components.html', label: 'Components' },
      { file: 'patterns.html', label: 'Patterns' },
      { file: 'recipes.html', label: 'Layout recipes' },
    ],
  },
  {
    label: 'Examples',
    items: [
      { file: 'examples.html', label: 'All examples' },
      { file: 'example-dashboard.html', label: 'Dashboard' },
      { file: 'example-list.html', label: 'List page' },
      { file: 'example-detail.html', label: 'Detail page' },
      { file: 'example-form.html', label: 'Form page' },
      { file: 'example-states.html', label: 'Loading, empty & error' },
      { file: 'example-onboarding.html', label: 'Onboarding wizard' },
      { file: 'example-settings.html', label: 'Settings' },
      { file: 'example-marketing.html', label: 'Marketing & pricing' },
      { file: 'example-signin.html', label: 'Sign in' },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

export function icon(name: string, size = 20, cls = ''): string {
  return `<svg${cls ? ` class="${cls}"` : ''} aria-hidden="true" focusable="false" width="${size}" height="${size}"><use href="#sk-icon-${name}"></use></svg>`;
}

export { escapeHtml, slugify };

/* ------------------------------------------------------------------ *
 * Page builder
 * ------------------------------------------------------------------ */

export class Page {
  readonly file: string;
  readonly title: string;
  readonly eyebrow: string;
  readonly lead: string;
  /**
   * Which nav entry to mark current. Detail pages that are not themselves in the
   * navigation — the 55 component pages — point at their index instead, so the
   * sidebar never shows nothing selected.
   */
  navFile: string;
  private parts: string[] = [];
  readonly toc: Array<{ id: string; text: string }> = [];

  constructor(opts: {
    file: string;
    title: string;
    eyebrow: string;
    lead: string;
    navFile?: string;
  }) {
    this.file = opts.file;
    this.title = opts.title;
    this.eyebrow = opts.eyebrow;
    this.lead = opts.lead;
    this.navFile = opts.navFile ?? opts.file;
  }

  /** Raw HTML. */
  add(html: string): this {
    this.parts.push(html);
    return this;
  }

  /** A top-level section, registered in the on-page contents. */
  section(title: string, body: string, id = slugify(title)): this {
    this.toc.push({ id, text: title });
    this.parts.push(
      `<section class="docs-section" id="${id}" aria-labelledby="${id}-h">\n` +
        `<h2 class="docs-section__title" id="${id}-h">${escapeHtml(title)}</h2>\n${body}\n</section>`
    );
    return this;
  }

  /** Markdown, with its h2s folded into the on-page contents. */
  markdown(md: string, opts: { idPrefix?: string; inToc?: boolean } = {}): this {
    const headings: Array<{ level: number; text: string; id: string }> = [];
    const html = renderMarkdown(md, { headings, idPrefix: opts.idPrefix });
    if (opts.inToc !== false) {
      for (const h of headings) {
        if (h.level === 2) this.toc.push({ id: h.id, text: h.text });
      }
    }
    this.parts.push(`<div class="docs-prose">${html}</div>`);
    return this;
  }

  /**
   * The full foundation narrative, folded into a collapsed section.
   *
   * Pages with rich hand-written sections already cover this material; the
   * narrative adds depth without repeating headings in the contents, and its
   * ids are prefixed so they cannot collide with the sections above.
   */
  reference(title: string, markdownBody: string, prefix: string): this {
    const headings: Array<{ level: number; text: string; id: string }> = [];
    const html = renderMarkdown(markdownBody, { headings, idPrefix: prefix });
    const id = slugify(title);
    this.toc.push({ id, text: title });
    this.parts.push(
      `<section class="docs-section" id="${id}" aria-labelledby="${id}-h">
        <h2 class="docs-section__title" id="${id}-h">${escapeHtml(title)}</h2>
        <details class="sk-details docs-reference">
          <summary>Read the full ${escapeHtml(title.toLowerCase())} narrative</summary>
          <div class="docs-prose">${html}</div>
        </details>
      </section>`
    );
    return this;
  }

  body(): string {
    return this.parts.join('\n');
  }
}

/* ------------------------------------------------------------------ *
 * Reusable documentation blocks
 * ------------------------------------------------------------------ */

/** A short, coloured aside. Not an alert — it carries no system state. */
export function callout(
  intent: 'info' | 'warning' | 'danger' | 'success' | 'ai',
  title: string,
  body: string
): string {
  const icons = {
    info: 'info',
    warning: 'warning',
    danger: 'error',
    success: 'check-circle',
    ai: 'activity',
  } as const;
  return (
    `<div class="sk-alert sk-alert--${intent} docs-callout">` +
      icon(icons[intent], 20, 'sk-alert__icon') +
      `<div class="sk-alert__content">` +
        (title ? `<h3 class="sk-alert__title">${escapeHtml(title)}</h3>` : '') +
        `<div class="sk-alert__body">${body}</div>` +
      `</div>` +
    `</div>`
  );
}

/** Side-by-side guidance. Concrete beats abstract, so pass real examples. */
export function doDont(dos: string[], donts: string[]): string {
  const list = (items: string[], kind: 'do' | 'dont') =>
    `<div class="docs-dodont__col docs-dodont__col--${kind}">
      <p class="docs-dodont__label">
        ${icon(kind === 'do' ? 'check-circle' : 'error', 16)}
        ${kind === 'do' ? 'Do' : "Don't"}
      </p>
      <ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>
    </div>`;
  return `<div class="docs-dodont">${list(dos, 'do')}${list(donts, 'dont')}</div>`;
}

/**
 * Sequential rather than random, so a rebuild with unchanged input produces
 * byte-identical output — otherwise every build shows a diff.
 */
let demoCounter = 0;
export function resetDemoIds(): void {
  demoCounter = 0;
}

/** A live preview with the markup that produced it. */
export function demo(
  preview: string,
  code?: string,
  opts: { label?: string; lang?: string; pad?: boolean } = {}
): string {
  const id = `demo-${(demoCounter += 1)}`;
  const codeBlock = code
    ? `<div class="docs-demo__code" id="${id}-code" hidden>
        <div class="sk-code-block">
          <div class="sk-code-block__header">
            <span class="sk-code-block__language">${escapeHtml(opts.lang ?? 'html')}</span>
            <button type="button" class="sk-button sk-button--ghost sk-button--sm" data-sk-copy-block>
              ${icon('copy', 14, 'sk-button__icon')}
              <span class="sk-button__label" data-sk-copy-label>Copy</span>
            </button>
          </div>
          <div class="sk-code-block__scroll" tabindex="0" role="region" aria-label="Example markup">
<pre class="sk-code-block__pre"><code>${escapeHtml(code.trim())}</code></pre>
          </div>
        </div>
      </div>`
    : '';

  return `<div class="docs-demo">
    ${opts.label ? `<p class="docs-demo__label">${escapeHtml(opts.label)}</p>` : ''}
    <div class="docs-demo__preview${opts.pad === false ? ' docs-demo__preview--flush' : ''}">${preview}</div>
    ${code
      ? `<div class="docs-demo__toolbar">
           <button type="button" class="sk-button sk-button--ghost sk-button--sm"
                   aria-expanded="false" aria-controls="${id}-code" data-sk-toggle-target="#${id}-code">
             ${icon('chevron-down', 14, 'sk-button__icon')}
             <span class="sk-button__label">Show markup</span>
             <span class="sk-visually-hidden">${opts.label ? ` for ${escapeHtml(opts.label)}` : ` for example ${demoCounter}`}</span>
           </button>
         </div>`
      : ''}
    ${codeBlock}
  </div>`;
}

/**
 * The same fragment rendered under two themes at once.
 *
 * Forcing a theme on a subtree works because every token is a custom property
 * inherited from the element carrying data-sk-theme — no duplicated CSS, no
 * second component.
 */
export function themeCompare(fragment: string, caption?: string): string {
  const pane = (theme: 'light' | 'dark') =>
    `<div class="docs-compare__pane" data-sk-theme="${theme}">
      <p class="docs-compare__label">${theme === 'light' ? 'Light' : 'Dark'}</p>
      <div class="docs-compare__body">${fragment}</div>
    </div>`;
  return `<figure class="docs-compare">
    <div class="docs-compare__grid">${pane('light')}${pane('dark')}</div>
    ${caption ? `<figcaption class="docs-compare__caption">${caption}</figcaption>` : ''}
  </figure>`;
}

/* ------------------------------------------------------------------ *
 * Shell rendering
 * ------------------------------------------------------------------ */

const THEME_SCRIPT = `<script>
(function () {
  var root = document.documentElement;
  function sysTheme() { return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  function sysContrast() { return matchMedia('(prefers-contrast: more)').matches ? 'more' : 'normal'; }
  function resolve() {
    var pref, contrast;
    try {
      pref = localStorage.getItem('sk-theme') || 'system';
      contrast = localStorage.getItem('sk-contrast') || 'system';
    } catch (e) { pref = 'system'; contrast = 'system'; }
    var base = pref === 'system' ? sysTheme() : pref;
    var hc = contrast === 'system' ? sysContrast() : contrast;
    return hc === 'more' ? 'hc-' + base : base;
  }
  function apply() { root.setAttribute('data-sk-theme', resolve()); }
  apply();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
  matchMedia('(prefers-contrast: more)').addEventListener('change', apply);
  window.sekuraTheme = {
    set: function (v) { try { localStorage.setItem('sk-theme', v); } catch (e) {} apply(); },
    get: function () { try { return localStorage.getItem('sk-theme') || 'system'; } catch (e) { return 'system'; } },
    resolved: resolve
  };
})();
</script>`;

function renderNav(current: string): string {
  return NAV.map((group) => {
    const id = `nav-${slugify(group.label)}`;
    const items = group.items
      .map((item) => {
        const isCurrent = item.file === current;
        return `      <li>
        <a class="sk-side-nav__item" href="${item.file}"${isCurrent ? ' aria-current="page"' : ''}>
          <span class="sk-side-nav__label">${escapeHtml(item.label)}</span>
          ${item.meta ? `<span class="sk-side-nav__count">${escapeHtml(item.meta)}</span>` : ''}
        </a>
      </li>`;
      })
      .join('\n');
    return `    <h2 class="sk-side-nav__group-label" id="${id}">${escapeHtml(group.label)}</h2>
    <ul class="sk-side-nav__list" aria-labelledby="${id}">
${items}
    </ul>`;
  }).join('\n');
}

function renderToc(toc: Array<{ id: string; text: string }>): string {
  if (toc.length < 2) return '';
  return `<aside class="docs-toc" aria-labelledby="toc-heading">
    <h2 class="docs-toc__heading" id="toc-heading">On this page</h2>
    <nav aria-label="On this page">
      <ul class="docs-toc__list">
${toc.map((t) => `        <li><a class="docs-toc__link" href="#${t.id}">${escapeHtml(t.text)}</a></li>`).join('\n')}
      </ul>
    </nav>
  </aside>`;
}

function head(title: string, description: string): string {
  return `<meta charset="utf-8" />
<!-- Never user-scalable=no or maximum-scale — that fails WCAG 1.4.4 outright. -->
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} · ${SITE_NAME}</title>
<meta name="description" content="${escapeHtml(description)}" />

<!-- Theme, applied before first paint. This must stay inline, synchronous and
     ahead of every stylesheet: anything asynchronous is too late and produces a
     flash of the wrong theme on every page load. -->
${THEME_SCRIPT}

<link rel="stylesheet" href="assets/sekura.css" />
<link rel="stylesheet" href="assets/docs.css" />`;
}

function topBar(): string {
  return `<header class="sk-top-bar sk-top-bar--sticky docs-topbar">
  <button type="button" class="sk-icon-button sk-top-bar__nav-trigger" aria-expanded="false" aria-controls="primary-nav">
    ${icon('menu')}
    <span class="sk-visually-hidden">Open navigation</span>
  </button>

  <a class="sk-top-bar__identity" href="index.html">
    ${icon('logo', 24, 'sk-top-bar__logo')}
    <span class="sk-top-bar__product">Sekura</span>
  </a>
  <span class="sk-badge sk-badge--neutral docs-topbar__version">v${SITE_VERSION}</span>

  <button type="button" class="sk-search sk-search--sm sk-search--as-button docs-topbar__search" data-sk-palette-open>
    ${icon('search', 16, 'sk-search__icon')}
    <span class="sk-search__input sk-search__placeholder">Search the design system</span>
    <kbd class="sk-kbd">Ctrl K</kbd>
  </button>

  <div class="sk-top-bar__utilities">
    <!-- Three options, not two. System must exist and must be the default, or
         the first touch of a toggle silently overrides the user's OS setting
         with no way back. -->
    <div class="sk-button-group sk-button-group--segmented docs-theme-switch"
         role="radiogroup" aria-label="Colour theme">
      <button type="button" class="sk-button-group__segment" role="radio" data-sk-theme-option="system"
              data-sk-tooltip="Follow your operating system">
        ${icon('monitor', 16)}<span class="docs-theme-switch__label">System</span>
      </button>
      <button type="button" class="sk-button-group__segment" role="radio" data-sk-theme-option="light"
              data-sk-tooltip="Always light">
        ${icon('sun', 16)}<span class="docs-theme-switch__label">Light</span>
      </button>
      <button type="button" class="sk-button-group__segment" role="radio" data-sk-theme-option="dark"
              data-sk-tooltip="Always dark">
        ${icon('moon', 16)}<span class="docs-theme-switch__label">Dark</span>
      </button>
    </div>
  </div>
</header>`;
}

function commandPalette(entries: Array<{ file: string; label: string; group: string; context?: string }>): string {
  const groups = [...new Set(entries.map((e) => e.group))];
  const body = groups
    .map((g) => {
      const items = entries
        .filter((e) => e.group === g)
        .map(
          (e) =>
            `<div class="sk-command-palette__item" role="option" aria-selected="false" data-href="${e.file}">
              ${icon('chevron-right', 16)}
              <span class="sk-command-palette__label">${escapeHtml(e.label)}</span>
              ${e.context ? `<span class="sk-command-palette__context">${escapeHtml(e.context)}</span>` : ''}
            </div>`
        )
        .join('');
      return `<div role="group" aria-label="${escapeHtml(g)}" data-sk-palette-group>
        <p class="sk-command-palette__group-label" aria-hidden="true">${escapeHtml(g)}</p>
        ${items}
      </div>`;
    })
    .join('');

  return `<div class="sk-command-palette" id="command-palette" role="dialog" aria-modal="true" aria-label="Search" hidden>
  <div class="sk-command-palette__panel">
    <div class="sk-command-palette__search">
      ${icon('search')}
      <label class="sk-visually-hidden" for="cp-input">Search the design system</label>
      <input class="sk-command-palette__input" id="cp-input" type="text" role="combobox"
             aria-expanded="true" aria-controls="cp-results" aria-autocomplete="list"
             autocomplete="off" placeholder="Search the design system" />
      <kbd class="sk-kbd">Esc</kbd>
    </div>
    <div class="sk-command-palette__results" id="cp-results" role="listbox" aria-label="Results">
      ${body}
      <p class="sk-command-palette__empty" data-sk-palette-empty hidden>
        Nothing matches. Try a component name, a token, or a foundation.
      </p>
    </div>
    <p class="sk-visually-hidden" role="status" data-sk-palette-status></p>
  </div>
</div>`;
}

export interface ShellContext {
  palette: Array<{ file: string; label: string; group: string; context?: string }>;
}

/** A documentation page: nav, article, on-page contents. */
export function renderDocsPage(page: Page, ctx: ShellContext): string {
  return `<!doctype html>
<html lang="en">
<head>
${head(page.title, page.lead.replace(/<[^>]+>/g, '').slice(0, 160))}
</head>

<body class="sk-app-shell docs">
<!-- Injected synchronously so the symbols exist before any <use> is parsed. -->
<script src="assets/icons.js"></script>

<a class="sk-skip-link" href="#main">Skip to main content</a>

${topBar()}

<div class="sk-app-shell__body">
  <nav class="sk-side-nav docs-nav" id="primary-nav" aria-label="Primary">
${renderNav(page.navFile)}
  </nav>

  <!-- tabindex="-1" so the skip link can actually move focus here. Without it
       the browser scrolls but focus stays behind. -->
  <main class="sk-app-shell__main" id="main" tabindex="-1">
    <div class="docs-layout">
      <article class="docs-article">
        <header class="docs-header">
          <p class="docs-eyebrow">${escapeHtml(page.eyebrow)}</p>
          <h1 class="docs-title">${escapeHtml(page.title)}</h1>
          <p class="docs-lead">${page.lead}</p>
        </header>
${page.body()}
      </article>
${renderToc(page.toc)}
    </div>
  </main>
</div>

<!-- Exists at load, empty. Creating the region and its message in the same tick
     announces nothing. -->
<div class="sk-toast-region" role="status" aria-live="polite" aria-label="Notifications"></div>

${commandPalette(ctx.palette)}

<script src="assets/app.js"></script>
<script src="assets/docs.js"></script>
</body>
</html>
`;
}

/**
 * An example page: the full application shell, with a banner making clear it is
 * a demonstration rather than the documentation itself.
 */
export function renderExamplePage(
  opts: { file: string; title: string; description: string; bare?: boolean; bodyClass?: string },
  content: string,
  ctx: ShellContext
): string {
  const banner = `<div class="docs-example-banner">
  <div class="docs-example-banner__inner">
    ${icon('info', 16)}
    <p class="docs-example-banner__text">
      <strong>Example.</strong> ${escapeHtml(opts.description)}
      Every pixel comes from the design system — no page-specific colours, sizes or spacing.
    </p>
    <a class="sk-link docs-example-banner__back" href="index.html">
      Back to the documentation
      ${icon('arrow-right', 14)}
    </a>
  </div>
</div>`;

  if (opts.bare) {
    return `<!doctype html>
<html lang="en">
<head>
${head(opts.title, opts.description)}
</head>
<body class="${opts.bodyClass ?? 'sk-auth'}">
<script src="assets/icons.js"></script>
<a class="sk-skip-link" href="#main">Skip to main content</a>
${banner}
${content}
<div class="sk-toast-region" role="status" aria-live="polite" aria-label="Notifications"></div>
<script src="assets/app.js"></script>
</body>
</html>
`;
  }

  return `<!doctype html>
<html lang="en">
<head>
${head(opts.title, opts.description)}
</head>

<body class="sk-app-shell">
<script src="assets/icons.js"></script>

<a class="sk-skip-link" href="#main">Skip to main content</a>

${banner}
${topBar()}

<div class="sk-app-shell__body">
  <nav class="sk-side-nav docs-nav" id="primary-nav" aria-label="Primary">
${renderNav(opts.file)}
  </nav>

  <main class="sk-app-shell__main" id="main" tabindex="-1">
    <div class="sk-app-shell__content sk-stack sk-stack--gap-24">
${content}
    </div>
  </main>
</div>

<div class="sk-toast-region" role="status" aria-live="polite" aria-label="Notifications"></div>

${commandPalette(ctx.palette)}

<script src="assets/app.js"></script>
</body>
</html>
`;
}

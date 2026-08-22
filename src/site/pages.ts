/**
 * Documentation page builders.
 *
 * Every page is generated from the design system's own data, so the colour
 * guide shows genuinely audited values and the component pages show the same
 * specification the MCP server serves. Nothing here is transcribed by hand.
 */

import {
  breakpoints,
  densities,
  elevation,
  focusRing,
  ramps,
  semanticTokens,
  THEMES,
  themeInfo,
  typeScale,
  scales,
  auditThemes,
  contrastRequirements,
  opaqueValue,
  resolvePrimitive,
  tokenGroups,
  type ThemeName,
} from '../data/tokens.js';
import { alpha, motionUsage, rampDescriptions } from '../data/primitives.js';
import { components, componentCategories, categoryDescriptions } from '../data/components/index.js';
import { foundations, getFoundation } from '../data/foundations.js';
import { patterns } from '../data/patterns.js';
import { layouts } from '../data/layouts.js';
import { contrastRatio, evaluateContrast } from '../lib/color.js';
import { escapeHtml, slugify } from '../lib/markdown.js';
import { Page, callout, demo, doDont, icon, themeCompare } from './shell.js';

const md = (id: string) => getFoundation(id)?.body ?? '';
const summaryOf = (id: string) => getFoundation(id)?.summary ?? '';

function rules(id: string): string {
  const f = getFoundation(id);
  if (!f) return '';
  return `<div class="docs-rules">
    <p class="docs-rules__label">${icon('shield', 16)} The rules</p>
    <ul>${f.rules.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
  </div>`;
}

function ratio(fg: string, bg: string): string {
  return contrastRatio(fg, bg).toFixed(2);
}

/* ================================================================== *
 * Shared renderers
 * ================================================================== */

/**
 * A primitive ramp, with the contrast of each step against white and black.
 * Those two numbers are what a designer actually needs in order to know which
 * step is safe for text and which is only safe for a boundary.
 */
function renderRamp(name: string, ramp: Record<string, string>): string {
  const pinned: Record<string, string> = {
    'neutral-400': 'Lightest grey clearing 3:1 on white — the floor for borders.',
    'neutral-500': 'Lightest grey clearing 4.5:1 on the subtle surface — the floor for readable text.',
  };

  const notes: string[] = [];

  const steps = Object.entries(ramp)
    .map(([step, hex]) => {
      const onWhite = ratio(hex, '#ffffff');
      const onBlack = ratio(hex, '#000000');
      const note = pinned[`${name}-${step}`];
      if (note) notes.push(`<strong>${escapeHtml(step)}</strong> — ${escapeHtml(note)}`);
      return `<div class="ramp__step${note ? ' ramp__step--pinned' : ''}">
        <div class="ramp__chip" data-swatch style="background:${hex}"></div>
        <div class="ramp__meta">
          <span class="ramp__step-name">${escapeHtml(step)}${note ? ` ${icon('pin', 11)}` : ''}</span>
          <span class="ramp__hex">${escapeHtml(hex)}</span>
          <span class="ramp__contrast" title="Contrast against white / against black">
            ${onWhite} <span aria-hidden="true">/</span> ${onBlack}
            <span class="sk-visually-hidden">contrast against white and against black</span>
          </span>
        </div>
      </div>`;
    })
    .join('');

  // Notes live under the ramp rather than inside a cell: a grid row is as tall
  // as its tallest item, so an inline note would leave a large gap across the
  // whole row.
  const footnotes = notes.length
    ? `<ul class="ramp__notes">${notes.map((n) => `<li>${icon('pin', 12)}<span>${n}</span></li>`).join('')}</ul>`
    : '';

  return `<div class="ramp" id="ramp-${name}">
    <div class="ramp__header">
      <h3 class="ramp__title">${escapeHtml(name)}</h3>
      <p class="ramp__desc">${escapeHtml(rampDescriptions[name] ?? '')}</p>
    </div>
    <div class="ramp__steps">${steps}</div>
    ${footnotes}
  </div>`;
}

/** Semantic tokens in one group, with the value each theme resolves to. */
function renderSemanticGroup(group: string): string {
  const inGroup = semanticTokens.filter((t) => t.group === group);
  const rows = inGroup
    .map((t) => {
      const cells = THEMES.map((theme) => {
        const value = resolvePrimitive(t.values[theme]);
        return `<td class="token-table__value">
          <span class="token-table__chip" data-swatch style="background:${value}"></span>
          <code>${escapeHtml(value)}</code>
        </td>`;
      }).join('');
      return `<tr>
        <th scope="row">
          <code class="token-table__name">--sk-${escapeHtml(t.name)}</code>
          ${t.contrastExempt ? '<span class="sk-badge sk-badge--neutral sk-badge--sm">contrast-exempt</span>' : ''}
        </th>
        ${cells}
        <td class="token-table__desc">${escapeHtml(t.description)}</td>
      </tr>`;
    })
    .join('');

  return `<div class="sk-table token-table" role="region" aria-label="${escapeHtml(group)} tokens" tabindex="0">
    <table>
      <thead>
        <tr>
          <th scope="col">Token</th>
          ${THEMES.map((t) => `<th scope="col">${escapeHtml(themeInfo[t].label)}</th>`).join('')}
          <th scope="col">Role</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

/** The declared contrast promises, with the measured ratio in every theme. */
function renderContrastContract(): string {
  const rows = contrastRequirements
    .map((req) => {
      const cells = THEMES.map((theme) => {
        const fg = opaqueValue(req.foreground, theme);
        const bg = opaqueValue(req.background, theme);
        if (!fg || !bg) return '<td>—</td>';
        const v = evaluateContrast(fg, bg, req.use);
        const pass = v.grade !== 'fail';
        return `<td class="contrast-cell contrast-cell--${pass ? 'pass' : 'fail'}">
          <span class="contrast-cell__ratio">${v.ratio.toFixed(2)}</span>
          <span class="sk-visually-hidden">${pass ? 'passes' : 'fails'}</span>
        </td>`;
      }).join('');
      const needed = req.use === 'body-text' ? '4.5:1' : '3:1';
      return `<tr>
        <th scope="row"><code>${escapeHtml(req.foreground)}</code></th>
        <td><code>${escapeHtml(req.background)}</code></td>
        <td><span class="sk-badge sk-badge--neutral sk-badge--sm">${escapeHtml(req.use)}</span></td>
        <td class="sk-table__cell--numeric">${needed}</td>
        ${cells}
      </tr>`;
    })
    .join('');

  return `<div class="sk-table contrast-table" role="region" aria-label="Contrast contract" tabindex="0">
    <table>
      <thead>
        <tr>
          <th scope="col">Foreground</th>
          <th scope="col">Background</th>
          <th scope="col">Use</th>
          <th scope="col" class="sk-table__cell--numeric">Needs</th>
          ${THEMES.map((t) => `<th scope="col" class="sk-table__cell--numeric">${escapeHtml(themeInfo[t].label)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

/* ================================================================== *
 * Get started
 * ================================================================== */

export function overviewPage(): Page {
  const p = new Page({
    file: 'index.html',
    title: 'Sekura Design System',
    eyebrow: 'Overview',
    lead:
      'A design and UX specification for building accessible, dark-mode-first product interfaces — ' +
      'with every colour promise verified by machine rather than by eye.',
  });

  const stats = [
    { value: String(components.length), label: 'components' },
    { value: String(semanticTokens.length), label: 'semantic tokens' },
    { value: String(THEMES.length), label: 'themes' },
    { value: '292', label: 'contrast checks' },
    { value: String(foundations.length), label: 'foundations' },
    { value: String(patterns.length), label: 'UX patterns' },
  ];

  p.add(`<div class="docs-stats">${stats
    .map(
      (s) => `<div class="docs-stat">
        <span class="docs-stat__value">${s.value}</span>
        <span class="docs-stat__label">${s.label}</span>
      </div>`
    )
    .join('')}</div>`);

  p.section(
    'The two rules everything follows from',
    `<div class="docs-bigrule">
      <div class="docs-bigrule__item">
        <span class="docs-bigrule__num">1</span>
        <div>
          <h3>Semantic before literal</h3>
          <p>
            Product code references <code class="sk-code">--sk-color-text-primary</code>. Never a hex
            value, never a primitive. A component that names a <em>role</em> can be re-themed;
            a component that names a <em>value</em> cannot. This is what makes four themes cost
            the same as one.
          </p>
          <p class="docs-bigrule__test">
            <strong>The test:</strong> if you can grep a component's CSS for a hex value, the
            component is broken — and it is broken specifically in dark mode.
          </p>
        </div>
      </div>
      <div class="docs-bigrule__item">
        <span class="docs-bigrule__num">2</span>
        <div>
          <h3>Dark mode is a peer, not a filter</h3>
          <p>
            Not an inversion, and not <code class="sk-code">filter: invert()</code>. Floating surfaces
            get <em>lighter</em> as they rise, saturated fills step <em>up</em> the ramp so their
            labels flip to near-black, and borders take over the separation work that shadows do
            in light mode.
          </p>
          <p class="docs-bigrule__test">
            <a class="sk-link" href="dark-mode.html">See the nine things that break silently →</a>
          </p>
        </div>
      </div>
    </div>`
  );

  p.section(
    'See it for yourself',
    `<p class="docs-para">
      Use the theme control in the header. The card below is the same markup rendered under both
      themes at once — note that in dark mode it becomes <em>lighter</em> than its page, and the
      border rather than the shadow is what separates it.
    </p>
    ${themeCompare(
      `<div class="sk-card">
        <div class="sk-card__header">
          <h4 class="sk-card__title">Website redesign</h4>
          <span class="sk-badge sk-badge--neutral">Production</span>
        </div>
        <div class="sk-card__body sk-stack sk-stack--gap-12">
          <span class="sk-status sk-status--success">
            <span class="sk-status__dot" aria-hidden="true"></span>
            <span class="sk-status__label">Applied</span>
            <span class="sk-status__detail">2 minutes ago</span>
          </span>
          <div class="sk-cluster sk-cluster--gap-8">
            <span class="sk-button sk-button--primary sk-button--sm" aria-hidden="true">Primary</span>
            <span class="sk-button sk-button--secondary sk-button--sm" aria-hidden="true">Secondary</span>
          </div>
        </div>
      </div>
      <div class="sk-alert sk-alert--warning sk-alert--compact">
        ${icon('warning', 16, 'sk-alert__icon')}
        <div class="sk-alert__content"><p class="sk-alert__body">4 tasks unassigned.</p></div>
      </div>`,
      'The tinted alert uses the deep <code class="sk-code">950</code> step in dark mode, not a darkened pale tint — that would read as muddy grey.'
    )}`
  );

  const cards = [
    { href: 'color.html', icon: 'contrast', title: 'Colour', body: 'Three layers, eight ramps, and 73 machine-verified contrast promises.' },
    { href: 'dark-mode.html', icon: 'moon', title: 'Dark mode', body: 'The elevation inversion, and the nine failures that pass review and break in production.' },
    { href: 'typography.html', icon: 'book', title: 'Typography', body: 'Nineteen type styles, and why heading level is not font size.' },
    { href: 'layout.html', icon: 'globe', title: 'Layout', body: 'Flex-first. Most layouts respond to their container and need no media query.' },
    { href: 'components.html', icon: 'server', title: 'Components', body: `${components.length} components, each with a full keyboard and ARIA contract.` },
    { href: 'accessibility.html', icon: 'shield', title: 'Accessibility', body: 'WCAG 2.2 AA as a component contract rather than a release checklist.' },
  ];

  p.section(
    'Where to go next',
    `<div class="docs-cardgrid">${cards
      .map(
        (c) => `<a class="docs-card" href="${c.href}">
          <span class="docs-card__icon">${icon(c.icon, 20)}</span>
          <span class="docs-card__title">${escapeHtml(c.title)}</span>
          <span class="docs-card__body">${escapeHtml(c.body)}</span>
        </a>`
      )
      .join('')}</div>`
  );

  p.section(
    'Who this is for',
    `<div class="docs-twocol">
      <div>
        <h3>Designers</h3>
        <p class="docs-para">
          Start with <a class="sk-link" href="color.html">Colour</a> and
          <a class="sk-link" href="typography.html">Typography</a>. Every ramp lists its contrast
          against white and black, so you can tell at a glance which step is safe for text and
          which is only safe for a boundary. <a class="sk-link" href="tokens.html">All tokens</a>
          is the complete reference.
        </p>
      </div>
      <div>
        <h3>Developers</h3>
        <p class="docs-para">
          Start with <a class="sk-link" href="develop.html">For developers</a>, then
          <a class="sk-link" href="components.html">Components</a> for paste-ready code and the
          keyboard model each component owes you.
          <a class="sk-link" href="structure.html">How it is structured</a> explains the layers.
        </p>
      </div>
    </div>`
  );

  return p;
}

export function structurePage(): Page {
  const p = new Page({
    file: 'structure.html',
    title: 'How it is structured',
    eyebrow: 'Get started',
    lead:
      'Three layers, one direction of dependency. Understanding this is most of understanding the system.',
  });

  p.section(
    'The three layers',
    `<div class="docs-layers">
      <div class="docs-layers__row">
        <div class="docs-layers__card docs-layers__card--primitive">
          <p class="docs-layers__kind">Layer 1 — Primitives</p>
          <p class="docs-layers__title">Raw values</p>
          <code class="docs-layers__example">cobalt-600 = #3a4fdd</code>
          <p class="docs-layers__note">
            Context-free. Says nothing about where it may be used. Eight ramps of 11–13 steps.
            <strong>Identical in every theme.</strong>
          </p>
        </div>
        <span class="docs-layers__arrow" aria-hidden="true">${icon('arrow-down', 20)}</span>
        <div class="docs-layers__card docs-layers__card--semantic">
          <p class="docs-layers__kind">Layer 2 — Semantic tokens</p>
          <p class="docs-layers__title">Roles</p>
          <code class="docs-layers__example">--sk-color-action-primary-bg</code>
          <p class="docs-layers__note">
            Names a job, not a value. <strong>Resolves to a different primitive per theme</strong> —
            this is the layer that makes theming work. ${semanticTokens.length} of them.
          </p>
        </div>
        <span class="docs-layers__arrow" aria-hidden="true">${icon('arrow-down', 20)}</span>
        <div class="docs-layers__card docs-layers__card--component">
          <p class="docs-layers__kind">Layer 3 — Components</p>
          <p class="docs-layers__title">Usage</p>
          <code class="docs-layers__example">.sk-button--primary { background: var(--sk-color-action-primary-bg) }</code>
          <p class="docs-layers__note">
            Consumes semantic tokens only. <strong>Never chooses a primitive.</strong>
          </p>
        </div>
      </div>
    </div>

    ${callout(
      'danger',
      'The one rule that matters',
      `<p>Dependencies point <strong>down only</strong>. A component may never reference a primitive,
      because a primitive does not change between themes — so anything referencing one will not
      adapt to dark mode. This is the single most common way a design system quietly breaks.</p>`
    )}`
  );

  p.section(
    'Naming',
    `<p class="docs-para">Token names read as a sentence from general to specific:</p>
    <div class="docs-naming">
      <code class="docs-naming__pattern">--sk-<span class="docs-naming__slot">group</span>-<span class="docs-naming__slot">role</span>-<span class="docs-naming__slot">variant</span>-<span class="docs-naming__slot">state</span></code>
      <ul class="docs-naming__examples">
        <li><code class="sk-code">--sk-color-surface-raised</code> <span>colour · surface · raised</span></li>
        <li><code class="sk-code">--sk-color-action-primary-bg-hover</code> <span>colour · action · primary · background · hovered</span></li>
        <li><code class="sk-code">--sk-color-status-danger-on-solid</code> <span>colour · status · danger · on a solid fill</span></li>
        <li><code class="sk-code">--sk-space-16</code> <span>spacing · 16px at a 16px root</span></li>
      </ul>
    </div>
    <p class="docs-para">
      Spacing tokens are named by their pixel value rather than a t-shirt size, so
      <code class="sk-code">--sk-space-12</code> is unambiguously 12px and needs no mental arithmetic.
    </p>`
  );

  p.section(
    'Token groups',
    `<p class="docs-para">Colour tokens fall into ${tokenGroups().length} groups:</p>
    <div class="docs-grouplist">${tokenGroups()
      .map((g) => {
        const count = semanticTokens.filter((t) => t.group === g).length;
        return `<a class="docs-grouplist__item" href="tokens.html#group-${g}">
          <span class="docs-grouplist__name">${escapeHtml(g)}</span>
          <span class="docs-grouplist__count">${count}</span>
        </a>`;
      })
      .join('')}</div>
    <p class="docs-para">
      Plus dimensional scales that do not vary by theme: ${Object.keys(scales)
        .map((s) => `<code class="sk-code">${escapeHtml(s)}</code>`)
        .join(', ')}.
    </p>`
  );

  p.section(
    'The themes',
    `<div class="docs-themelist">${THEMES.map(
      (t) => `<div class="docs-themelist__item">
        <div class="docs-themelist__swatch" data-sk-theme="${t}">
          <span class="docs-themelist__surface"></span>
          <span class="docs-themelist__text">Aa</span>
        </div>
        <div>
          <p class="docs-themelist__name"><code class="sk-code">${t}</code> — ${escapeHtml(themeInfo[t].label)}</p>
          <p class="docs-themelist__desc">${escapeHtml(themeInfo[t].description)}</p>
        </div>
      </div>`
    ).join('')}</div>
    ${callout(
      'info',
      '',
      `<p>High contrast is a <strong>separate axis</strong> from light and dark, driven by
      <code class="sk-code">prefers-contrast: more</code>. Do not conflate the two: a user can want
      dark <em>and</em> high contrast, which is why there are four themes rather than three.</p>`
    )}`
  );

  p.section(
    'Density',
    `<p class="docs-para">
      A third independent axis. Density changes control padding and row height only — it never
      reduces text below 14px or a hit target below 24×24 CSS px.
    </p>
    <div class="sk-table" role="region" aria-label="Density modes" tabindex="0">
      <table>
        <thead><tr><th scope="col">Mode</th><th scope="col">Control height</th><th scope="col">Row padding</th><th scope="col">Use</th></tr></thead>
        <tbody>${Object.entries(densities)
          .map(
            ([name, d]) => `<tr>
              <th scope="row"><code class="sk-code">${escapeHtml(name)}</code></th>
              <td>${escapeHtml(d.controlHeightMd)}</td>
              <td>${escapeHtml(d.rowPaddingBlock)}</td>
              <td>${escapeHtml(d.description)}</td>
            </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
    <p class="docs-para">
      Theme, brand and density compose as independent attributes on the root:
      <code class="sk-code">data-sk-theme</code> × <code class="sk-code">data-sk-brand</code> ×
      <code class="sk-code">data-sk-density</code>.
    </p>`
  );

  return p;
}

export function developPage(): Page {
  const p = new Page({
    file: 'develop.html',
    title: 'For developers',
    eyebrow: 'Get started',
    lead: 'Install the stylesheet, set the theme before first paint, and reference semantic tokens.',
  });

  p.section(
    'Install',
    `<p class="docs-para">
      The design system ships as plain CSS with no runtime dependency and no framework requirement.
    </p>
    ${demo('', `# Generate the stylesheets
npm run emit:css

# dist-css/
#   sekura.css            everything in one file (~190 KB uncompressed)
#   tokens.css            just the custom properties, all themes and densities
#   tokens.dtcg.json      W3C Design Tokens format
#   tailwind.config.js    Tailwind v3 config
#   SekuraColor.swift     iOS
#   android-resources.xml Android
#   components/*.css      one file per component`, { lang: 'bash', label: 'Build the artefacts' })}`
  );

  p.section(
    'The HTML scaffold',
    `${callout(
      'warning',
      'Script order matters',
      `<p>The theme script must be <strong>inline, synchronous, and before every stylesheet</strong>.
      Anything asynchronous is too late and produces a flash of the wrong theme on every page load —
      the single most visible dark-mode defect.</p>`
    )}
    ${demo('', `<!doctype html>
<html lang="en" data-sk-density="comfortable">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Projects · Your product</title>

  <!-- 1. Theme FIRST, inline and synchronous -->
  <script>
    (function () {
      var pref = localStorage.getItem('sk-theme') || 'system';
      var dark = pref === 'system'
        ? matchMedia('(prefers-color-scheme: dark)').matches
        : pref === 'dark';
      document.documentElement.setAttribute('data-sk-theme', dark ? 'dark' : 'light');
    })();
  </script>

  <!-- 2. Then the stylesheets -->
  <link rel="stylesheet" href="/sekura.css" />
</head>
<body class="sk-app-shell">
  <a class="sk-skip-link" href="#main">Skip to main content</a>
  <header class="sk-top-bar sk-top-bar--sticky">…</header>
  <div class="sk-app-shell__body">
    <nav class="sk-side-nav" aria-label="Primary">…</nav>
    <main class="sk-app-shell__main" id="main" tabindex="-1">…</main>
  </div>

  <!-- Must exist at load, empty. Creating the region and its message together
       announces nothing. -->
  <div class="sk-toast-region" role="status" aria-live="polite" aria-label="Notifications"></div>
</body>
</html>`, { lang: 'html', label: 'Minimum viable page' })}`
  );

  p.section(
    'Using tokens',
    `${demo('', `/* Yes — names a role, adapts to every theme */
.my-panel {
  background-color: var(--sk-color-surface-raised);
  border: 1px solid var(--sk-color-border-default);
  color: var(--sk-color-text-primary);
  padding: var(--sk-space-16);
  border-radius: var(--sk-radius-lg);
  box-shadow: var(--sk-elevation-1);
}

/* No — names values, and will be wrong in dark mode */
.my-panel {
  background-color: #ffffff;
  border: 1px solid #dfe3ea;
  color: #181e27;
  padding: 16px;
}

/* Also no — primitives do not change between themes */
.my-panel {
  background-color: var(--sk-palette-neutral-0);
}`, { lang: 'css', label: 'The only rule you have to remember' })}
    ${callout(
      'info',
      'Not sure which token?',
      `<p>Ask the MCP server: <code class="sk-code">suggest_token({ intent: "subtle border on a card" })</code>
      returns the applicable tokens with their value in every theme and a note on why that one rather
      than a neighbour. Or browse <a class="sk-link" href="tokens.html">All tokens</a>.</p>`
    )}`
  );

  p.section(
    'Switching theme',
    `${demo('', `// Three options, not two. "system" must exist and must be the default —
// a two-state toggle silently overrides the user's OS preference the first
// time they touch it, with no way back.
function setTheme(value /* 'system' | 'light' | 'dark' */) {
  localStorage.setItem('sk-theme', value);
  applyTheme();
  // The visual change is completely silent to a screen reader.
  announce('Theme set to ' + value + '.');
}

// High contrast is a SEPARATE axis, not a third theme option.
// prefers-contrast: more yields hc-light / hc-dark.`, { lang: 'js' })}`
  );

  p.section(
    'Frameworks',
    `<p class="docs-para">
      Sekura is class-based, so a framework component is a thin typed wrapper that maps props onto
      class names and forwards the ARIA the specification requires. The MCP server generates these
      on demand:
    </p>
    <div class="docs-chiprow">${['html', 'css', 'react', 'vue', 'svelte', 'angular', 'blazor', 'web-component']
      .map((f) => `<span class="sk-badge sk-badge--neutral">${f}</span>`)
      .join('')}</div>
    ${demo('', `get_component_code({ id: "button", framework: "react" })`, { lang: 'ts', label: 'MCP call' })}`
  );

  p.section(
    'Build gates',
    `<p class="docs-para">
      Two checks run on every build and both are gates, not reports. An artefact that breaks a
      declared colour promise, or contains a structurally invalid stylesheet, is not produced.
    </p>
    ${demo('', `npm run audit:contrast   # 292 contrast checks across 4 themes
npm run lint:css         # structural CSS lint over every component
npm run verify           # everything, including the sample site`, { lang: 'bash' })}
    ${callout(
      'success',
      '',
      `<p>The Docker image runs both plus the full smoke test during its build, so an image whose
      palette breaks a pairing cannot be produced. The container's
      <code class="sk-code">/health</code> endpoint re-runs the audit, so a running server using a
      broken palette reports unhealthy rather than serving it.</p>`
    )}`
  );

  return p;
}

/* ================================================================== *
 * Foundations
 * ================================================================== */

export function principlesPage(): Page {
  const p = new Page({
    file: 'principles.html',
    title: 'Principles',
    eyebrow: 'Foundations',
    lead: summaryOf('principles'),
  });
  p.add(rules('principles'));
  p.markdown(md('principles'));
  return p;
}

export function colorPage(): Page {
  const p = new Page({
    file: 'color.html',
    title: 'Colour',
    eyebrow: 'Foundations',
    lead:
      'Three layers, eight ramps, and 73 contrast promises that are verified by machine on every ' +
      'build rather than checked by eye once.',
  });

  p.add(rules('color'));

  p.section(
    'How colour works here',
    `<p class="docs-para">
      A primitive is a raw value with no meaning: <code class="sk-code">cobalt-600</code> is
      <code class="sk-code">#3a4fdd</code> and says nothing about where it may be used. A semantic
      token names a <em>job</em> — <code class="sk-code">--sk-color-action-primary-bg</code> — and
      resolves to a different primitive in each theme. Components consume semantic tokens and never
      choose a primitive.
    </p>
    ${demo(
      `<div class="docs-flow">
        <div class="docs-flow__node"><code>cobalt-600</code><span>#3a4fdd</span></div>
        <span class="docs-flow__arrow" aria-hidden="true">${icon('arrow-right', 18)}</span>
        <div class="docs-flow__node docs-flow__node--mid"><code>--sk-color-action-primary-bg</code><span>light theme</span></div>
        <span class="docs-flow__arrow" aria-hidden="true">${icon('arrow-right', 18)}</span>
        <div class="docs-flow__node"><code>.sk-button--primary</code><span>background-color</span></div>
      </div>`
    )}
    ${callout(
      'warning',
      'Why this matters more in dark mode than anywhere else',
      `<p>In dark mode that same button resolves to <code class="sk-code">cobalt-400</code> instead,
      and its label flips from white to near-black. A component that hard-coded
      <code class="sk-code">#3a4fdd</code> would be an unreadable dark blob on a dark page. The
      semantic layer is what prevents this, and it only works if nothing bypasses it.</p>`
    )}`
  );

  p.section(
    'Primitive ramps',
    `<p class="docs-para">
      Eight ramps. Each step lists its contrast against white and against black, which is what you
      actually need in order to know whether a step is safe for text (4.5:1), safe only for a
      boundary or icon (3:1), or decorative.
    </p>
    ${callout(
      'info',
      'Two steps are pinned by contrast, not by eye',
      `<p><code class="sk-code">neutral-400</code> is the lightest grey that still clears
      <strong>3:1 on white</strong>, so borders drawn with it remain locatable.
      <code class="sk-code">neutral-500</code> is the lightest that clears <strong>4.5:1 on the
      subtle surface</strong>, so tertiary text stays readable. Moving either lighter breaks a
      promise, and the audit catches it.</p>`
    )}
    ${Object.entries(ramps).map(([name, ramp]) => renderRamp(name, ramp)).join('')}
    <h3 id="alpha-primitives">Alpha primitives</h3>
    <p class="docs-para">
      Translucent values for overlays, hover washes and scrims that must work over unknown
      backdrops. Kept separate because their contrast can only be judged after compositing.
    </p>
    <div class="docs-chiprow docs-chiprow--alpha">${Object.entries(alpha)
      .map(
        ([name, value]) =>
          `<span class="alpha-chip"><span class="alpha-chip__swatch" data-swatch style="background:${value}"></span><code>${escapeHtml(name)}</code></span>`
      )
      .join('')}</div>`
  );

  p.section(
    'Semantic tokens',
    `<p class="docs-para">
      The only layer product code may touch. Each row shows what the token resolves to in every
      theme — the differences between the Light and Dark columns are the entire dark-mode strategy,
      made visible.
    </p>
    ${tokenGroups()
      .map(
        (g) => `<h3 id="semantic-${g}">${escapeHtml(g)}</h3>
        <p class="docs-para docs-para--tight">${semanticTokens.filter((t) => t.group === g).length} tokens</p>
        ${renderSemanticGroup(g)}`
      )
      .join('')}`
  );

  p.section(
    'The contrast contract',
    `<p class="docs-para">
      The system declares ${contrastRequirements.length} pairings and verifies every one in all four
      themes — ${contrastRequirements.length * THEMES.length} checks, run on every build. A pairing
      that is <strong>not</strong> in this table is not promised, and must not be used to carry
      meaning.
    </p>
    <div class="docs-chiprow">
      <span class="sk-badge sk-badge--success sk-badge--solid">All ${contrastRequirements.length * THEMES.length} passing</span>
      <span class="sk-badge sk-badge--neutral">Body text needs 4.5:1</span>
      <span class="sk-badge sk-badge--neutral">Boundaries, icons and focus need 3:1</span>
    </div>
    ${renderContrastContract()}
    <p class="docs-para">
      Sekura exceeds WCAG in three places where products commonly fail: <strong>placeholder
      text</strong> and <strong>tertiary text</strong> are both held to full body contrast, and
      <strong>switch and progress tracks</strong> are treated as meaningful graphics rather than
      decoration — because "off" must be visible, not merely absent.
    </p>`
  );

  p.section(
    'Choosing a colour',
    doDont(
      [
        'Use a semantic token that names what you are styling.',
        'Pair every status colour with an icon and a text label.',
        'Pair every selected state with a border or bar, not just a tint.',
        'Re-run the contrast audit after changing any palette value.',
      ],
      [
        'Never write a hex value in component CSS.',
        'Never reference <code class="sk-code">--sk-palette-*</code> from product code.',
        'Never use violet as a general accent — it is reserved for AI and automation.',
        'Never invent a ninth chart colour; group the tail into "Other" instead.',
      ]
    )
  );

  p.reference('Colour in depth', md('color'), 'ref-color-');
  return p;
}

export function darkModePage(): Page {
  const p = new Page({
    file: 'dark-mode.html',
    title: 'Dark mode',
    eyebrow: 'Foundations',
    lead:
      'How dark mode actually differs from light mode — and the nine things that pass a design ' +
      'review and break in production.',
  });

  p.add(rules('dark-mode'));

  const surfaceRows = [
    ['Page', 'color-surface-base', 'The page itself'],
    ['Sunken', 'color-surface-sunken', 'Code wells, drop zones — recessed'],
    ['Raised', 'color-surface-raised', 'Cards, panels'],
    ['Overlay', 'color-surface-overlay', 'Menus, dialogs, toasts'],
  ];

  p.section(
    'The elevation inversion',
    `<p class="docs-para">
      This is the rule everything else follows from. In light mode every surface is white and the
      <em>shadow</em> does the work. In dark mode a drop shadow is nearly invisible against a dark
      page, so <em>lightness</em> does the work instead: the higher a surface floats, the lighter it
      gets. Recessed surfaces go the other way.
    </p>
    <div class="sk-table" role="region" aria-label="Surface elevation by theme" tabindex="0">
      <table>
        <thead><tr>
          <th scope="col">Surface</th><th scope="col">Token</th>
          <th scope="col">Light</th><th scope="col">Dark</th><th scope="col">Direction on dark</th>
        </tr></thead>
        <tbody>${surfaceRows
          .map(([label, token, note]) => {
            const light = resolvePrimitive(
              semanticTokens.find((t) => t.name === token)!.values.light
            );
            const dark = resolvePrimitive(
              semanticTokens.find((t) => t.name === token)!.values.dark
            );
            const base = resolvePrimitive(
              semanticTokens.find((t) => t.name === 'color-surface-base')!.values.dark
            );
            const dir =
              token === 'color-surface-base'
                ? '—'
                : contrastRatio(dark, '#000000') > contrastRatio(base, '#000000')
                  ? '<span class="sk-badge sk-badge--success sk-badge--sm">lighter</span>'
                  : '<span class="sk-badge sk-badge--warning sk-badge--sm">darker</span>';
            return `<tr>
              <th scope="row">${escapeHtml(label!)}<br /><span class="docs-muted">${escapeHtml(note!)}</span></th>
              <td><code class="sk-code">${escapeHtml(token!)}</code></td>
              <td><span class="token-table__chip" data-swatch style="background:${light}"></span> <code>${light}</code></td>
              <td><span class="token-table__chip" data-swatch style="background:${dark}"></span> <code>${dark}</code></td>
              <td>${dir}</td>
            </tr>`;
          })
          .join('')}</tbody>
      </table>
    </div>
    ${themeCompare(
      `<div class="docs-elev-stack">
        <div class="docs-elev-stack__base">
          <span class="docs-elev-stack__tag">page</span>
          <div class="sk-card docs-elev-stack__card">
            <div class="sk-card__body"><strong>raised</strong> — a card</div>
          </div>
          <div class="docs-elev-stack__overlay">
            <strong>overlay</strong> — a menu
          </div>
        </div>
      </div>`,
      'Same markup. In light mode the card is white and separated by a shadow; in dark mode it is <em>lighter</em> than the page and separated by its border.'
    )}
    ${callout(
      'danger',
      'The corollary: keep the border',
      `<p>On a dark page, <code class="sk-code">border-default</code> is frequently the only thing
      separating a card from what is behind it. A component styled with a shadow and no border looks
      correct in light mode and disappears in dark mode.</p>`
    )}`
  );

  p.section(
    'Borders go darker, not lighter',
    `<p class="docs-para">
      Counter-intuitive, and the most common dark-mode bug in tables. A separator rule is
      <code class="sk-code">neutral-200</code> in light mode. The instinct is to lighten it for dark;
      the correct value is <code class="sk-code">neutral-800</code>, which is <em>further from
      white</em>. A light rule on a dark page produces bright lines that visually outrank the data
      they separate.
    </p>
    ${themeCompare(
      `<div class="sk-table" style="inline-size:100%">
        <table>
          <thead><tr><th scope="col">Task</th><th scope="col">Owner</th><th scope="col">Due</th></tr></thead>
          <tbody>
            <tr><th scope="row">@</th><td>A</td><td>3600</td></tr>
            <tr><th scope="row">Pricing table</th><td>Andre Kim</td><td>13 Aug</td></tr>
            <tr><th scope="row">api</th><td>A</td><td>300</td></tr>
          </tbody>
        </table>
      </div>`,
      'The row rules recede in both themes rather than competing with the content.'
    )}`
  );

  p.section(
    'Saturated colour steps up',
    `<p class="docs-para">
      <code class="sk-code">cobalt-600</code> is a confident blue on white and a muddy near-black on
      <code class="sk-code">neutral-950</code>. Every brand and status fill moves <strong>up</strong>
      the ramp in dark mode — 600 → 400 — which means the text on top must flip from white to
      near-black. That is why <code class="sk-code">--sk-color-action-primary-text</code> is a token
      rather than a constant.
    </p>
    ${themeCompare(
      `<div class="sk-cluster sk-cluster--gap-8">
        <span class="sk-button sk-button--primary" aria-hidden="true">Primary</span>
        <span class="sk-button sk-button--danger" aria-hidden="true">Delete project</span>
        <span class="sk-button sk-button--success" aria-hidden="true">Confirm</span>
      </div>
      <div class="sk-cluster sk-cluster--gap-8">
        <span class="sk-badge sk-badge--success">Verified</span>
        <span class="sk-badge sk-badge--warning">Beta</span>
        <span class="sk-badge sk-badge--danger">Deprecated</span>
      </div>`,
      'Fills step up the ramp on dark, so the labels on them flip from white to near-black.'
    )}
    ${callout(
      'warning',
      'Tinted surfaces are the hardest case',
      `<p>The light-mode tint is the <code class="sk-code">50</code> step. The dark-mode equivalent is
      the <code class="sk-code">950</code> step — a deep, saturated, nearly-black version of the hue —
      <strong>not</strong> a darkened <code class="sk-code">50</code>, which reads as muddy grey and
      loses the intent entirely.</p>`
    )}`
  );

  p.section(
    'Selection needs a bar, not just a tint',
    `<p class="docs-para">
      In light mode a <code class="sk-code">cobalt-50</code> tint is plainly visible. In dark mode
      <code class="sk-code">cobalt-950</code> against <code class="sk-code">neutral-950</code> is
      nearly identical in lightness. So in dark mode <strong>the bar is the signal and the tint is
      decoration</strong>. Ship only the tint and dark-mode users see no selection at all.
    </p>
    ${themeCompare(
      `<nav class="docs-navdemo" aria-label="Example navigation">
        <a class="sk-side-nav__item" href="#selection-needs-a-bar-not-just-a-tint"><span class="sk-side-nav__label">Overview</span></a>
        <a class="sk-side-nav__item" href="#selection-needs-a-bar-not-just-a-tint" aria-current="page"><span class="sk-side-nav__label">Projects</span></a>
        <a class="sk-side-nav__item" href="#selection-needs-a-bar-not-just-a-tint"><span class="sk-side-nav__label">Operations</span></a>
      </nav>`,
      'The 3px leading bar is what actually communicates "you are here" on dark.'
    )}`
  );

  p.section(
    'The nine things that break silently',
    `<p class="docs-para">
      These pass a design review — because a review looks at a mockup, not at a browser with a real
      user's settings — and then break in production.
    </p>
    <ol class="docs-numbered">
      ${[
        ['<code class="sk-code">color-scheme</code> not set', 'Scrollbars, native select popups, spellcheck underlines, date pickers and form control internals all stay light. This is what makes a dark mode look retrofitted rather than designed.'],
        ['Theme applied after paint', 'A flash of light theme on every load. The script must be inline in <code class="sk-code">&lt;head&gt;</code> and synchronous, before any stylesheet.'],
        ["Chrome's autofill background", 'A hard-coded pale yellow with no supported override. Paint over it with a large inset box-shadow and set <code class="sk-code">-webkit-text-fill-color</code>.'],
        ['SVG chevrons in data URIs', 'A stroke colour baked into a <code class="sk-code">background-image</code> cannot inherit <code class="sk-code">currentColor</code>. Re-declare it per theme, or the select arrow vanishes.'],
        ["WebKit's search clear button", 'A dark glyph that disappears on a dark field. Suppress <code class="sk-code">::-webkit-search-cancel-button</code> and supply your own.'],
        ['Raster illustrations', 'A flat PNG will be wrong in one theme. Use inline SVG with <code class="sk-code">currentColor</code>, or two files behind a <code class="sk-code">prefers-color-scheme</code> query.'],
        ['Opacity for disabled states', 'Opacity on a dark surface collapses toward the background much faster than on a light one. Use an explicit colour.'],
        ['Scrims too weak', 'A 48% scrim over an already-dark page produces almost no perceived change, so the page does not read as inactive. Dark uses 64%.'],
        ['Syntax highlighting', 'A light-mode highlight palette on a dark background is the classic developer-tool failure. Map highlight roles onto the audited chart palette so they inherit verified contrast.'],
      ]
        .map(
          ([title, body]) =>
            `<li><strong>${title}</strong><p>${body}</p></li>`
        )
        .join('')}
    </ol>`
  );

  p.section(
    'Offering the choice',
    `<p class="docs-para">
      Three options, not two — <strong>System</strong>, Light, Dark, with System as the default. A
      two-state toggle silently overrides the user's OS preference the moment they touch it, and
      they can never get back to "follow the system" without clearing storage.
    </p>
    ${demo(
      `<fieldset class="sk-fieldset">
        <legend class="sk-fieldset__legend">Colour theme</legend>
        <div class="sk-fieldset__body">
          <div class="sk-button-group sk-button-group--segmented" role="radiogroup" aria-label="Colour theme demo">
            <button type="button" class="sk-button-group__segment" role="radio" data-sk-theme-option="system">System</button>
            <button type="button" class="sk-button-group__segment" role="radio" data-sk-theme-option="light">Light</button>
            <button type="button" class="sk-button-group__segment" role="radio" data-sk-theme-option="dark">Dark</button>
          </div>
        </div>
      </fieldset>`,
      `<div class="sk-button-group sk-button-group--segmented" role="radiogroup" aria-label="Colour theme">
  <button type="button" class="sk-button-group__segment" role="radio"
          aria-checked="true" tabindex="0" data-sk-theme-option="system">System</button>
  <button type="button" class="sk-button-group__segment" role="radio"
          aria-checked="false" tabindex="-1" data-sk-theme-option="light">Light</button>
  <button type="button" class="sk-button-group__segment" role="radio"
          aria-checked="false" tabindex="-1" data-sk-theme-option="dark">Dark</button>
</div>`,
      { label: 'This control is live — it changes the whole site' }
    )}
    ${callout(
      'info',
      '',
      `<p>Announce theme changes in a polite live region. The visual change is completely silent to a
      screen reader user, so without an announcement they get no confirmation that anything
      happened.</p>`
    )}`
  );

  p.reference('Dark mode in depth', md('dark-mode'), 'ref-dark-');
  return p;
}

export function typographyPage(): Page {
  const p = new Page({
    file: 'typography.html',
    title: 'Typography',
    eyebrow: 'Foundations',
    lead: 'One sans family, one mono family, and a scale where visual size is decoupled from heading level.',
  });

  p.add(rules('typography'));

  p.section(
    'Families',
    `<div class="docs-twocol">
      <div class="docs-fontcard">
        <p class="docs-fontcard__sample" style="font-family:var(--sk-font-family-sans)">Ag</p>
        <h3>Inter Variable</h3>
        <p class="docs-para">
          The entire interface. Large x-height, unambiguous <code class="sk-code">1 l I</code> and
          <code class="sk-code">0 O</code>, and a variable axis so the whole scale ships in one file.
        </p>
        <p class="docs-mono-sample" style="font-family:var(--sk-font-family-sans)">1lI 0O — Handgloves 0123456789</p>
      </div>
      <div class="docs-fontcard">
        <p class="docs-fontcard__sample" style="font-family:var(--sk-font-family-mono)">Ag</p>
        <h3>JetBrains Mono Variable</h3>
        <p class="docs-para">
          Code, identifiers, hostnames, keys, hashes — anything a user compares character by
          character.
        </p>
        <p class="docs-mono-sample" style="font-family:var(--sk-font-family-mono)">1lI 0O — WEB-114 · 2026-08-21</p>
      </div>
    </div>
    ${callout(
      'info',
      '',
      `<p>Both are open-licensed. Subset and self-host with
      <code class="sk-code">font-display: swap</code> — a third-party font CDN adds a request to the
      critical path and a privacy question you do not need.</p>`
    )}`
  );

  p.section(
    'The scale',
    `<p class="docs-para">
      Nineteen styles. Each is a complete set — size, line height, weight and tracking — because
      those four values are only correct together. Tracking tightens as size grows: large text at
      default tracking looks loose and unresolved.
    </p>
    <div class="docs-specimen">
      ${Object.entries(typeScale)
        .map(([name, s]) => {
          const family = s.fontFamily === 'mono' ? 'mono' : 'sans';
          return `<div class="docs-specimen__row">
            <div class="docs-specimen__meta">
              <code class="docs-specimen__name">${escapeHtml(name)}</code>
              <span class="docs-specimen__values">${escapeHtml(s.fontSize)} · ${escapeHtml(s.lineHeight)} · ${escapeHtml(s.fontWeight)} · ${escapeHtml(s.letterSpacing)}</span>
              <span class="docs-specimen__desc">${escapeHtml(s.description)}</span>
            </div>
            <p class="docs-specimen__sample" style="font-family:var(--sk-font-family-${family});font-size:var(--sk-font-size-${name});line-height:var(--sk-line-height-${name});font-weight:var(--sk-font-weight-${name});letter-spacing:var(--sk-letter-spacing-${name});${s.textTransform ? `text-transform:${s.textTransform};` : ''}">
              The quick brown fox
            </p>
          </div>`;
        })
        .join('')}
    </div>`
  );

  p.section(
    'Heading level is not font size',
    `<p class="docs-para">
      <code class="sk-code">&lt;h2&gt;</code> means "second-level section of this document". It does
      not mean 30px. A dialog title, a card title and a section heading may all be
      <code class="sk-code">heading-md</code> visually while occupying entirely different levels in
      three different outlines.
    </p>
    <p class="docs-para">
      Choose the heading <strong>level</strong> from the document structure — so the outline is
      correct for screen reader users navigating by heading — and the <strong>style</strong> from the
      visual hierarchy. Sekura's reset deliberately strips default heading sizes to force this choice
      to be explicit.
    </p>
    ${doDont(
      [
        'Pick the level from structure, the style from hierarchy.',
        'Keep one <code class="sk-code">&lt;h1&gt;</code> per page.',
        'Use <code class="sk-code">tabular-nums</code> for anything compared or updating.',
        'Cap body text at about 68 characters.',
      ],
      [
        'Never skip a heading level to get a smaller size.',
        'Never set <code class="sk-code">user-scalable=no</code> — it fails WCAG 1.4.4 outright.',
        'Never set content text below 13px.',
        'Never rely on a fixed height for text-bearing elements; users can override spacing.',
      ]
    )}`
  );

  p.reference('Typography in depth', md('typography'), 'ref-type-');
  return p;
}

export function spacingPage(): Page {
  const p = new Page({
    file: 'spacing.html',
    title: 'Spacing & density',
    eyebrow: 'Foundations',
    lead: 'A 4px grid with pixel-named tokens, applied through gap rather than margins.',
  });

  p.add(rules('spacing'));

  p.section(
    'The scale',
    `<p class="docs-para">
      4px base. Token names are the pixel value at a 16px root, so
      <code class="sk-code">--sk-space-12</code> is unambiguously 12px and needs no mental arithmetic
      from a t-shirt size. Values are emitted in <code class="sk-code">rem</code> so they scale with
      the user's root font size.
    </p>
    <div class="docs-scale">
      ${Object.entries(scales.space)
        .map(
          ([name, value]) => `<div class="docs-scale__row">
            <code class="docs-scale__name">space-${escapeHtml(name)}</code>
            <span class="docs-scale__bar" style="inline-size:var(--sk-space-${name})"></span>
            <span class="docs-scale__value">${escapeHtml(value)}</span>
          </div>`
        )
        .join('')}
    </div>`
  );

  p.section(
    'gap, not margin',
    `<p class="docs-para">
      Spacing between siblings belongs to the parent, not to the children.
      <code class="sk-code">gap</code> does not collapse, needs no
      <code class="sk-code">:last-child</code> exceptions, and works identically in flex and grid —
      so a component can be moved between containers without carrying spacing assumptions with it.
    </p>
    ${demo('', `/* Yes */
.sk-stack { display: flex; flex-direction: column; gap: var(--sk-space-16); }
.sk-stack > * { margin-block: 0; }

/* No */
.card + .card { margin-top: 16px; }`, { lang: 'css' })}
    ${callout(
      'warning',
      'Proximity carries meaning',
      `<p>The gap between a label and its input must be visibly smaller than the gap between one field
      and the next, or the label appears to belong to the field above it. This is not a stylistic
      preference — mis-grouped labels are a real usability failure, and one that survives review
      because everyone reading the form already knows what it says.</p>`
    )}`
  );

  p.section(
    'Radius and borders',
    `<div class="docs-twocol">
      <div>
        <h3>Radius</h3>
        <div class="docs-radiusgrid">
          ${Object.entries(scales.radius)
            .map(
              ([name, value]) => `<div class="docs-radiusgrid__item">
                <span class="docs-radiusgrid__box" style="border-radius:var(--sk-radius-${name})"></span>
                <code>${escapeHtml(name)}</code>
                <span class="docs-muted">${escapeHtml(value)}</span>
              </div>`
            )
            .join('')}
        </div>
      </div>
      <div>
        <h3>Border width</h3>
        <div class="docs-scale">
          ${Object.entries(scales.borderWidth)
            .map(
              ([name, value]) => `<div class="docs-scale__row">
                <code class="docs-scale__name">${escapeHtml(name)}</code>
                <span class="docs-borderdemo" style="border-block-start-width:var(--sk-border-width-${name})"></span>
                <span class="docs-scale__value">${escapeHtml(value)}</span>
              </div>`
            )
            .join('')}
        </div>
      </div>
    </div>`
  );

  p.section(
    'Density',
    `<p class="docs-para">
      Three modes changing control padding and row height only. Density never reduces text below
      <code class="sk-code">body-sm</code> (14px) or a hit target below 24×24 CSS px — where padding
      is trimmed, an <code class="sk-code">::after</code> pseudo-element restores the target area, so
      the control looks dense and still behaves correctly.
    </p>
    ${demo(
      `<div class="docs-densitydemo">
        ${Object.keys(densities)
          .map(
            (name) => `<div class="docs-densitydemo__pane" data-sk-density="${name}">
              <p class="docs-densitydemo__label">${escapeHtml(name)}</p>
              <div class="sk-cluster sk-cluster--gap-8">
                <button type="button" class="sk-button sk-button--primary sk-button--sm">Save</button>
                <button type="button" class="sk-button sk-button--secondary sk-button--sm">Cancel</button>
              </div>
              <div class="sk-field">
                <label class="sk-field__label" for="dd-${name}">Hostname</label>
                <input class="sk-input" id="dd-${name}" type="text" value="website-redesign" readonly />
              </div>
            </div>`
          )
          .join('')}
      </div>`,
      `<html data-sk-density="compact">`,
      { label: 'One attribute on the root switches all three' }
    )}
    ${callout(
      'warning',
      '',
      `<p>Dense mode is for data grids and log views only. It must always offer a way back to
      comfortable, and must never be the default for a first-time user — it is far easier to recover
      from "this feels roomy" than from "I cannot hit the button".</p>`
    )}`
  );

  p.reference('Spacing in depth', md('spacing'), 'ref-space-');
  p.reference('Density in depth', md('density'), 'ref-density-');
  return p;
}

export function layoutPage(): Page {
  const p = new Page({
    file: 'layout.html',
    title: 'Layout & responsive',
    eyebrow: 'Foundations',
    lead:
      'Flex-first composition. Most Sekura layouts respond to their container and need no media ' +
      'query at all.',
  });

  p.add(rules('responsive-layout'));

  p.section(
    'Why flex first',
    `<p class="docs-para">
      A breakpoint asks "how wide is the <em>viewport</em>?" — which is the wrong question. A card
      does not care about the viewport; it cares about the column it is sitting in. The same card in
      a sidebar and in a full-width region needs different layouts at the same viewport width.
    </p>
    <p class="docs-para">
      Flex answers the right question implicitly. A wrapping flex row reflows when <em>its
      container</em> runs out of room, wherever that container happens to be. So most Sekura layouts
      contain no media query, and the ones that do are shell-level decisions rather than content
      decisions.
    </p>`
  );

  p.section(
    'The four habits',
    `<h3 id="habit-wrap">1. Wrap by default</h3>
    <p class="docs-para">
      A toolbar that wraps to two lines at 360px is working. A toolbar that produces a horizontal
      scrollbar is broken. Drag the handle to resize the container:
    </p>
    ${demo(
      `<div class="docs-resize" style="inline-size:100%">
        <div class="sk-cluster sk-cluster--gap-8">
          <button type="button" class="sk-button sk-button--secondary sk-button--sm">Filter</button>
          <button type="button" class="sk-button sk-button--secondary sk-button--sm">Sort</button>
          <span class="sk-badge sk-badge--neutral">Environment: Production</span>
          <span class="sk-badge sk-badge--neutral">Status: Applied</span>
          <button type="button" class="sk-button sk-button--primary sk-button--sm">Create project</button>
        </div>
      </div>`,
      `.sk-cluster {
  display: flex;
  flex-wrap: wrap;   /* not optional */
  gap: var(--sk-space-8);
}`,
      { lang: 'css', label: 'Resizable — drag the bottom-right corner' }
    )}

    <h3 id="habit-explicit">2. Declare flex explicitly</h3>
    <p class="docs-para">
      Saying what each child does — shrink, grow, or neither — makes the layout's behaviour under
      pressure predictable instead of emergent.
    </p>
    ${demo('', `.sk-cluster > *   { flex: 0 1 auto; min-inline-size: 0; }
.sk-cluster__grow { flex: 1 1 auto; min-inline-size: 0; }
.sk-button__icon  { flex: 0 0 auto; }`, { lang: 'css' })}

    <h3 id="habit-min-size">3. min-inline-size: 0</h3>
    ${callout(
      'danger',
      'The most important line in the system',
      `<p>A flex item's default is <code class="sk-code">min-width: auto</code>, which means it
      <strong>will not shrink below its content's intrinsic size</strong>. A long unbroken hostname, a
      wide table, or a <code class="sk-code">nowrap</code> label will push its flex parent wider than
      the container — and the whole page scrolls sideways.</p>
      <p>Text truncation also fails silently without it: <code class="sk-code">text-overflow:
      ellipsis</code> needs the element to actually be narrower than its content, and
      <code class="sk-code">min-width: auto</code> guarantees it never is.</p>`
    )}
    ${demo(
      `<div class="docs-minsize">
        <div class="docs-minsize__case">
          <p class="docs-minsize__label">${icon('error', 14)} Without <code>min-inline-size: 0</code></p>
          <div class="docs-minsize__row docs-minsize__row--broken" data-sk-overflow-demo>
            <span class="docs-minsize__icon">${icon('globe', 16)}</span>
            <span class="docs-minsize__text">a-very-long-project-name-that-will-not-shrink</span>
            <span class="sk-badge sk-badge--neutral">Applied</span>
          </div>
          <p class="docs-minsize__note">Overflows its container.</p>
        </div>
        <div class="docs-minsize__case">
          <p class="docs-minsize__label">${icon('check-circle', 14)} With it</p>
          <div class="docs-minsize__row docs-minsize__row--fixed">
            <span class="docs-minsize__icon">${icon('globe', 16)}</span>
            <span class="docs-minsize__text sk-truncate">a-very-long-project-name-that-will-not-shrink</span>
            <span class="sk-badge sk-badge--neutral">Applied</span>
          </div>
          <p class="docs-minsize__note">Truncates, and the badge stays put.</p>
        </div>
      </div>`,
      `.row       { display: flex; gap: var(--sk-space-8); }
.row__icon { flex: 0 0 auto; }
.row__text { flex: 1 1 auto; min-inline-size: 0;   /* <- this */
             overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`,
      { lang: 'css' }
    )}

    <h3 id="habit-basis">4. flex-basis, not width</h3>
    <p class="docs-para">
      <code class="sk-code">flex-basis</code> states an <em>ideal</em> width the layout may depart
      from. <code class="sk-code">width</code> states a demand.
    </p>
    ${demo('', `.sk-side-nav { flex: 0 0 16rem; }                          /* ideal 16rem, never grows */
.sk-search   { flex: 1 1 20rem; max-inline-size: 32rem; }  /* wants 20rem, takes more */`, { lang: 'css' })}`
  );

  p.section(
    'A two-column layout with no breakpoint',
    `<p class="docs-para">
      The sidebar wants 18rem. The content refuses to go below 60% of the row. When both cannot be
      satisfied, the flex container wraps them onto separate rows. That is the entire responsive
      mechanism — and it triggers on <strong>container</strong> width, which is what you actually
      wanted.
    </p>
    ${demo(
      `<div class="docs-resize" style="inline-size:100%">
        <div class="sk-sidebar-layout">
          <aside class="sk-sidebar-layout__sidebar docs-boxdemo docs-boxdemo--alt">Sidebar<br /><code>flex: 1 1 18rem</code></aside>
          <div class="sk-sidebar-layout__content docs-boxdemo">Content<br /><code>flex: 999 1 60%</code></div>
        </div>
      </div>`,
      `.sk-sidebar-layout {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sk-space-24);
}
.sk-sidebar-layout__sidebar { flex: 1 1 18rem;  min-inline-size: 0; }
.sk-sidebar-layout__content { flex: 999 1 60%;  min-inline-size: 0; }`,
      { lang: 'css', label: 'Resize me — no media query involved' }
    )}`
  );

  p.section(
    'When to use grid',
    `<p class="docs-para">
      Grid earns its place for genuine two-dimensional alignment: card grids, dashboard tiles,
      aligned form columns. Use <code class="sk-code">auto-fit</code> with a
      <code class="sk-code">min()</code> guard so it still needs no breakpoints.
    </p>
    ${demo(
      `<div class="docs-resize" style="inline-size:100%">
        <div class="sk-grid sk-grid--min-12">
          ${[1, 2, 3, 4]
            .map((n) => `<div class="docs-boxdemo">Item ${n}</div>`)
            .join('')}
        </div>
      </div>`,
      `grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));`,
      { lang: 'css' }
    )}
    ${callout(
      'warning',
      '',
      `<p>The <code class="sk-code">min(18rem, 100%)</code> is essential. Without it, a container
      narrower than 18rem overflows instead of collapsing to a single column.</p>
      <p>Never use <code class="sk-code">grid-auto-flow: dense</code> — it reorders items visually
      while leaving DOM order alone, desynchronising focus order from visual order. That is a
      documented WCAG 2.4.3 failure.</p>`
    )}`
  );

  p.section(
    'Breakpoints',
    `<div class="sk-table" role="region" aria-label="Breakpoints" tabindex="0">
      <table>
        <thead><tr><th scope="col">Name</th><th scope="col">Min width</th><th scope="col">Columns</th><th scope="col">Purpose</th></tr></thead>
        <tbody>${Object.entries(breakpoints)
          .map(
            ([name, b]) => `<tr>
              <th scope="row"><code class="sk-code">${escapeHtml(name)}</code></th>
              <td>${escapeHtml(b.min)} <span class="docs-muted">/ ${b.px}px</span></td>
              <td class="sk-table__cell--numeric">${b.columns}</td>
              <td>${escapeHtml(b.description)}</td>
            </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
    <p class="docs-para">
      In practice <code class="sk-code">lg</code> is the only breakpoint most features need, because
      it marks the one genuine layout change: the navigation rail stops being a drawer.
    </p>`
  );

  p.reference('Layout in depth', md('responsive-layout'), 'ref-layout-');
  return p;
}

export function elevationPage(): Page {
  const p = new Page({
    file: 'elevation.html',
    title: 'Elevation & motion',
    eyebrow: 'Foundations',
    lead: 'Six elevation levels, six durations, and one rule: nothing the user initiated takes longer than 200ms.',
  });

  p.add(rules('elevation'));

  p.section(
    'Elevation',
    `<p class="docs-para">
      Elevation is <strong>two tokens, not one</strong>. Every elevated component pairs a shadow with
      a surface, because in light mode the shadow does the work and in dark mode the surface
      lightness does. Drop either and the component is wrong in one of the two themes.
    </p>
    ${themeCompare(
      `<div class="docs-elevgrid">
        ${Object.entries(elevation)
          .map(
            ([level, spec]) => `<div class="docs-elevgrid__tile" style="box-shadow:var(--sk-elevation-${level});background:var(--sk-color-${spec.surface})">
              <span class="docs-elevgrid__level">${escapeHtml(level)}</span>
              <span class="docs-elevgrid__surface">${escapeHtml(spec.surface)}</span>
            </div>`
          )
          .join('')}
      </div>`,
      'In dark mode the shadows contribute almost nothing — the surfaces are doing the work.'
    )}
    <div class="sk-table" role="region" aria-label="Elevation levels" tabindex="0">
      <table>
        <thead><tr><th scope="col">Level</th><th scope="col">Paired surface</th><th scope="col">Use</th></tr></thead>
        <tbody>${Object.entries(elevation)
          .map(
            ([level, spec]) => `<tr>
              <th scope="row"><code class="sk-code">--sk-elevation-${escapeHtml(level)}</code></th>
              <td><code class="sk-code">${escapeHtml(spec.surface)}</code></td>
              <td>${escapeHtml(spec.usage)}</td>
            </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
    ${callout(
      'info',
      '',
      `<p>Shadows are never brand-coloured. A coloured shadow reads as a glow, and a glow reads as a
      <em>state</em> — focus, selection, error — rather than as depth.</p>`
    )}`
  );

  p.section(
    'Motion',
    `<p class="docs-para">
      The ceiling for anything the user initiated is <code class="sk-code">normal</code> (200ms). A
      400ms button state makes the whole product feel sluggish, and the perception compounds — users
      do not attribute it to the animation, they attribute it to the application being slow.
    </p>
    ${demo(
      `<div class="docs-motion">
        ${Object.entries(scales.duration)
          .map(
            ([name, value]) => `<div class="docs-motion__row">
              <code class="docs-motion__name">${escapeHtml(name)}</code>
              <span class="docs-motion__value">${escapeHtml(value)}</span>
              <span class="docs-motion__track"><span class="docs-motion__dot" style="transition-duration:var(--sk-duration-${name})"></span></span>
              <span class="docs-motion__use">${escapeHtml(motionUsage[name] ?? '')}</span>
            </div>`
          )
          .join('')}
        <button type="button" class="sk-button sk-button--secondary sk-button--sm" data-sk-motion-play>
          ${icon('refresh', 14, 'sk-button__icon')}
          <span class="sk-button__label">Play</span>
        </button>
      </div>`,
      undefined,
      { label: 'Compare the durations' }
    )}
    <h3 id="easing">Easing</h3>
    <div class="sk-table" role="region" aria-label="Easing curves" tabindex="0">
      <table>
        <thead><tr><th scope="col">Token</th><th scope="col">Curve</th><th scope="col">Use</th></tr></thead>
        <tbody>
          ${[
            ['standard', 'Most transitions.'],
            ['entrance', 'Elements arriving. Decelerates into place.'],
            ['exit', 'Elements leaving. Accelerates away, and faster than the entrance — nobody wants to watch something leave.'],
            ['emphasised', 'Slight overshoot, for toggles and switches where a little physical feedback helps.'],
            ['linear', 'Progress and spinners only.'],
          ]
            .map(
              ([name, use]) => `<tr>
                <th scope="row"><code class="sk-code">${escapeHtml(name!)}</code></th>
                <td><code>${escapeHtml(scales.easing[name!] ?? '')}</code></td>
                <td>${escapeHtml(use!)}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
    ${callout(
      'warning',
      'Reduced motion is a medical setting, not a preference',
      `<p><code class="sk-code">prefers-reduced-motion: reduce</code> zeroes every duration token
      globally. Two deliberate exceptions: <strong>spinners</strong> slow to 2s rather than stopping,
      because a frozen spinner communicates nothing and is the only signal that work is happening;
      and <strong>progress bars</strong> keep their fill transition, because the movement <em>is</em>
      the information.</p>`
    )}
    ${doDont(
      [
        'Animate <code class="sk-code">opacity</code>, <code class="sk-code">transform</code>, <code class="sk-code">translate</code>, <code class="sk-code">scale</code> — these are composited.',
        'Make exits faster than entrances.',
        'Pair every animation with a non-motion signal.',
      ],
      [
        'Never animate <code class="sk-code">width</code>, <code class="sk-code">height</code>, <code class="sk-code">top</code>, <code class="sk-code">margin</code> — they force layout every frame.',
        'Never exceed 200ms for a user-initiated change.',
        'Never make motion the only way something is communicated.',
      ]
    )}`
  );

  p.reference('Elevation in depth', md('elevation'), 'ref-elev-');
  p.reference('Motion in depth', md('motion'), 'ref-motion-');
  return p;
}

export function iconographyPage(iconNames: string[]): Page {
  const p = new Page({
    file: 'iconography.html',
    title: 'Iconography',
    eyebrow: 'Foundations',
    lead: 'A 24px grid, 1.75px strokes, currentColor throughout — and never the only label.',
  });

  p.add(rules('iconography'));

  p.section(
    'The set',
    `<p class="docs-para">
      ${iconNames.length} icons, drawn on a 24px grid with 1.75px strokes and round caps. Every one
      inherits <code class="sk-code">currentColor</code>, which is why they are automatically correct
      in every theme, variant and state.
    </p>
    <div class="docs-icongrid">
      ${iconNames
        .map(
          (name) => `<div class="docs-icongrid__item">
            <span class="docs-icongrid__glyph">${icon(name, 24)}</span>
            <code class="docs-icongrid__name">${escapeHtml(name)}</code>
          </div>`
        )
        .join('')}
    </div>`
  );

  p.section(
    'Colour',
    `${callout(
      'danger',
      'The exception that catches people out',
      `<p>An SVG embedded as a <code class="sk-code">background-image</code> data URI
      <strong>cannot</strong> inherit <code class="sk-code">currentColor</code>. The select chevron is
      the common case: a stroke colour baked into the data URI becomes invisible on a dark field, so
      it must be re-declared per theme.</p>`
    )}
    ${demo('', `/* The chevron is baked into a data URI and cannot inherit currentColor,
   so each dark theme re-declares it. Skipping this is the classic
   invisible-chevron bug. */
[data-sk-theme="dark"] .sk-select,
[data-sk-theme="hc-dark"] .sk-select {
  color-scheme: dark;
  background-image: url("data:image/svg+xml,…stroke='%238590a3'…");
}`, { lang: 'css' })}`
  );

  p.section(
    'Status icons are distinguishable by shape',
    `<p class="docs-para">
      Not only by hue — so they work for the roughly one in twelve men with some form of colour
      vision deficiency, and for everyone in bright sunlight.
    </p>
    ${demo(
      `<div class="sk-cluster sk-cluster--gap-24">
        <span class="sk-status sk-status--success"><span class="sk-status__dot" aria-hidden="true"></span><span class="sk-status__label">Applied</span></span>
        <span class="sk-status sk-status--warning"><span class="sk-status__dot" aria-hidden="true"></span><span class="sk-status__label">Degraded</span></span>
        <span class="sk-status sk-status--danger"><span class="sk-status__dot" aria-hidden="true"></span><span class="sk-status__label">Failed</span></span>
        <span class="sk-status sk-status--pending"><span class="sk-status__dot" aria-hidden="true"></span><span class="sk-status__label">Pending</span></span>
        <span class="sk-status sk-status--neutral"><span class="sk-status__dot" aria-hidden="true"></span><span class="sk-status__label">Draft</span></span>
      </div>`,
      undefined,
      { label: 'Pending is a ring, not a filled dot' }
    )}`
  );

  p.reference('Iconography in depth', md('iconography'), 'ref-icon-');
  return p;
}

export function datavizPage(): Page {
  const p = new Page({
    file: 'dataviz.html',
    title: 'Data visualisation',
    eyebrow: 'Foundations',
    lead: 'Eight colourblind-safe categorical series, audited per theme, never relying on colour alone.',
  });

  p.add(rules('data-visualisation'));

  p.section(
    'The categorical palette',
    `<p class="docs-para">
      Ordered so the first four stay distinguishable under deuteranopia and protanopia — the two most
      common forms of colour vision deficiency. Series step lighter in dark themes and each one is
      audited at 3:1 against the plot background.
    </p>
    ${themeCompare(
      `<div class="docs-chartswatches">
        ${[1, 2, 3, 4, 5, 6, 7, 8]
          .map(
            (n) => `<div class="docs-chartswatches__item">
              <span class="docs-chartswatches__chip" style="background:var(--sk-color-chart-${n})"></span>
              <code>chart-${n}</code>
            </div>`
          )
          .join('')}
      </div>
      <div class="demo-chart" role="img" aria-label="Example bar chart using the first four series">
        ${[62, 78, 45, 90, 55, 71, 84]
          .map(
            (h, i) =>
              `<span class="demo-chart__bar"><span class="demo-chart__fill" style="block-size:${h}%;background:var(--sk-color-chart-${(i % 4) + 1})"></span><span class="demo-chart__label">${i + 1}</span></span>`
          )
          .join('')}
      </div>`,
      'The plot background stays <code class="sk-code">surface-base</code> — a chart on a lighter panel in dark mode makes the series read as washed out.'
    )}
    ${callout(
      'warning',
      '',
      `<p>Maximum eight series. A ninth colour does not add a ninth readable series; it makes all nine
      harder to tell apart. Group the tail into "Other".</p>`
    )}`
  );

  p.section(
    'Beyond colour',
    doDont(
      [
        'Vary dash pattern and marker shape on line charts.',
        'Direct-label bars where possible, so no legend lookup is needed.',
        'Give every chart a text alternative — a data table is the strongest one.',
        'Start bar chart axes at zero, always.',
      ],
      [
        'Never ship a chart whose only alt text is "chart".',
        'Never truncate a bar chart axis — it exaggerates differences, which is a correctness issue.',
        'Never make a tooltip the only way to read a value; hover-only data is invisible to keyboard users.',
        'Never rely on a sequential ramp alone in a heatmap without value labels.',
      ]
    )
  );

  p.reference('Data visualisation in depth', md('data-visualisation'), 'ref-viz-');
  return p;
}

export function accessibilityPage(): Page {
  const p = new Page({
    file: 'accessibility.html',
    title: 'Accessibility',
    eyebrow: 'Foundations',
    lead: 'WCAG 2.2 Level AA as a component contract, not a phase before release.',
  });

  p.add(rules('accessibility'));

  const rows = auditThemes();
  const failures = rows.filter((r) => !r.pass);

  p.section(
    'What is verified automatically',
    `<div class="docs-verify">
      <div class="docs-verify__item docs-verify__item--pass">
        <span class="docs-verify__num">${rows.length}</span>
        <span class="docs-verify__label">contrast checks</span>
        <span class="docs-verify__note">${contrastRequirements.length} declared pairings × ${THEMES.length} themes, on every build</span>
      </div>
      <div class="docs-verify__item docs-verify__item--pass">
        <span class="docs-verify__num">${failures.length}</span>
        <span class="docs-verify__label">failing</span>
        <span class="docs-verify__note">The audit is a build gate, not a report</span>
      </div>
      <div class="docs-verify__item">
        <span class="docs-verify__num">${components.length}</span>
        <span class="docs-verify__label">component contracts</span>
        <span class="docs-verify__note">Each documents role, keyboard model, ARIA and target size</span>
      </div>
    </div>
    ${callout(
      'warning',
      'Automated checks catch about a third of real barriers',
      `<p>The rest needs a keyboard and a screen reader. Contrast and markup linting are necessary,
      not sufficient — a page can pass every automated check and still be unusable.</p>`
    )}`
  );

  p.section(
    "WCAG 2.2's newer criteria",
    `<p class="docs-para">
      The 2.2 additions are the ones most component libraries have not caught up with. Sekura handles
      each of them systemically rather than per component:
    </p>
    <div class="sk-table" role="region" aria-label="WCAG 2.2 criteria" tabindex="0">
      <table>
        <thead><tr><th scope="col">Criterion</th><th scope="col">How it is satisfied</th></tr></thead>
        <tbody>
          ${[
            ['2.4.11 Focus Not Obscured', 'A focused element must not sit behind a sticky header. Handled with <code class="sk-code">scroll-margin-block-start</code> set globally in the reset, not per component.'],
            ['2.4.13 Focus Appearance', 'One ring everywhere: 2px with a 2px offset, held to 3:1 against the adjacent surface.'],
            ['2.5.7 Dragging Movements', 'Anything achievable by dragging has a single-pointer alternative. File upload has a button; reorderable lists get move controls.'],
            ['2.5.8 Target Size (Minimum)', '24×24 CSS px, enforced by an <code class="sk-code">::after</code> hit area so a visually small control still has a usable target.'],
            ['3.2.6 Consistent Help', 'Help lives in the same place on every page.'],
            ['3.3.7 Redundant Entry', 'Never ask for the same information twice in one flow.'],
            ['3.3.8 Accessible Authentication', 'Paste is never blocked on password fields — it breaks password managers and is a security anti-pattern as well.'],
          ]
            .map(([c, how]) => `<tr><th scope="row">${c}</th><td>${how}</td></tr>`)
            .join('')}
        </tbody>
      </table>
    </div>`
  );

  p.section(
    'The focus ring',
    `<p class="docs-para">
      One treatment, everywhere. ${focusRing.width} solid, offset by ${focusRing.offset}, so it never
      merges into the control it surrounds. Components may refine the offset; none may remove it.
    </p>
    ${demo(
      `<div class="sk-cluster sk-cluster--gap-16">
        <button type="button" class="sk-button sk-button--primary">Tab to me</button>
        <button type="button" class="sk-button sk-button--secondary">And me</button>
        <input class="sk-input" style="max-inline-size:14rem" type="text" aria-label="Focus ring demo" value="And me" />
        <label class="sk-checkbox">
          <input type="checkbox" class="sk-checkbox__input" />
          <span class="sk-checkbox__box" aria-hidden="true"></span>
          <span class="sk-checkbox__content"><span class="sk-checkbox__label">And me</span></span>
        </label>
      </div>`,
      `:focus-visible {
  outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
  outline-offset: var(--sk-focus-ring-offset);
}`,
      { lang: 'css', label: 'Use Tab — the ring only shows for keyboard focus' }
    )}`
  );

  p.section(
    'Live regions',
    `<div class="sk-table" role="region" aria-label="Live region politeness" tabindex="0">
      <table>
        <thead><tr><th scope="col">Role</th><th scope="col">Behaviour</th><th scope="col">Use for</th></tr></thead>
        <tbody>
          <tr><th scope="row"><code class="sk-code">role="status"</code></th><td>Announced at the next natural pause</td><td>Confirmations, result counts, loading completion. <strong>The default.</strong></td></tr>
          <tr><th scope="row"><code class="sk-code">role="alert"</code></th><td>Interrupts immediately</td><td>Genuine failures only. Overusing it makes a product hostile with a screen reader.</td></tr>
        </tbody>
      </table>
    </div>
    ${callout(
      'danger',
      'The most common live-region bug',
      `<p>The container must exist in the DOM <strong>before</strong> the message is inserted. Adding
      the region and its content in the same tick announces nothing at all.</p>`
    )}`
  );

  p.reference('Accessibility in depth', md('accessibility'), 'ref-a11y-');
  return p;
}

export function foundationPage(id: string, file: string, title: string): Page {
  const f = getFoundation(id)!;
  const p = new Page({ file, title, eyebrow: 'Foundations', lead: f.summary });
  p.add(rules(id));
  p.markdown(f.body);
  return p;
}

/* ================================================================== *
 * Reference
 * ================================================================== */

export function tokensPage(): Page {
  const p = new Page({
    file: 'tokens.html',
    title: 'All tokens',
    eyebrow: 'Reference',
    lead: `Every one of the ${semanticTokens.length} semantic tokens, with the value it resolves to in each of the four themes.`,
  });

  p.add(
    `<div class="docs-tokenfilter">
      <label class="sk-visually-hidden" for="token-search">Filter tokens</label>
      <div class="sk-search">
        ${icon('search', 16, 'sk-search__icon')}
        <input class="sk-search__input" id="token-search" type="search" autocomplete="off"
               placeholder="Filter by name or role" data-sk-token-filter />
      </div>
      <p class="docs-muted" role="status" data-sk-token-count>${semanticTokens.length} tokens</p>
    </div>`
  );

  for (const g of tokenGroups()) {
    p.section(
      g,
      `<p class="docs-para docs-para--tight">${semanticTokens.filter((t) => t.group === g).length} tokens</p>
      ${renderSemanticGroup(g)}`,
      `group-${g}`
    );
  }

  p.section(
    'Dimensional scales',
    Object.entries(scales)
      .map(([name, scale]) => {
        const prefix =
          name === 'zIndex' ? 'z' : name.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `<h3 id="scale-${name}">${escapeHtml(name)}</h3>
        <div class="sk-table" role="region" aria-label="${escapeHtml(name)} scale" tabindex="0">
          <table>
            <thead><tr><th scope="col">Token</th><th scope="col">Value</th></tr></thead>
            <tbody>${Object.entries(scale)
              .map(
                ([k, v]) =>
                  `<tr><th scope="row"><code class="sk-code">--sk-${prefix}-${escapeHtml(k)}</code></th><td><code>${escapeHtml(String(v))}</code></td></tr>`
              )
              .join('')}</tbody>
          </table>
        </div>`;
      })
      .join(''),
    'scales'
  );

  return p;
}

export function componentsIndexPage(): Page {
  const p = new Page({
    file: 'components.html',
    title: 'Components',
    eyebrow: 'Reference',
    lead: `${components.length} components. Every one documents its anatomy, variants, states, dark-mode behaviour, and a complete keyboard and ARIA contract.`,
  });

  for (const cat of componentCategories) {
    const inCat = components.filter((c) => c.category === cat);
    p.section(
      `${cat} (${inCat.length})`,
      `<p class="docs-para">${escapeHtml(categoryDescriptions[cat])}</p>
      <div class="docs-cardgrid docs-cardgrid--compact">
        ${inCat
          .map(
            (c) => `<a class="docs-card" href="component-${c.id}.html">
              <span class="docs-card__title">
                ${escapeHtml(c.name)}
                ${c.status !== 'stable' ? `<span class="sk-badge sk-badge--warning sk-badge--sm">${c.status}</span>` : ''}
              </span>
              <span class="docs-card__body">${escapeHtml(c.summary.split('. ')[0]!)}.</span>
              <code class="docs-card__id">.sk-${escapeHtml(c.id)}</code>
            </a>`
          )
          .join('')}
      </div>`,
      slugify(cat)
    );
  }

  return p;
}

export function componentPage(id: string): Page {
  const c = components.find((x) => x.id === id)!;
  const p = new Page({
    file: `component-${c.id}.html`,
    title: c.name,
    eyebrow: `Components · ${c.category}`,
    lead: escapeHtml(c.summary),
    // Not itself in the navigation, so the index stays highlighted.
    navFile: 'components.html',
  });

  p.add(
    `<div class="docs-chiprow">
      <span class="sk-badge sk-badge--${c.status === 'stable' ? 'success' : 'warning'}">${c.status}</span>
      <code class="sk-code">.sk-${escapeHtml(c.id)}</code>
    </div>`
  );

  p.section(
    'Usage',
    `<div class="docs-twocol">
      <div class="docs-usebox docs-usebox--yes">
        <h3>${icon('check-circle', 16)} When to use</h3>
        <ul>${c.whenToUse.map((u) => `<li>${escapeHtml(u)}</li>`).join('')}</ul>
      </div>
      <div class="docs-usebox docs-usebox--no">
        <h3>${icon('error', 16)} When not to use</h3>
        <ul>${c.whenNotToUse.map((u) => `<li>${escapeHtml(u)}</li>`).join('')}</ul>
      </div>
    </div>`
  );

  // Some examples are whole-page scaffolds — app shell, skip link, side
  // navigation, page header, command palette. Rendering those live inside a
  // page that already has <main>, an <h1> and a nav would duplicate ids and
  // landmarks, so they are shown as code only.
  const isScaffold =
    /<(html|body|main)\b/i.test(c.html) ||
    /\bid="(main|primary-nav|cp-results|cp-input)"/.test(c.html) ||
    /<h1\b/i.test(c.html) ||
    c.html.includes('<script');
  p.section(
    'Example',
    demo(isScaffold ? '' : c.html, c.html, {
      lang: 'html',
      label: isScaffold ? 'Page-level structure — shown as markup rather than rendered inline' : undefined,
    })
  );

  p.section(
    'Anatomy',
    `<div class="sk-table" role="region" aria-label="Anatomy" tabindex="0">
      <table>
        <thead><tr><th scope="col">Part</th><th scope="col"></th><th scope="col">Description</th></tr></thead>
        <tbody>${c.anatomy
          .map(
            (a) => `<tr>
              <th scope="row">${escapeHtml(a.part)}</th>
              <td>${a.required ? '<span class="sk-badge sk-badge--neutral sk-badge--sm">Required</span>' : '<span class="docs-muted">Optional</span>'}</td>
              <td>${escapeHtml(a.description)}</td>
            </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>`
  );

  p.section(
    'Variants and sizes',
    `<h3 id="variants">Variants</h3>
    <div class="sk-table" role="region" aria-label="Variants" tabindex="0">
      <table>
        <thead><tr><th scope="col">Variant</th><th scope="col">Class</th><th scope="col">Use when</th></tr></thead>
        <tbody>${c.variants
          .map(
            (v) => `<tr>
              <th scope="row">${escapeHtml(v.name)}</th>
              <td><code class="sk-code">${escapeHtml(v.className || '(base)')}</code></td>
              <td>${escapeHtml(v.use)}</td>
            </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
    <h3 id="sizes">Sizes</h3>
    <div class="sk-table" role="region" aria-label="Sizes" tabindex="0">
      <table>
        <thead><tr><th scope="col">Size</th><th scope="col">Class</th><th scope="col">Height</th><th scope="col">Notes</th></tr></thead>
        <tbody>${c.sizes
          .map(
            (s) => `<tr>
              <th scope="row">${escapeHtml(s.name)}</th>
              <td><code class="sk-code">${escapeHtml(s.className || '(default)')}</code></td>
              <td>${escapeHtml(s.height)}</td>
              <td>${escapeHtml(s.description)}</td>
            </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
    <h3 id="states">States</h3>
    <div class="sk-table" role="region" aria-label="States" tabindex="0">
      <table>
        <thead><tr><th scope="col">State</th><th scope="col">Trigger</th><th scope="col">Behaviour</th></tr></thead>
        <tbody>${c.states
          .map(
            (s) => `<tr>
              <th scope="row">${escapeHtml(s.name)}</th>
              <td><code class="sk-code">${escapeHtml(s.trigger)}</code></td>
              <td>${escapeHtml(s.description)}</td>
            </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>`
  );

  p.section(
    'Dark mode',
    `${callout('info', '', `<p>${escapeHtml(c.darkMode)}</p>`)}`
  );

  p.section(
    'Accessibility',
    `<p class="docs-para"><strong>Role.</strong> ${escapeHtml(c.accessibility.role)}</p>
    <h3 id="keyboard">Keyboard</h3>
    <div class="sk-table" role="region" aria-label="Keyboard model" tabindex="0">
      <table>
        <thead><tr><th scope="col">Keys</th><th scope="col">Action</th></tr></thead>
        <tbody>${c.accessibility.keyboard
          .map(
            (k) => `<tr><th scope="row"><kbd class="sk-kbd">${escapeHtml(k.keys)}</kbd></th><td>${escapeHtml(k.action)}</td></tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
    <h3 id="aria">ARIA obligations</h3>
    <ul class="docs-list">${c.accessibility.aria.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
    <h3 id="wcag">WCAG criteria this component is accountable for</h3>
    <ul class="docs-list">${c.accessibility.wcag.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
    <p class="docs-para"><strong>Screen reader.</strong> ${escapeHtml(c.accessibility.screenReader)}</p>
    <p class="docs-para"><strong>Target size.</strong> ${escapeHtml(c.accessibility.targetSize)}</p>`
  );

  p.section(
    'Content',
    `<ul class="docs-list">${c.content.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
  );

  p.section('Guidance', doDont(c.dos.map(escapeHtml), c.donts.map(escapeHtml)));

  p.section(
    'CSS',
    `<p class="docs-para">
      Written against semantic tokens only. Fetch it from the MCP server with
      <code class="sk-code">get_component_code({ id: "${c.id}", framework: "css" })</code>.
    </p>
    ${demo('', c.css, { lang: 'css' })}`
  );

  p.section(
    'Tokens used',
    `<div class="docs-chiprow">${c.tokensUsed
      .map((t) => `<code class="sk-code">--sk-${escapeHtml(t)}</code>`)
      .join('')}</div>`
  );

  if (c.related.length) {
    p.section(
      'Related',
      `<div class="docs-chiprow">${c.related
        .map((r) =>
          components.some((x) => x.id === r)
            ? `<a class="sk-badge sk-badge--brand" href="component-${r}.html">${escapeHtml(r)}</a>`
            : `<span class="sk-badge sk-badge--neutral">${escapeHtml(r)}</span>`
        )
        .join('')}</div>`
    );
  }

  return p;
}

export function patternsPage(): Page {
  const p = new Page({
    file: 'patterns.html',
    title: 'Patterns',
    eyebrow: 'Reference',
    lead: `${patterns.length} recurring UX problems and the Sekura answer to each — including the anti-patterns to avoid.`,
  });

  for (const pat of patterns) {
    p.section(
      pat.name,
      `<p class="docs-lead-sm">${escapeHtml(pat.summary)}</p>
      <h3 id="${pat.id}-problem">The problem</h3>
      <p class="docs-para">${escapeHtml(pat.problem)}</p>
      <h3 id="${pat.id}-solution">The solution</h3>
      <div class="docs-prose">${pat.solution
        .split('\n\n')
        .map((block) =>
          block.trim().startsWith('|')
            ? renderSimpleTable(block)
            : `<p>${inlineLite(block)}</p>`
        )
        .join('')}</div>
      <h3 id="${pat.id}-rules">Rules</h3>
      <ul class="docs-list">${pat.rules.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
      <h3 id="${pat.id}-a11y">Accessibility</h3>
      <ul class="docs-list">${pat.accessibility.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
      ${callout(
        'danger',
        'Anti-patterns',
        `<ul>${pat.antiPatterns.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
      )}
      <p class="docs-para docs-muted">
        Components involved: ${pat.components
          .map((cid) =>
            components.some((x) => x.id === cid)
              ? `<a class="sk-link" href="component-${cid}.html">${escapeHtml(cid)}</a>`
              : escapeHtml(cid)
          )
          .join(', ')}
      </p>`,
      pat.id
    );
  }

  return p;
}

export function recipesPage(): Page {
  const p = new Page({
    file: 'recipes.html',
    title: 'Layout recipes',
    eyebrow: 'Reference',
    lead: `${layouts.length} complete page blueprints: regions, responsive strategy, accessibility obligations and paste-ready markup.`,
  });

  for (const l of layouts) {
    p.section(
      l.name,
      `<p class="docs-lead-sm">${escapeHtml(l.summary)}</p>
      <h3 id="${l.id}-when">When to use</h3>
      <ul class="docs-list">${l.whenToUse.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
      <h3 id="${l.id}-regions">Regions</h3>
      <div class="sk-table" role="region" aria-label="${escapeHtml(l.name)} regions" tabindex="0">
        <table>
          <thead><tr><th scope="col">Region</th><th scope="col">Contains</th><th scope="col">Responsive behaviour</th></tr></thead>
          <tbody>${l.regions
            .map(
              (r) => `<tr>
                <th scope="row">${escapeHtml(r.name)}</th>
                <td>${escapeHtml(r.description)}</td>
                <td>${escapeHtml(r.responsive)}</td>
              </tr>`
            )
            .join('')}</tbody>
        </table>
      </div>
      <h3 id="${l.id}-strategy">Responsive strategy</h3>
      <p class="docs-para">${escapeHtml(l.responsive)}</p>
      <h3 id="${l.id}-a11y">Accessibility</h3>
      <ul class="docs-list">${l.accessibility.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
      ${callout('info', 'Dark mode', `<p>${escapeHtml(l.darkMode)}</p>`)}
      ${demo('', l.html, { lang: 'html', label: 'Markup' })}`,
      l.id
    );
  }

  return p;
}

/* ------------------------------------------------------------------ *
 * Tiny helpers for pattern prose, which is plain text with the odd table
 * ------------------------------------------------------------------ */

function inlineLite(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code class="sk-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function renderSimpleTable(block: string): string {
  const lines = block.trim().split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2) return `<p>${inlineLite(block)}</p>`;
  const cells = (line: string) => line.split('|').slice(1, -1).map((c) => c.trim());
  const header = cells(lines[0]!);
  const rows = lines.slice(2).map(cells);
  return `<div class="sk-table" role="region" tabindex="0" aria-label="Table">
    <table>
      <thead><tr>${header.map((h) => `<th scope="col">${inlineLite(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${inlineLite(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody>
    </table>
  </div>`;
}

/* ================================================================== *
 * Behaviours package
 * ================================================================== */

export function behavioursPage(): Page {
  const p = new Page({
    file: 'behaviours.html',
    title: 'Behaviours package',
    eyebrow: 'Get started',
    lead:
      'Framework-agnostic implementations of every keyboard and ARIA contract in ' +
      'this system. 9.1 KB gzipped, zero dependencies, and the same code runs in ' +
      'React, Vue, Svelte, Angular, Blazor, htmx and plain HTML.',
  });

  p.add(
    `<div class="docs-stats">
      ${[
        ['9.1 KB', 'gzipped'],
        ['0', 'dependencies'],
        ['14', 'controllers'],
        ['63', 'behaviour assertions'],
      ]
        .map(
          ([v, l]) =>
            `<div class="docs-stat"><span class="docs-stat__value">${v}</span><span class="docs-stat__label">${l}</span></div>`
        )
        .join('')}
    </div>`
  );

  p.section(
    'Why this exists',
    `<p class="docs-para">
      Every component page in this documentation states an exact keyboard model —
      which key moves focus where, what Escape does, when focus is restored. A
      specification that states a contract but ships no implementation leaves every
      consumer to build it themselves, and the ARIA 1.2 combobox pattern is not
      something most teams get right from prose.
    </p>
    ${callout(
      'info',
      'Why DOM-based rather than state-based',
      `<p>A "headless" library built on framework state — hooks, composables, stores —
      still needs a separate binding per framework, and every binding is somewhere
      behaviour can diverge. These controllers attach to elements your framework has
      <em>already rendered</em>, so every stack drives identical code covered by
      identical tests.</p>`
    )}
    ${doDont(
      [
        'Let the controller own <code class="sk-code">aria-expanded</code>, focus and dismissal.',
        'Call <code class="sk-code">destroy</code> on unmount — controllers register document-level listeners.',
        'Re-run <code class="sk-code">enhance()</code> after your server swaps markup in.',
      ],
      [
        'Never mirror controller state in framework state; you will fight it and lose at the wrong moment.',
        'Never wrap a surface in a shadow root — theming, positioning and focus all break at the boundary.',
        'Never reimplement the keyboard model "just for this one case".',
      ]
    )}`
  );

  p.section(
    'Three ways to use it',
    `<h3 id="way-markup">1. Markup only — no framework, no build step</h3>
    <p class="docs-para">
      Add <code class="sk-code">data-sk-*</code> attributes and call
      <code class="sk-code">enhance()</code>. That is the entire integration.
    </p>
    ${demo('', `<script src="/sekura.iife.min.js"></script>
<script>Sekura.enhance()</script>

<button data-sk-menu-trigger="row-menu">Actions</button>
<div id="row-menu" class="sk-menu">
  <button role="menuitem">Edit project</button>
  <button role="menuitem">Delete project</button>
</div>`, { lang: 'html' })}
    ${callout(
      'success',
      'enhance() is idempotent',
      `<p>Every wired element is tagged, so calling it again only wires what is new.
      That is deliberate: htmx, Turbo, Blazor Server and Livewire have no component
      lifecycle to hook, and they are precisely the stacks least able to reimplement
      a combobox correctly.</p>`
    )}
    ${demo('', `document.body.addEventListener('htmx:afterSwap', () => Sekura.enhance())
document.addEventListener('turbo:load', () => Sekura.enhance())

// Or let it watch for you — MutationObserver, debounced to a microtask.
Sekura.autoEnhance()`, { lang: 'js' })}

    <h3 id="way-controllers">2. Controllers directly</h3>
    ${demo('', `import { createMenu } from '@sekura/behaviours';

const menu = createMenu(triggerEl, menuEl, {
  onSelect: (item, value) => applyAction(value),
});

menu.openMenu();
menu.closeMenu();
menu.destroy();   // always`, { lang: 'ts' })}

    <h3 id="way-adapters">3. Framework adapters</h3>
    <p class="docs-para">
      All of these are short, which is the point — the hard work is already done.
    </p>
    ${demo('', `// React
useEffect(() => {
  const c = createMenu(trigger.current, menu.current);
  return c.destroy;
}, []);

// Svelte — an action already has the shape a controller returns
function menu(node) {
  const c = createMenu(node, menuEl);
  return { destroy: c.destroy };
}

// Angular — a directive, for the same reason
ngOnInit()    { this.c = createMenu(this.host.nativeElement, menu); }
ngOnDestroy() { this.c?.destroy(); }

// Blazor — no DOM abstraction to fight
await JS.InvokeVoidAsync("Sekura.enhance");`, { lang: 'ts' })}
    <p class="docs-para">
      The MCP server generates these for you:
      <code class="sk-code">get_component_code({ id: "combobox", framework: "vue" })</code>.
    </p>`
  );

  p.section(
    'Controllers',
    `<div class="sk-table" role="region" aria-label="Controllers" tabindex="0">
      <table>
        <thead><tr><th scope="col">Factory</th><th scope="col">What it takes care of</th></tr></thead>
        <tbody>
          ${[
            ['createMenu', 'Real focus movement between items, wrap, Home/End, type-ahead, skipping disabled items, Escape restoring focus to the trigger, Tab closing rather than trapping.'],
            ['createCombobox', 'The ARIA 1.2 pattern: DOM focus <strong>stays in the input</strong> while <code class="sk-code">aria-activedescendant</code> moves. Debounced search, result-count announcement, two-stage Escape.'],
            ['createTabs', 'Roving tabindex so the list is one tab stop, RTL-aware arrows, automatic or manual activation, panel visibility.'],
            ['createSegmented', 'Radiogroup semantics with a roving tabindex.'],
            ['createDisclosure / createAccordion', 'Correct <code class="sk-code">aria-expanded</code>, content removed from the tab order when collapsed, arrow navigation between headers.'],
            ['createDialog', 'Native <code class="sk-code">showModal()</code>, focus to the safe option, focus restore, and a veto hook so a dirty dialog confirms rather than discarding work.'],
            ['createDrawer', 'Switches between modal and inline on a media query — <strong>including the ARIA</strong>, not just the CSS — and sets <code class="sk-code">inert</code> when closed so no invisible tab stops remain.'],
            ['createPopover', 'Anchored positioning with flip, light dismiss, focus restore.'],
            ['createTooltip', 'WCAG 1.4.13: dismissible with Escape, hoverable without vanishing, persistent until focus moves.'],
            ['createSelection', 'Tri-state header checkbox scoped to the <strong>current page</strong>, with announcements.'],
            ['createAsyncSwitch', 'A pending state until the server confirms, rather than claiming a state it has not reached.'],
            ['createToaster', 'Auto-dismiss that pauses on hover and focus, with a manual close always available.'],
            ['createThemeManager', 'Three options with System as the default; high contrast as a separate axis.'],
          ]
            .map(([f, d]) => `<tr><th scope="row"><code class="sk-code">${f}</code></th><td>${d}</td></tr>`)
            .join('')}
        </tbody>
      </table>
    </div>
    <p class="docs-para">
      Plus the primitives they are built on — <code class="sk-code">trapFocus</code>,
      <code class="sk-code">saveFocus</code>, <code class="sk-code">rovingTabindex</code>,
      <code class="sk-code">dismissable</code>, <code class="sk-code">announce</code>,
      <code class="sk-code">position</code>, <code class="sk-code">createTypeahead</code> —
      exported for building something the system does not cover.
    </p>`
  );

  p.section(
    'Menu and combobox are not the same shape',
    `<p class="docs-para">
      This is the distinction most implementations get wrong, and the reason both
      exist as separate controllers rather than one configurable one.
    </p>
    <div class="sk-table" role="region" aria-label="Menu versus combobox" tabindex="0">
      <table>
        <thead><tr><th scope="col"></th><th scope="col">Menu</th><th scope="col">Combobox</th></tr></thead>
        <tbody>
          <tr><th scope="row">DOM focus</th><td>Moves to each item</td><td><strong>Never leaves the input</strong></td></tr>
          <tr><th scope="row">Cursor</th><td>Focus itself</td><td><code class="sk-code">aria-activedescendant</code></td></tr>
          <tr><th scope="row">Typing</th><td>Type-ahead jumps to an item</td><td>Filters the list</td></tr>
          <tr><th scope="row">Escape</th><td>Close, restore focus</td><td>Close keeping text; again to clear</td></tr>
          <tr><th scope="row">Contains</th><td>Commands</td><td>Values</td></tr>
        </tbody>
      </table>
    </div>
    ${callout(
      'warning',
      '',
      `<p>A menu with a virtual cursor cannot be operated by users who navigate by
      focus. A combobox that moves real focus cannot be typed into. Both failures
      are silent in a mouse-only test.</p>`
    )}`
  );

  p.section(
    'How it is verified',
    `<p class="docs-para">
      63 assertions drive a real browser and press real keys. Not a DOM emulation —
      focus behaviour is exactly the thing emulators get wrong.
    </p>
    ${demo('', `menu: skips aria-disabled item
menu: Escape restores focus to trigger
menu: Tab closes rather than trapping
combobox: focus STAYS on input
combobox: Escape keeps typed text
tabs: RTL ArrowLeft moves forward
dialog: focuses [autofocus], the SAFE option
dialog: focus returns to opener
drawer: closed drawer is inert (no invisible tab stops)
enhance: idempotent — re-running wires nothing new`, { lang: 'bash', label: 'A sample of what is asserted' })}
    <p class="docs-para">
      These run on every build and in CI. A change that breaks a keyboard contract
      fails the build rather than reaching a user.
    </p>`
  );

  return p;
}

/* ------------------------------------------------------------------ *
 * Examples index
 * ------------------------------------------------------------------ */

export interface ExampleEntry {
  file: string;
  title: string;
  description: string;
}

/**
 * A gallery of the worked examples.
 *
 * Built from the same list that generates the pages, so it cannot advertise one
 * that does not exist or quietly omit one that does.
 */
export function examplesIndexPage(entries: ExampleEntry[]): Page {
  const p = new Page({
    file: 'examples.html',
    title: 'Examples',
    eyebrow: 'Examples',
    lead:
      `${entries.length} complete pages built only from this system — every pixel from a token, ` +
      `no page-specific colour, size or spacing anywhere. They are a real product, not a component gallery: ` +
      `the point is how the pieces behave together.`,
  });

  p.section(
    'The pages',
    `<div class="sk-grid sk-grid--min-18 sk-grid--gap-16">${entries
      .map(
        (e) => `<article class="sk-card sk-card--interactive">
      <div class="sk-card__body sk-stack sk-stack--gap-8">
        <h3 class="sk-card__title" style="font-size:var(--sk-font-size-heading-xs)">
          <a class="sk-link sk-link--quiet" href="${escapeHtml(e.file)}">${escapeHtml(e.title)}</a>
        </h3>
        <p style="margin:0;color:var(--sk-color-text-secondary);font-size:var(--sk-font-size-body-sm)">
          ${escapeHtml(e.description)}
        </p>
      </div>
    </article>`
      )
      .join('')}</div>`
  );

  p.section(
    'Where to start',
    `<div class="docs-prose">
      <p>
        If you are adopting the system, read
        <a class="sk-link" href="example-states.html">Loading, empty &amp; error</a> first. The
        others show components; that one shows the decisions — the three empty states that
        routinely get identical copy, the difference between a recoverable failure and a
        forbidden one, and why <code class="sk-code">disabled</code> and
        <code class="sk-code">aria-disabled</code> are not interchangeable.
      </p>
      <p>
        Every page works at 320px without a horizontal scrollbar, mirrors correctly in
        right-to-left, and renders in light, dark and both high-contrast themes. Use the theme
        control in the top bar — the examples are the fastest way to see the elevation
        inversion, where a raised surface gets <em>lighter</em> as the page goes dark.
      </p>
    </div>`
  );

  return p;
}

/**
 * The non-component layers of the stylesheet: reset, prose, utilities and the
 * theme-switching runtime.
 *
 * These are authored by hand (unlike tokens.css, which is generated) because they
 * encode decisions rather than values.
 */

export const resetCss = `/*
 * Sekura reset.
 *
 * A modern reset, plus the handful of things a design system must own:
 * logical properties throughout, forced-colors survival, and a global
 * reduced-motion contract.
 */

@layer sk-reset, sk-base, sk-components, sk-utilities;

@layer sk-reset {
  *, *::before, *::after { box-sizing: border-box; }

  /* Margins are owned by layout primitives (Stack, Cluster), never by elements. */
  body, h1, h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd, ol, ul {
    margin: 0;
  }

  ul[role="list"], ol[role="list"] { list-style: none; padding: 0; }

  html {
    /* Stops iOS inflating text in landscape, which breaks carefully sized layouts. */
    text-size-adjust: none;
    -webkit-text-size-adjust: none;
  }

  body {
    min-block-size: 100dvh;
    font-family: var(--sk-font-family-sans);
    font-size: var(--sk-font-size-body-md);
    line-height: var(--sk-line-height-body-md);
    color: var(--sk-color-text-primary);
    background-color: var(--sk-color-surface-base);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  /* Inputs do not inherit fonts by default. This is almost never what you want. */
  input, button, textarea, select { font: inherit; color: inherit; }

  /*
   * The [hidden] attribute must win.
   *
   * The UA stylesheet gives [hidden] { display: none }, but ANY author rule
   * setting display — and most components set one — beats it on specificity.
   * The result is a "hidden" dialog, menu or empty state that renders anyway.
   * This is the single most common source of "why is my overlay showing on
   * page load", and it is why every serious reset carries this rule.
   *
   * !important is correct here: [hidden] is a statement of intent that no
   * layout rule should be able to override.
   */
  [hidden]:not([hidden="until-found"]) { display: none !important; }

  img, picture, svg, video, canvas {
    max-inline-size: 100%;
    block-size: auto;
    display: block;
  }

  /* SVGs used as icons should never intercept pointer events aimed at their parent. */
  svg { fill: currentColor; }
  button svg, a svg { pointer-events: none; }

  h1, h2, h3, h4, h5, h6 { font-weight: inherit; font-size: inherit; }

  /* Anything that scrolls needs to be reachable by keyboard. Enforced globally
     rather than per component, because it is forgotten per component. */
  [tabindex="-1"]:focus { outline: none; }

  /* A single focus treatment for the whole system. Components may refine the
     offset; none may remove it. */
  :focus-visible {
    outline: var(--sk-focus-ring-width) solid var(--sk-color-focus-ring);
    outline-offset: var(--sk-focus-ring-offset);
  }

  ::selection {
    background-color: var(--sk-color-field-selection-bg);
    color: var(--sk-color-field-selection-text);
  }

  /* Scrollbars follow the theme via color-scheme on :root; this refines them
     where the browser allows it. */
  * {
    scrollbar-color: var(--sk-color-border-strong) transparent;
    scrollbar-width: thin;
  }

  /* Anchor targets and programmatically focused elements must not end up
     underneath a sticky header (WCAG 2.2 SC 2.4.11). */
  :target, [tabindex="-1"]:focus { scroll-margin-block-start: 5rem; }
}`;

export const utilitiesCss = `@layer sk-utilities {
  /*
   * Flex-first utilities.
   *
   * Sekura composes with flex by default. These utilities exist so a one-off
   * layout does not require a new class in a stylesheet, but the composition
   * primitives (Stack, Cluster, Sidebar layout, Grid) should be preferred —
   * they carry the min-inline-size and wrap decisions with them.
   */

  .sk-flex     { display: flex; min-inline-size: 0; }
  .sk-flex-col { display: flex; flex-direction: column; min-inline-size: 0; }
  .sk-wrap     { flex-wrap: wrap; }
  .sk-nowrap   { flex-wrap: nowrap; }

  /* Explicit flex declarations. Relying on the 0 1 auto default is how items end
     up refusing to shrink and forcing horizontal overflow. */
  .sk-grow     { flex: 1 1 auto; min-inline-size: 0; }
  .sk-grow-0   { flex: 0 0 auto; }
  .sk-shrink   { flex: 0 1 auto; min-inline-size: 0; }
  .sk-basis-0  { flex-basis: 0; }

  /* The single most useful utility in the system. A flex item defaults to
     min-width: auto, which means it will not shrink below its content — this is
     the cause of most "why is my page scrolling sideways" bugs. */
  .sk-min-0    { min-inline-size: 0; min-block-size: 0; }

  .sk-push     { margin-inline-start: auto; }

  .sk-items-start    { align-items: flex-start; }
  .sk-items-center   { align-items: center; }
  .sk-items-end      { align-items: flex-end; }
  .sk-items-baseline { align-items: baseline; }
  .sk-items-stretch  { align-items: stretch; }

  .sk-justify-start   { justify-content: flex-start; }
  .sk-justify-center  { justify-content: center; }
  .sk-justify-end     { justify-content: flex-end; }
  .sk-justify-between { justify-content: space-between; }

  /* Truncation only works on a flex item that is allowed to shrink, so these
     utilities include min-inline-size: 0 rather than leaving it to the caller. */
  .sk-truncate {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sk-truncate-2 {
    min-inline-size: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .sk-break { overflow-wrap: anywhere; }

  /* Visually hidden but present for assistive technology. Never use display:none
     for content a screen reader should reach. */
  .sk-visually-hidden {
    position: absolute !important;
    inline-size: 1px !important;
    block-size: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip-path: inset(50%) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }

  /* Same, but becomes visible when focused — for skip links and similar. */
  .sk-visually-hidden-focusable:not(:focus):not(:focus-within) {
    position: absolute !important;
    inline-size: 1px !important;
    block-size: 1px !important;
    overflow: hidden !important;
    clip-path: inset(50%) !important;
    white-space: nowrap !important;
  }

  .sk-scroll-x { overflow-x: auto; overscroll-behavior-x: contain; }
  .sk-scroll-y { overflow-y: auto; overscroll-behavior-y: contain; }

  .sk-container {
    inline-size: 100%;
    max-inline-size: var(--sk-container-xl);
    margin-inline: auto;
    padding-inline: clamp(var(--sk-space-16), 4vw, var(--sk-space-32));
  }
  .sk-container--prose { max-inline-size: var(--sk-container-prose); }

  /* Container queries: a component can respond to its own width rather than the
     viewport's, which is what makes a card behave correctly in both a sidebar
     and a full-width region. */
  .sk-cq { container-type: inline-size; }
}`;

export const proseCss = `@layer sk-base {
  /*
   * Long-form content. Applied to a wrapper around CMS or Markdown output, where
   * the markup is not under our control and elements must style themselves.
   */
  .sk-prose {
    max-inline-size: var(--sk-container-prose);
    color: var(--sk-color-text-primary);
  }

  .sk-prose > * + * { margin-block-start: var(--sk-space-16); }

  .sk-prose h1 {
    font-size: var(--sk-font-size-heading-xl);
    line-height: var(--sk-line-height-heading-xl);
    font-weight: var(--sk-font-weight-bold);
    letter-spacing: var(--sk-letter-spacing-heading-xl);
    text-wrap: balance;
    margin-block-start: var(--sk-space-40);
  }
  .sk-prose h2 {
    font-size: var(--sk-font-size-heading-lg);
    line-height: var(--sk-line-height-heading-lg);
    font-weight: var(--sk-font-weight-bold);
    text-wrap: balance;
    margin-block-start: var(--sk-space-40);
  }
  .sk-prose h3 {
    font-size: var(--sk-font-size-heading-md);
    line-height: var(--sk-line-height-heading-md);
    font-weight: var(--sk-font-weight-semibold);
    text-wrap: balance;
    margin-block-start: var(--sk-space-32);
  }
  .sk-prose h4 {
    font-size: var(--sk-font-size-heading-sm);
    font-weight: var(--sk-font-weight-semibold);
    margin-block-start: var(--sk-space-24);
  }

  /* A heading immediately followed by content should not add a second gap. */
  .sk-prose :is(h1, h2, h3, h4) + * { margin-block-start: var(--sk-space-8); }

  .sk-prose p { text-wrap: pretty; }

  .sk-prose .sk-lead {
    font-size: var(--sk-font-size-body-lg);
    line-height: var(--sk-line-height-body-lg);
    color: var(--sk-color-text-secondary);
  }

  .sk-prose :is(ul, ol) { padding-inline-start: var(--sk-space-24); }
  .sk-prose li + li { margin-block-start: var(--sk-space-8); }

  .sk-prose blockquote {
    padding-inline-start: var(--sk-space-16);
    border-inline-start: var(--sk-border-width-accent) solid var(--sk-color-border-brand);
    color: var(--sk-color-text-secondary);
  }

  .sk-prose :is(table) { inline-size: 100%; border-collapse: collapse; }
  .sk-prose :is(th, td) {
    padding: var(--sk-space-8) var(--sk-space-12);
    text-align: start;
    border-block-end: var(--sk-border-width-hairline) solid var(--sk-color-border-subtle);
  }

  .sk-prose hr {
    border: none;
    block-size: var(--sk-border-width-hairline);
    background-color: var(--sk-color-border-subtle);
    margin-block: var(--sk-space-32);
  }

  .sk-prose img { border-radius: var(--sk-radius-lg); }

  .sk-prose figcaption {
    margin-block-start: var(--sk-space-8);
    font-size: var(--sk-font-size-body-sm);
    color: var(--sk-color-text-tertiary);
  }
}`;

/**
 * The theme runtime.
 *
 * The inline script is the important part: it must run before first paint,
 * synchronously, in <head>. Loading it asynchronously produces a flash of the
 * wrong theme, which is the single most visible dark-mode defect.
 */
export const themeScript = `<!-- Place this inline in <head>, BEFORE any stylesheet.
     It must run synchronously or the page paints in the wrong theme first. -->
<script>
(function () {
  var STORAGE_KEY = 'sk-theme';        // 'light' | 'dark' | 'system'
  var CONTRAST_KEY = 'sk-contrast';    // 'normal' | 'more'
  var root = document.documentElement;

  function systemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function systemContrast() {
    return window.matchMedia('(prefers-contrast: more)').matches ? 'more' : 'normal';
  }

  function resolve() {
    var pref, contrast;
    try {
      pref = localStorage.getItem(STORAGE_KEY) || 'system';
      contrast = localStorage.getItem(CONTRAST_KEY) || 'system';
    } catch (e) {
      // Private browsing can throw on localStorage access. Fall back to system.
      pref = 'system';
      contrast = 'system';
    }
    var base = pref === 'system' ? systemTheme() : pref;
    var hc = contrast === 'system' ? systemContrast() : contrast;
    return hc === 'more' ? 'hc-' + base : base;
  }

  function apply() {
    root.setAttribute('data-sk-theme', resolve());
  }

  apply();

  // Follow the OS when the user has not pinned a preference.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
  window.matchMedia('(prefers-contrast: more)').addEventListener('change', apply);

  // Exposed so a settings control can change the theme.
  window.sekuraTheme = {
    set: function (value) {
      try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
      apply();
    },
    get: function () {
      try { return localStorage.getItem(STORAGE_KEY) || 'system'; } catch (e) { return 'system'; }
    },
    resolved: resolve
  };
})();
</script>`;

export const themeToggleHtml = `<!--
  Theme control. Three options, not two: "System" must be available, and must be
  the default. A two-state toggle silently overrides the user's OS preference the
  first time they touch it.
-->
<fieldset class="sk-fieldset">
  <legend class="sk-fieldset__legend">Colour theme</legend>
  <div class="sk-button-group sk-button-group--segmented" role="radiogroup" aria-label="Colour theme">
    <button type="button" class="sk-button-group__segment" role="radio"
            aria-checked="true" tabindex="0" data-sk-theme-option="system">System</button>
    <button type="button" class="sk-button-group__segment" role="radio"
            aria-checked="false" tabindex="-1" data-sk-theme-option="light">Light</button>
    <button type="button" class="sk-button-group__segment" role="radio"
            aria-checked="false" tabindex="-1" data-sk-theme-option="dark">Dark</button>
  </div>
</fieldset>

<script>
document.querySelectorAll('[data-sk-theme-option]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    window.sekuraTheme.set(btn.dataset.skThemeOption);
    document.querySelectorAll('[data-sk-theme-option]').forEach(function (b) {
      var on = b === btn;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    // The visual change is silent to a screen reader, so announce it.
    document.getElementById('sk-theme-status').textContent =
      'Theme set to ' + btn.textContent.trim() + '.';
  });
});
</script>
<p class="sk-visually-hidden" role="status" id="sk-theme-status"></p>`;

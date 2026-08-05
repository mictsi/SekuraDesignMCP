/**
 * Sekura semantic tokens.
 *
 * The semantic layer is the *only* layer product code is allowed to touch. Each token
 * names a role ("the border around a resting input") rather than a value, and resolves
 * to a different primitive in each theme. Swapping themes therefore never requires
 * touching a component.
 *
 * Every token carries values for all four supported themes. A theme is not optional:
 * `dark` is a first-class peer of `light`, and the two high-contrast themes exist to
 * satisfy users who set `prefers-contrast: more` or a forced-colours mode.
 */

import type { ContrastUse } from '../lib/color.js';

export const THEMES = ['light', 'dark', 'hc-light', 'hc-dark'] as const;
export type ThemeName = (typeof THEMES)[number];

export const themeInfo: Record<
  ThemeName,
  { label: string; description: string; colorScheme: string; selector: string }
> = {
  light: {
    label: 'Light',
    description:
      'Default theme. White page, near-black text, Cobalt actions. Tuned for sustained daytime reading.',
    colorScheme: 'light',
    selector: ':root, [data-sk-theme="light"]',
  },
  dark: {
    label: 'Dark',
    description:
      'Peer of light, not an inversion. Surfaces get lighter as they rise; saturated hues are stepped up so they survive on dark; shadows are supplemented by surface lightness because a drop shadow is nearly invisible on a dark page.',
    colorScheme: 'dark',
    selector: '[data-sk-theme="dark"]',
  },
  'hc-light': {
    label: 'High contrast light',
    description:
      'Applied when the user sets prefers-contrast: more. Pure white page, pure black text, every boundary drawn explicitly. No token relies on a subtle wash.',
    colorScheme: 'light',
    selector: '[data-sk-theme="hc-light"]',
  },
  'hc-dark': {
    label: 'High contrast dark',
    description:
      'prefers-contrast: more combined with a dark preference. Pure black page, pure white text, maximum boundary definition.',
    colorScheme: 'dark',
    selector: '[data-sk-theme="hc-dark"]',
  },
};

/**
 * A value is either a primitive reference ("cobalt.600", "alpha.black-8") or a literal
 * CSS value. References are resolved by the exporter so a single primitive edit
 * propagates everywhere.
 */
export type TokenValue = string;

export interface SemanticToken {
  /** CSS custom property name, without the `--sk-` prefix. */
  name: string;
  group: string;
  description: string;
  values: Record<ThemeName, TokenValue>;
  /**
   * Marked true for tokens WCAG explicitly exempts from contrast minimums
   * (disabled controls, purely decorative fills). They are still documented so the
   * exemption is a deliberate decision rather than an oversight.
   */
  contrastExempt?: boolean;
}

const t = (
  name: string,
  group: string,
  description: string,
  light: TokenValue,
  dark: TokenValue,
  hcLight: TokenValue,
  hcDark: TokenValue,
  contrastExempt = false
): SemanticToken => ({
  name,
  group,
  description,
  values: { light, dark, 'hc-light': hcLight, 'hc-dark': hcDark },
  ...(contrastExempt ? { contrastExempt } : {}),
});

export const semanticTokens: SemanticToken[] = [
  /* ---------------------------------------------------------------- *
   * Surfaces
   *
   * Light mode: elevation reads as shadow, surfaces stay white.
   * Dark mode: elevation reads as *lightness* — the higher a surface floats, the
   * lighter it gets. This is why dark mode is not an inversion of light mode.
   * ---------------------------------------------------------------- */
  t('color-surface-base', 'surface', 'The page itself. The backdrop everything sits on.',
    'neutral.0', 'neutral.950', 'neutral.0', 'neutral.1000'),
  t('color-surface-subtle', 'surface', 'A quiet band that separates a region from the page without a border. Page headers, side rails.',
    'neutral.50', 'neutral.900', 'neutral.50', 'neutral.950'),
  t('color-surface-sunken', 'surface', 'Recessed well: code blocks, empty drop zones, inactive tab strips.',
    'neutral.100', 'neutral.975', 'neutral.100', 'neutral.1000'),
  t('color-surface-raised', 'surface', 'Cards, panels, table containers. Elevation 1–2.',
    'neutral.0', 'neutral.900', 'neutral.0', 'neutral.1000'),
  t('color-surface-overlay', 'surface', 'Floats above the page: menus, popovers, dialogs, toasts. Elevation 3–5.',
    'neutral.0', 'neutral.850', 'neutral.0', 'neutral.1000'),
  t('color-surface-inverse', 'surface', 'Deliberately opposite the page. Tooltips and inline contextual callouts.',
    'neutral.900', 'neutral.100', 'neutral.1000', 'neutral.0'),
  t('color-surface-hover', 'surface', 'Wash applied to a hovered row, list item or ghost button.',
    'alpha.black-4', 'alpha.white-8', 'alpha.black-8', 'alpha.white-12'),
  t('color-surface-active', 'surface', 'Wash applied while a control is being pressed.',
    'alpha.black-8', 'alpha.white-12', 'alpha.black-12', 'alpha.white-24'),
  t('color-surface-selected', 'surface', 'Persistent selection: chosen row, active nav item, checked option.',
    'cobalt.50', 'cobalt.950', 'cobalt.100', 'cobalt.950'),
  t('color-surface-disabled', 'surface', 'Fill of a control the user cannot operate.',
    'neutral.100', 'neutral.800', 'neutral.200', 'neutral.800', true),
  t('color-surface-brand', 'surface', 'Solid brand fill. Primary buttons, active navigation markers.',
    'cobalt.600', 'cobalt.400', 'cobalt.800', 'cobalt.200'),
  t('color-surface-brand-subtle', 'surface', 'Quiet brand tint behind brand-flavoured content.',
    'cobalt.50', 'cobalt.950', 'cobalt.100', 'neutral.1000'),
  t('color-surface-accent', 'surface', 'Solid accent fill. Non-action emphasis only.',
    'aqua.600', 'aqua.300', 'aqua.800', 'aqua.200'),
  t('color-surface-accent-subtle', 'surface', 'Quiet accent tint.',
    'aqua.50', 'aqua.950', 'aqua.100', 'neutral.1000'),
  t('color-surface-scrim', 'surface', 'Dims the page behind a modal so the dialog is unambiguously the only live surface.',
    'alpha.black-48', 'alpha.black-64', 'alpha.black-64', 'alpha.black-64', true),

  /* ---------------------------------------------------------------- *
   * Text
   * ---------------------------------------------------------------- */
  t('color-text-primary', 'text', 'Default text colour. Headings, body copy, table cells.',
    'neutral.900', 'neutral.50', 'neutral.1000', 'neutral.0'),
  t('color-text-secondary', 'text', 'Supporting text that must still be comfortably readable: descriptions, help text.',
    'neutral.600', 'neutral.300', 'neutral.800', 'neutral.100'),
  t('color-text-tertiary', 'text', 'Lowest-emphasis readable text: timestamps, counts, metadata. Still clears 4.5:1.',
    'neutral.500', 'neutral.400', 'neutral.700', 'neutral.200'),
  t('color-text-disabled', 'text', 'Text inside a control the user cannot operate. WCAG 1.4.3 exempts it; never use it for information the user needs.',
    'neutral.400', 'neutral.600', 'neutral.500', 'neutral.500', true),
  t('color-text-placeholder', 'text', 'Input placeholder. Held to 4.5:1 deliberately — most systems fail here.',
    'neutral.500', 'neutral.400', 'neutral.700', 'neutral.200'),
  t('color-text-on-brand', 'text', 'Text and icons sitting on color-surface-brand.',
    'neutral.0', 'neutral.950', 'neutral.0', 'neutral.1000'),
  t('color-text-on-accent', 'text', 'Text and icons sitting on color-surface-accent.',
    'neutral.0', 'neutral.950', 'neutral.0', 'neutral.1000'),
  t('color-text-on-inverse', 'text', 'Text sitting on color-surface-inverse.',
    'neutral.50', 'neutral.900', 'neutral.0', 'neutral.1000'),
  t('color-text-brand', 'text', 'Brand-coloured text on a normal surface. Section eyebrows, emphasised labels.',
    'cobalt.700', 'cobalt.300', 'cobalt.900', 'cobalt.100'),
  t('color-text-link', 'text', 'Resting hyperlink. Always paired with an underline — colour alone never signals a link.',
    'cobalt.700', 'cobalt.300', 'cobalt.900', 'cobalt.100'),
  t('color-text-link-hover', 'text', 'Hovered or focused hyperlink.',
    'cobalt.800', 'cobalt.200', 'cobalt.950', 'cobalt.50'),
  t('color-text-link-visited', 'text', 'Visited hyperlink in long-form prose. Omit inside application chrome.',
    'violet.700', 'violet.300', 'violet.900', 'violet.100'),
  t('color-text-code', 'text', 'Inline monospace fragments: identifiers, hostnames, keys.',
    'neutral.800', 'neutral.100', 'neutral.1000', 'neutral.0'),

  /* ---------------------------------------------------------------- *
   * Borders
   * ---------------------------------------------------------------- */
  t('color-border-subtle', 'border', 'Lowest-emphasis separation: table row rules, list dividers.',
    'neutral.200', 'neutral.800', 'neutral.400', 'neutral.600'),
  t('color-border-default', 'border', 'Standard container boundary: cards, panels, table outer edge.',
    'neutral.300', 'neutral.700', 'neutral.700', 'neutral.400'),
  t('color-border-strong', 'border', 'Emphasised boundary that must clear 3:1: resting input and control borders.',
    'neutral.400', 'neutral.500', 'neutral.900', 'neutral.200'),
  t('color-border-interactive', 'border', 'Border of a hovered or otherwise engaged control. Always a step stronger than border-strong.',
    'neutral.500', 'neutral.400', 'neutral.1000', 'neutral.0'),
  t('color-border-brand', 'border', 'Brand-coloured boundary: selected card, active tab underline.',
    'cobalt.600', 'cobalt.400', 'cobalt.800', 'cobalt.200'),
  t('color-border-disabled', 'border', 'Boundary of an inoperable control.',
    'neutral.200', 'neutral.700', 'neutral.300', 'neutral.700', true),
  t('color-border-inverse', 'border', 'Boundary drawn on an inverse surface.',
    'neutral.700', 'neutral.300', 'neutral.0', 'neutral.1000'),

  /* ---------------------------------------------------------------- *
   * Focus
   *
   * One ring, everywhere. Two-tone so it stays visible against brand fills and on
   * both page polarities. WCAG 2.2 SC 2.4.11 Focus Not Obscured and SC 2.4.13
   * Focus Appearance are both satisfied by the ring plus its offset.
   * ---------------------------------------------------------------- */
  t('color-focus-ring', 'focus', 'The focus indicator itself.',
    'cobalt.600', 'cobalt.300', 'neutral.1000', 'neutral.0'),
  t('color-focus-ring-offset', 'focus', 'The gap drawn between the control and the ring, so the ring never merges into the fill.',
    'neutral.0', 'neutral.950', 'neutral.0', 'neutral.1000'),
  t('color-focus-ring-inverse', 'focus', 'Focus ring used on brand or inverse fills where the standard ring would disappear.',
    'neutral.0', 'neutral.0', 'neutral.0', 'neutral.0'),

  /* ---------------------------------------------------------------- *
   * Actions
   *
   * Five intents (primary, secondary, ghost, danger, success), each with resting,
   * hover, active and disabled states. Secondary and ghost inherit text colour from
   * the surface, so they only declare fills and borders.
   * ---------------------------------------------------------------- */
  t('color-action-primary-bg', 'action', 'Primary button resting fill.',
    'cobalt.600', 'cobalt.400', 'cobalt.800', 'cobalt.200'),
  t('color-action-primary-bg-hover', 'action', 'Primary button hover fill.',
    'cobalt.700', 'cobalt.300', 'cobalt.900', 'cobalt.100'),
  t('color-action-primary-bg-active', 'action', 'Primary button pressed fill.',
    'cobalt.800', 'cobalt.200', 'cobalt.950', 'cobalt.50'),
  t('color-action-primary-text', 'action', 'Primary button label and icon.',
    'neutral.0', 'neutral.950', 'neutral.0', 'neutral.1000'),

  t('color-action-secondary-bg', 'action', 'Secondary button resting fill — transparent so it reads as an outline.',
    'transparent', 'transparent', 'transparent', 'transparent', true),
  t('color-action-secondary-bg-hover', 'action', 'Secondary button hover wash.',
    'neutral.100', 'alpha.white-8', 'neutral.200', 'alpha.white-24'),
  t('color-action-secondary-bg-active', 'action', 'Secondary button pressed wash.',
    'neutral.200', 'alpha.white-12', 'neutral.300', 'alpha.white-48'),
  t('color-action-secondary-border', 'action', 'Secondary button outline. This *is* the control boundary, so it is held to 3:1.',
    'neutral.400', 'neutral.500', 'neutral.1000', 'neutral.0'),
  t('color-action-secondary-text', 'action', 'Secondary button label.',
    'neutral.900', 'neutral.50', 'neutral.1000', 'neutral.0'),

  t('color-action-ghost-text', 'action', 'Ghost/tertiary button label. No fill, no border at rest.',
    'cobalt.700', 'cobalt.300', 'cobalt.900', 'cobalt.100'),
  t('color-action-ghost-bg-hover', 'action', 'Ghost button hover wash.',
    'cobalt.50', 'alpha.white-8', 'cobalt.100', 'alpha.white-24'),
  t('color-action-ghost-bg-active', 'action', 'Ghost button pressed wash.',
    'cobalt.100', 'alpha.white-12', 'cobalt.200', 'alpha.white-48'),

  t('color-action-danger-bg', 'action', 'Destructive button resting fill.',
    'crimson.600', 'crimson.400', 'crimson.800', 'crimson.200'),
  t('color-action-danger-bg-hover', 'action', 'Destructive button hover fill.',
    'crimson.700', 'crimson.300', 'crimson.900', 'crimson.100'),
  t('color-action-danger-bg-active', 'action', 'Destructive button pressed fill.',
    'crimson.800', 'crimson.200', 'crimson.950', 'crimson.50'),
  t('color-action-danger-text', 'action', 'Destructive button label.',
    'neutral.0', 'neutral.950', 'neutral.0', 'neutral.1000'),

  t('color-action-success-bg', 'action', 'Confirming button fill, for completing work the user already began.',
    'jade.600', 'jade.300', 'jade.800', 'jade.200'),
  t('color-action-success-bg-hover', 'action', 'Confirming button hover fill.',
    'jade.700', 'jade.200', 'jade.900', 'jade.100'),
  t('color-action-success-bg-active', 'action', 'Confirming button pressed fill.',
    'jade.800', 'jade.100', 'jade.950', 'jade.50'),
  t('color-action-success-text', 'action', 'Confirming button label.',
    'neutral.0', 'neutral.950', 'neutral.0', 'neutral.1000'),

  t('color-action-disabled-bg', 'action', 'Fill of any disabled button.',
    'neutral.200', 'neutral.800', 'neutral.200', 'neutral.800', true),
  t('color-action-disabled-text', 'action', 'Label of any disabled button.',
    'neutral.400', 'neutral.600', 'neutral.500', 'neutral.500', true),

  /* ---------------------------------------------------------------- *
   * Status
   *
   * Each intent supplies five roles so a status can be expressed as a tinted banner,
   * an outlined chip, or a solid badge without ever inventing a new colour. Status is
   * never carried by colour alone — every status component pairs these with an icon
   * and a text label.
   * ---------------------------------------------------------------- */
  t('color-status-success-surface', 'status', 'Tinted background for a success banner or chip.',
    'jade.50', 'jade.950', 'jade.100', 'neutral.1000'),
  t('color-status-success-border', 'status', 'Boundary or accent bar of a success message.',
    'jade.600', 'jade.400', 'jade.800', 'jade.200'),
  t('color-status-success-text', 'status', 'Text and icon of a success message on its tinted surface.',
    'jade.800', 'jade.200', 'jade.950', 'jade.50'),
  t('color-status-success-solid', 'status', 'Solid success fill for badges and status dots.',
    'jade.600', 'jade.400', 'jade.800', 'jade.200'),
  t('color-status-success-on-solid', 'status', 'Text on a solid success fill.',
    'neutral.0', 'neutral.950', 'neutral.0', 'neutral.1000'),

  t('color-status-warning-surface', 'status', 'Tinted background for a warning banner or chip.',
    'amber.50', 'amber.950', 'amber.100', 'neutral.1000'),
  t('color-status-warning-border', 'status', 'Boundary or accent bar of a warning message.',
    'amber.500', 'amber.400', 'amber.700', 'amber.200'),
  t('color-status-warning-text', 'status', 'Text and icon of a warning message on its tinted surface.',
    'amber.800', 'amber.200', 'amber.950', 'amber.50'),
  t('color-status-warning-solid', 'status', 'Solid warning fill for badges and status dots.',
    'amber.500', 'amber.300', 'amber.700', 'amber.200'),
  t('color-status-warning-on-solid', 'status', 'Text on a solid warning fill. Amber is light, so this is dark in every theme.',
    'neutral.1000', 'neutral.950', 'neutral.0', 'neutral.1000'),

  t('color-status-danger-surface', 'status', 'Tinted background for an error banner or chip.',
    'crimson.50', 'crimson.950', 'crimson.100', 'neutral.1000'),
  t('color-status-danger-border', 'status', 'Boundary or accent bar of an error message.',
    'crimson.600', 'crimson.400', 'crimson.800', 'crimson.200'),
  t('color-status-danger-text', 'status', 'Text and icon of an error message on its tinted surface.',
    'crimson.800', 'crimson.200', 'crimson.950', 'crimson.50'),
  t('color-status-danger-solid', 'status', 'Solid error fill for badges and status dots.',
    'crimson.600', 'crimson.400', 'crimson.800', 'crimson.200'),
  t('color-status-danger-on-solid', 'status', 'Text on a solid error fill.',
    'neutral.0', 'neutral.950', 'neutral.0', 'neutral.1000'),

  t('color-status-info-surface', 'status', 'Tinted background for an informational banner or chip.',
    'azure.50', 'azure.950', 'azure.100', 'neutral.1000'),
  t('color-status-info-border', 'status', 'Boundary or accent bar of an informational message.',
    'azure.600', 'azure.400', 'azure.800', 'azure.200'),
  t('color-status-info-text', 'status', 'Text and icon of an informational message on its tinted surface.',
    'azure.800', 'azure.200', 'azure.950', 'azure.50'),
  t('color-status-info-solid', 'status', 'Solid informational fill for badges and status dots.',
    'azure.600', 'azure.400', 'azure.800', 'azure.200'),
  t('color-status-info-on-solid', 'status', 'Text on a solid informational fill.',
    'neutral.0', 'neutral.950', 'neutral.0', 'neutral.1000'),

  t('color-status-neutral-surface', 'status', 'Tinted background for a neutral or archived chip.',
    'neutral.100', 'neutral.800', 'neutral.200', 'neutral.1000'),
  t('color-status-neutral-border', 'status', 'Boundary of a neutral chip.',
    'neutral.400', 'neutral.500', 'neutral.900', 'neutral.200'),
  t('color-status-neutral-text', 'status', 'Text of a neutral chip.',
    'neutral.700', 'neutral.200', 'neutral.1000', 'neutral.0'),
  t('color-status-neutral-solid', 'status', 'Solid neutral fill.',
    'neutral.600', 'neutral.400', 'neutral.900', 'neutral.200'),
  t('color-status-neutral-on-solid', 'status', 'Text on a solid neutral fill.',
    'neutral.0', 'neutral.950', 'neutral.0', 'neutral.1000'),

  /* ---------------------------------------------------------------- *
   * Forms
   * ---------------------------------------------------------------- */
  t('color-field-bg', 'form', 'Resting fill of a text input, select or textarea.',
    'neutral.0', 'neutral.950', 'neutral.0', 'neutral.1000'),
  t('color-field-bg-hover', 'form', 'Hovered field fill.',
    'neutral.50', 'neutral.900', 'neutral.50', 'neutral.1000'),
  t('color-field-bg-disabled', 'form', 'Disabled field fill.',
    'neutral.100', 'neutral.900', 'neutral.200', 'neutral.900', true),
  t('color-field-bg-readonly', 'form', 'Read-only field fill. Distinct from disabled: the value still matters.',
    'neutral.50', 'neutral.900', 'neutral.100', 'neutral.950'),
  t('color-field-border', 'form', 'Resting field border. Must clear 3:1 against the surrounding surface — on the raised surface too, not just the page.',
    'neutral.400', 'neutral.500', 'neutral.1000', 'neutral.0'),
  t('color-field-border-hover', 'form', 'Hovered field border.',
    'neutral.500', 'neutral.400', 'neutral.1000', 'neutral.0'),
  t('color-field-border-error', 'form', 'Field border when validation has failed.',
    'crimson.600', 'crimson.400', 'crimson.800', 'crimson.200'),
  t('color-field-border-success', 'form', 'Field border when a value has been confirmed valid by the server.',
    'jade.600', 'jade.400', 'jade.800', 'jade.200'),
  t('color-field-selection-bg', 'form', 'Background of text the user has selected.',
    'cobalt.100', 'cobalt.800', 'cobalt.200', 'cobalt.900'),
  t('color-field-selection-text', 'form', 'Foreground of text the user has selected.',
    'neutral.900', 'neutral.0', 'neutral.1000', 'neutral.0'),
  t('color-control-checked', 'form', 'Fill of a checked checkbox, radio or switch.',
    'cobalt.600', 'cobalt.400', 'cobalt.800', 'cobalt.200'),
  t('color-control-checked-mark', 'form', 'The tick or dot drawn inside a checked control.',
    'neutral.0', 'neutral.950', 'neutral.0', 'neutral.1000'),
  t('color-control-track', 'form', 'Unfilled track of a switch, slider or progress bar. It is a graphical object that conveys state, so it is held to 3:1 rather than treated as decoration.',
    'neutral.400', 'neutral.500', 'neutral.900', 'neutral.200'),

  /* ---------------------------------------------------------------- *
   * Data visualisation
   *
   * Eight categorical series ordered so the first four remain distinguishable under
   * deuteranopia and protanopia — the two most common forms of colour vision
   * deficiency. Series are stepped lighter in dark themes so they hold their weight
   * against a dark plot area.
   * ---------------------------------------------------------------- */
  t('color-chart-1', 'chart', 'First categorical series. Also the default for single-series charts.',
    'cobalt.600', 'cobalt.300', 'cobalt.800', 'cobalt.200'),
  t('color-chart-2', 'chart', 'Second categorical series.',
    'aqua.500', 'aqua.300', 'aqua.700', 'aqua.200'),
  t('color-chart-3', 'chart', 'Third categorical series.',
    'amber.500', 'amber.300', 'amber.700', 'amber.200'),
  t('color-chart-4', 'chart', 'Fourth categorical series.',
    'crimson.500', 'crimson.300', 'crimson.700', 'crimson.200'),
  t('color-chart-5', 'chart', 'Fifth categorical series.',
    'violet.500', 'violet.300', 'violet.700', 'violet.200'),
  t('color-chart-6', 'chart', 'Sixth categorical series.',
    'jade.500', 'jade.300', 'jade.700', 'jade.200'),
  t('color-chart-7', 'chart', 'Seventh categorical series.',
    'azure.400', 'azure.200', 'azure.600', 'azure.100'),
  t('color-chart-8', 'chart', 'Eighth categorical series. Beyond eight, group into "Other".',
    'neutral.500', 'neutral.400', 'neutral.700', 'neutral.300'),
  t('color-chart-grid', 'chart', 'Axis gridlines. Deliberately faint — they orient, they do not compete.',
    'neutral.200', 'neutral.800', 'neutral.400', 'neutral.700'),
  t('color-chart-axis', 'chart', 'Axis lines and tick marks.',
    'neutral.400', 'neutral.600', 'neutral.900', 'neutral.200'),
  t('color-chart-label', 'chart', 'Axis labels and data labels.',
    'neutral.600', 'neutral.300', 'neutral.900', 'neutral.100'),

  /* ---------------------------------------------------------------- *
   * AI and automation
   *
   * A dedicated intent so machine-generated content is never mistaken for a user
   * action or a confirmed fact.
   * ---------------------------------------------------------------- */
  t('color-ai-surface', 'ai', 'Background of a region containing machine-generated content.',
    'violet.50', 'violet.950', 'violet.100', 'neutral.1000'),
  t('color-ai-border', 'ai', 'Boundary marking machine-generated content.',
    'violet.500', 'violet.400', 'violet.800', 'violet.200'),
  t('color-ai-text', 'ai', 'Text and icon identifying machine-generated content.',
    'violet.800', 'violet.200', 'violet.950', 'violet.50'),
];

/**
 * Contrast requirements.
 *
 * Each entry is a promise the design system makes and the `audit_theme` tool verifies
 * in every theme. If a pairing is not listed here, no promise is made about it and it
 * must not be used to carry meaning.
 */
export interface ContrastRequirement {
  foreground: string;
  background: string;
  use: ContrastUse;
  note: string;
}

const surfacesForText = [
  'color-surface-base',
  'color-surface-subtle',
  'color-surface-sunken',
  'color-surface-raised',
  'color-surface-overlay',
];

export const contrastRequirements: ContrastRequirement[] = [
  // Text on every surface it is permitted to appear on.
  ...surfacesForText.flatMap((bg): ContrastRequirement[] => [
    {
      foreground: 'color-text-primary',
      background: bg,
      use: 'body-text',
      note: 'Primary text must be readable on every content surface.',
    },
    {
      foreground: 'color-text-secondary',
      background: bg,
      use: 'body-text',
      note: 'Secondary text carries real information and is held to full body contrast.',
    },
    {
      foreground: 'color-text-tertiary',
      background: bg,
      use: 'body-text',
      note: 'Tertiary text is the lowest emphasis the system permits for readable content.',
    },
    {
      foreground: 'color-text-link',
      background: bg,
      use: 'body-text',
      note: 'Links must be readable wherever prose appears.',
    },
    {
      foreground: 'color-text-brand',
      background: bg,
      use: 'body-text',
      note: 'Brand-coloured text is still text.',
    },
  ]),
  {
    foreground: 'color-text-placeholder',
    background: 'color-field-bg',
    use: 'body-text',
    note: 'Placeholder text is frequently the only label a user sees mid-entry.',
  },
  {
    foreground: 'color-text-code',
    background: 'color-surface-sunken',
    use: 'body-text',
    note: 'Code blocks sit on the sunken surface.',
  },
  {
    foreground: 'color-text-on-inverse',
    background: 'color-surface-inverse',
    use: 'body-text',
    note: 'Tooltip text.',
  },

  // Action fills.
  {
    foreground: 'color-action-primary-text',
    background: 'color-action-primary-bg',
    use: 'body-text',
    note: 'Primary button label.',
  },
  {
    foreground: 'color-action-primary-text',
    background: 'color-action-primary-bg-hover',
    use: 'body-text',
    note: 'A button must not lose legibility on hover.',
  },
  {
    foreground: 'color-action-primary-text',
    background: 'color-action-primary-bg-active',
    use: 'body-text',
    note: 'A button must not lose legibility while pressed.',
  },
  {
    foreground: 'color-action-danger-text',
    background: 'color-action-danger-bg',
    use: 'body-text',
    note: 'Destructive button label.',
  },
  {
    foreground: 'color-action-danger-text',
    background: 'color-action-danger-bg-hover',
    use: 'body-text',
    note: 'Destructive button label on hover.',
  },
  {
    foreground: 'color-action-success-text',
    background: 'color-action-success-bg',
    use: 'body-text',
    note: 'Confirming button label.',
  },
  {
    foreground: 'color-action-secondary-text',
    background: 'color-surface-base',
    use: 'body-text',
    note: 'Secondary buttons are transparent, so their label sits on the page.',
  },
  {
    foreground: 'color-action-ghost-text',
    background: 'color-surface-base',
    use: 'body-text',
    note: 'Ghost buttons are transparent, so their label sits on the page.',
  },
  {
    foreground: 'color-action-secondary-border',
    background: 'color-surface-base',
    use: 'ui-component',
    note: 'A secondary button is located by its outline; the outline is the control boundary.',
  },

  // Status.
  ...(['success', 'warning', 'danger', 'info', 'neutral'] as const).flatMap(
    (intent): ContrastRequirement[] => [
      {
        foreground: `color-status-${intent}-text`,
        background: `color-status-${intent}-surface`,
        use: 'body-text',
        note: `${intent} message text on its own tinted surface.`,
      },
      {
        foreground: `color-status-${intent}-on-solid`,
        background: `color-status-${intent}-solid`,
        use: 'body-text',
        note: `${intent} badge text on a solid fill.`,
      },
      {
        foreground: `color-status-${intent}-border`,
        background: 'color-surface-base',
        use: 'ui-component',
        note: `${intent} accent bar must be perceivable as a graphical object.`,
      },
      {
        foreground: `color-status-${intent}-solid`,
        background: 'color-surface-base',
        use: 'ui-component',
        note: `${intent} status dot must be perceivable without its label.`,
      },
    ]
  ),

  // Boundaries and controls — WCAG 1.4.11 non-text contrast.
  {
    foreground: 'color-field-border',
    background: 'color-surface-base',
    use: 'ui-component',
    note: 'A user must be able to see where an input begins and ends.',
  },
  {
    foreground: 'color-field-border',
    background: 'color-surface-raised',
    use: 'ui-component',
    note: 'Inputs inside cards must remain locatable.',
  },
  {
    foreground: 'color-field-border-error',
    background: 'color-surface-base',
    use: 'ui-component',
    note: 'An invalid field must be locatable by its border.',
  },
  {
    foreground: 'color-border-strong',
    background: 'color-surface-base',
    use: 'ui-component',
    note: 'Control boundaries.',
  },
  {
    foreground: 'color-control-checked',
    background: 'color-surface-base',
    use: 'ui-component',
    note: 'A checked checkbox must be perceivable against the page.',
  },
  {
    foreground: 'color-control-checked-mark',
    background: 'color-control-checked',
    use: 'ui-component',
    note: 'The tick inside a checkbox must be visible against its own fill.',
  },
  {
    foreground: 'color-control-track',
    background: 'color-surface-base',
    use: 'ui-component',
    note: 'The unfilled portion of a switch or progress bar must be perceivable.',
  },
  {
    foreground: 'color-focus-ring',
    background: 'color-surface-base',
    use: 'ui-component',
    note: 'WCAG 2.2 SC 2.4.13 — the focus indicator must clear 3:1 against the adjacent surface.',
  },
  {
    foreground: 'color-focus-ring',
    background: 'color-surface-raised',
    use: 'ui-component',
    note: 'Focus must remain visible inside cards and dialogs.',
  },
  {
    foreground: 'color-border-brand',
    background: 'color-surface-base',
    use: 'ui-component',
    note: 'Active tab underline and selected-card boundary.',
  },

  // Charts. Series must be distinguishable from the plot background as graphical objects.
  ...([1, 2, 3, 4, 5, 6, 7, 8] as const).map(
    (n): ContrastRequirement => ({
      foreground: `color-chart-${n}`,
      background: 'color-surface-base',
      use: 'ui-component',
      note: `Chart series ${n} must be perceivable against the plot area.`,
    })
  ),
  {
    foreground: 'color-chart-label',
    background: 'color-surface-base',
    use: 'body-text',
    note: 'Axis labels are text.',
  },

  // AI.
  {
    foreground: 'color-ai-text',
    background: 'color-ai-surface',
    use: 'body-text',
    note: 'Machine-generated content must be as readable as any other content.',
  },
  {
    foreground: 'color-ai-border',
    background: 'color-surface-base',
    use: 'ui-component',
    note: 'The boundary marking AI content must be perceivable.',
  },
];

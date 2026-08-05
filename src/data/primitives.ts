/**
 * Sekura primitive (reference) tokens.
 *
 * Primitives are raw, context-free values. They carry no meaning: `sekura-cobalt-600`
 * says nothing about *where* it may be used. Product code must never reference a
 * primitive directly — it consumes the semantic layer in `semantic.ts`, which is what
 * re-points when the theme changes. Primitives exist so the semantic layer has a
 * disciplined, evenly-stepped set of values to point at.
 *
 * Ramp convention: 50 is the lightest tint, 950 the deepest shade. Steps are tuned so
 * that, against the ramp's own 50, step 600+ clears 4.5:1 and step 500+ clears 3:1.
 */

export type Ramp = Record<string, string>;

/**
 * Neutral — a cool, very slightly blue-cast grey. The blue cast keeps neutrals from
 * looking muddy beside Cobalt, and stops dark surfaces reading as brown.
 */
export const neutral: Ramp = {
  '0': '#ffffff',
  '50': '#f7f8fa',
  '100': '#eef0f4',
  '200': '#dfe3ea',
  '300': '#c5ccd8',
  // 400 and 500 are pinned by contrast, not by eye.
  //
  // 400 is the lightest grey still clearing 3:1 on white, so borders drawn with
  // it stay locatable (WCAG 1.4.11).
  //
  // 500 is the lightest clearing 4.5:1 on the *sunken* surface — the darkest
  // light-mode surface that carries text. It is squeezed from both sides: it is
  // also the dark-mode border colour, which needs to stay light enough for 3:1
  // against a dark card. #646e7f satisfies both with little headroom, so the
  // audit's tightest-pairings report exists to flag it if either side moves.
  '400': '#8590a3',
  '500': '#646e7f',
  '600': '#515b6b',
  '700': '#3c4553',
  '800': '#28303c',
  '850': '#20272f',
  '900': '#181e27',
  '950': '#0e131a',
  '975': '#090d12',
  '1000': '#000000',
};

/**
 * Cobalt — the Sekura brand hue. Primary actions, active navigation, selection,
 * brand surfaces. Deep and unsaturated enough to sit under long working sessions.
 */
export const cobalt: Ramp = {
  '50': '#eef3ff',
  '100': '#dde7ff',
  '200': '#c2d3ff',
  '300': '#9bb6ff',
  '400': '#7191fb',
  '500': '#4f6df1',
  '600': '#3a4fdd',
  '700': '#2f3cb8',
  '800': '#2b3593',
  '900': '#283274',
  '950': '#1a1f47',
};

/**
 * Aqua — the secondary/accent hue. Used for emphasis that is not a primary action:
 * highlights, active data ranges, "verified" states, decorative brand moments.
 */
export const aqua: Ramp = {
  '50': '#e8fbf7',
  '100': '#c5f5ec',
  '200': '#91e9dc',
  '300': '#55d5c7',
  '400': '#26bab0',
  '500': '#0d9a92',
  '600': '#057b76',
  '700': '#07625f',
  '800': '#0a4e4c',
  '900': '#0c4140',
  '950': '#022827',
};

/** Jade — success, healthy, applied, verified. */
export const jade: Ramp = {
  '50': '#eaf8ee',
  '100': '#cbeed7',
  '200': '#9bdcb3',
  '300': '#63c489',
  '400': '#34a765',
  '500': '#18894d',
  '600': '#0d6d3d',
  '700': '#0c5732',
  '800': '#0c462a',
  '900': '#0b3a24',
  '950': '#042013',
};

/** Amber — warning, degraded, needs attention but not failed. */
export const amber: Ramp = {
  '50': '#fff8e6',
  '100': '#ffecbf',
  '200': '#fdd77f',
  '300': '#f7bd3f',
  '400': '#e8a013',
  '500': '#c58006',
  '600': '#9e6408',
  '700': '#7e4e0c',
  '800': '#68400e',
  '900': '#57360f',
  '950': '#301d05',
};

/** Crimson — error, destructive, failed, blocked. */
export const crimson: Ramp = {
  '50': '#fdeeee',
  '100': '#fbdada',
  '200': '#f7b6b6',
  '300': '#f08a8a',
  '400': '#e35a5a',
  '500': '#cf3838',
  '600': '#b02626',
  '700': '#8e2020',
  '800': '#751e1e',
  '900': '#621d1d',
  '950': '#380c0c',
};

/** Azure — informational, neutral notice, help, "in progress". */
export const azure: Ramp = {
  '50': '#e9f4fe',
  '100': '#d0e8fd',
  '200': '#a5d2fb',
  '300': '#71b7f7',
  '400': '#3f97ed',
  '500': '#1f79d8',
  '600': '#1360b5',
  '700': '#124d90',
  '800': '#134276',
  '900': '#133862',
  '950': '#0b1f3a',
};

/** Violet — reserved for AI/automation affordances, so they never mimic user actions. */
export const violet: Ramp = {
  '50': '#f4f0ff',
  '100': '#e9e2ff',
  '200': '#d6c9ff',
  '300': '#bba5fb',
  '400': '#9e7ef4',
  '500': '#8259e6',
  '600': '#6b3fce',
  '700': '#5732a8',
  '800': '#482c88',
  '900': '#3d276e',
  '950': '#251643',
};

export const ramps: Record<string, Ramp> = {
  neutral,
  cobalt,
  aqua,
  jade,
  amber,
  crimson,
  azure,
  violet,
};

export const rampDescriptions: Record<string, string> = {
  neutral: 'Cool grey. Surfaces, text, borders, dividers, disabled states.',
  cobalt: 'Sekura brand hue. Primary actions, selection, active navigation, focus.',
  aqua: 'Secondary accent. Non-action emphasis, highlights, verified states.',
  jade: 'Success, healthy, applied.',
  amber: 'Warning, degraded, pending attention.',
  crimson: 'Error, destructive, failed.',
  azure: 'Informational notices and in-progress states.',
  violet: 'AI and automation affordances only. Never for ordinary user actions.',
};

/* ------------------------------------------------------------------ *
 * Alpha primitives
 *
 * Translucent values for overlays, scrims, hover washes and dividers that must
 * work over unknown backdrops. Kept separate because their contrast can only be
 * judged after compositing.
 * ------------------------------------------------------------------ */

export const alpha: Ramp = {
  'black-4': 'rgb(14 19 26 / 4%)',
  'black-8': 'rgb(14 19 26 / 8%)',
  'black-12': 'rgb(14 19 26 / 12%)',
  'black-24': 'rgb(14 19 26 / 24%)',
  'black-48': 'rgb(14 19 26 / 48%)',
  'black-64': 'rgb(14 19 26 / 64%)',
  'white-4': 'rgb(255 255 255 / 4%)',
  'white-8': 'rgb(255 255 255 / 8%)',
  'white-12': 'rgb(255 255 255 / 12%)',
  'white-24': 'rgb(255 255 255 / 24%)',
  'white-48': 'rgb(255 255 255 / 48%)',
  'white-64': 'rgb(255 255 255 / 64%)',
};

/* ------------------------------------------------------------------ *
 * Spacing
 *
 * 4px base grid. Token names are the pixel value at the 16px root, so `space-12`
 * is unambiguously 12px — no mental arithmetic from a t-shirt size.
 * ------------------------------------------------------------------ */

export const space: Record<string, string> = {
  '0': '0',
  '1': '0.0625rem',
  '2': '0.125rem',
  '4': '0.25rem',
  '6': '0.375rem',
  '8': '0.5rem',
  '10': '0.625rem',
  '12': '0.75rem',
  '16': '1rem',
  '20': '1.25rem',
  '24': '1.5rem',
  '28': '1.75rem',
  '32': '2rem',
  '40': '2.5rem',
  '48': '3rem',
  '56': '3.5rem',
  '64': '4rem',
  '80': '5rem',
  '96': '6rem',
  '128': '8rem',
};

/* ------------------------------------------------------------------ *
 * Typography
 * ------------------------------------------------------------------ */

export const fontFamily: Record<string, string> = {
  sans: "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
};

export const fontWeight: Record<string, string> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

/**
 * Type scale. Every entry is a complete set: size, line-height, weight, tracking.
 * `fluid` entries interpolate between a narrow-viewport and wide-viewport size using
 * clamp(), so there is no breakpoint jump mid-sentence.
 *
 * Tracking tightens as size grows — large text at default tracking looks loose.
 */
export interface TypeStyle {
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
  letterSpacing: string;
  fontFamily?: 'sans' | 'mono';
  textTransform?: string;
  description: string;
}

export const typeScale: Record<string, TypeStyle> = {
  'display-2xl': {
    fontSize: 'clamp(2.5rem, 1.6rem + 4.5vw, 4.5rem)',
    lineHeight: '1.05',
    fontWeight: '700',
    letterSpacing: '-0.03em',
    description: 'Marketing hero only. Never inside the product shell.',
  },
  'display-xl': {
    fontSize: 'clamp(2rem, 1.4rem + 3vw, 3.5rem)',
    lineHeight: '1.08',
    fontWeight: '700',
    letterSpacing: '-0.025em',
    description: 'Landing page section opener.',
  },
  'display-lg': {
    fontSize: 'clamp(1.75rem, 1.3rem + 2.2vw, 2.75rem)',
    lineHeight: '1.15',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    description: 'Large editorial heading, empty-state hero.',
  },
  'heading-xl': {
    fontSize: 'clamp(1.5rem, 1.28rem + 1.1vw, 2rem)',
    lineHeight: '1.2',
    fontWeight: '700',
    letterSpacing: '-0.018em',
    description: 'Page title. One per page, mapped to <h1>.',
  },
  'heading-lg': {
    fontSize: 'clamp(1.25rem, 1.14rem + 0.55vw, 1.5rem)',
    lineHeight: '1.25',
    fontWeight: '650',
    letterSpacing: '-0.014em',
    description: 'Major section heading.',
  },
  'heading-md': {
    fontSize: '1.25rem',
    lineHeight: '1.4',
    fontWeight: '600',
    letterSpacing: '-0.01em',
    description: 'Subsection heading, dialog title, card title.',
  },
  'heading-sm': {
    fontSize: '1rem',
    lineHeight: '1.5',
    fontWeight: '600',
    letterSpacing: '-0.006em',
    description: 'Dense heading, panel title, table group header.',
  },
  'heading-xs': {
    fontSize: '0.875rem',
    lineHeight: '1.43',
    fontWeight: '600',
    letterSpacing: '0',
    description: 'Smallest heading. Field group label, list section header.',
  },
  'body-lg': {
    fontSize: '1.125rem',
    lineHeight: '1.65',
    fontWeight: '400',
    letterSpacing: '0',
    description: 'Lead paragraph directly under a page title.',
  },
  'body-md': {
    fontSize: '1rem',
    lineHeight: '1.6',
    fontWeight: '400',
    letterSpacing: '0',
    description: 'Default body text. The baseline for the whole system.',
  },
  'body-sm': {
    fontSize: '0.875rem',
    lineHeight: '1.5',
    fontWeight: '400',
    letterSpacing: '0.002em',
    description: 'Dense UI text, table cells, secondary description.',
  },
  'body-xs': {
    fontSize: '0.8125rem',
    lineHeight: '1.4',
    fontWeight: '400',
    letterSpacing: '0.005em',
    description: 'Metadata, timestamps, help text. Never for sustained reading.',
  },
  'label-md': {
    fontSize: '0.875rem',
    lineHeight: '1.3',
    fontWeight: '500',
    letterSpacing: '0.002em',
    description: 'Form labels, button text, tab labels.',
  },
  'label-sm': {
    fontSize: '0.8125rem',
    lineHeight: '1.25',
    fontWeight: '500',
    letterSpacing: '0.005em',
    description: 'Badge text, compact control labels.',
  },
  overline: {
    fontSize: '0.75rem',
    lineHeight: '1.33',
    fontWeight: '600',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    description:
      'Eyebrow above a heading, or a table group divider. Never a sentence.',
  },
  'code-md': {
    fontSize: '0.875rem',
    lineHeight: '1.6',
    fontWeight: '400',
    letterSpacing: '0',
    fontFamily: 'mono',
    description: 'Code blocks, identifiers, hostnames, keys, hashes.',
  },
  'code-sm': {
    fontSize: '0.8125rem',
    lineHeight: '1.5',
    fontWeight: '400',
    letterSpacing: '0',
    fontFamily: 'mono',
    description: 'Inline code inside body-sm, monospace table columns.',
  },
};

/* ------------------------------------------------------------------ *
 * Radius, borders, opacity
 * ------------------------------------------------------------------ */

export const radius: Record<string, string> = {
  none: '0',
  xs: '0.125rem',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
};

export const borderWidth: Record<string, string> = {
  '0': '0',
  hairline: '1px',
  thin: '1.5px',
  thick: '2px',
  heavy: '3px',
  accent: '4px',
};

export const opacity: Record<string, string> = {
  '0': '0',
  disabled: '0.45',
  muted: '0.65',
  '80': '0.8',
  '100': '1',
};

/* ------------------------------------------------------------------ *
 * Elevation
 *
 * Six levels. Shadows are theme-dependent: in dark mode a drop shadow is nearly
 * invisible, so elevation is additionally carried by surface lightness. Every
 * elevated component therefore pairs a shadow token with a surface token.
 * ------------------------------------------------------------------ */

export interface ElevationLevel {
  light: string;
  dark: string;
  surface: string;
  usage: string;
}

export const elevation: Record<string, ElevationLevel> = {
  '0': {
    light: 'none',
    dark: 'none',
    surface: 'surface-base',
    usage: 'Flush with the page. Default for content regions.',
  },
  '1': {
    light: '0 1px 2px 0 rgb(14 19 26 / 6%), 0 1px 3px 0 rgb(14 19 26 / 8%)',
    dark: '0 1px 2px 0 rgb(0 0 0 / 40%), 0 1px 3px 0 rgb(0 0 0 / 32%)',
    surface: 'surface-raised',
    usage: 'Cards, table containers, resting input wells.',
  },
  '2': {
    light: '0 2px 4px -1px rgb(14 19 26 / 8%), 0 4px 8px -2px rgb(14 19 26 / 8%)',
    dark: '0 2px 4px -1px rgb(0 0 0 / 48%), 0 4px 8px -2px rgb(0 0 0 / 40%)',
    surface: 'surface-raised',
    usage: 'Hovered card, sticky table header, segmented control.',
  },
  '3': {
    light: '0 4px 8px -2px rgb(14 19 26 / 10%), 0 8px 16px -4px rgb(14 19 26 / 10%)',
    dark: '0 4px 8px -2px rgb(0 0 0 / 52%), 0 8px 16px -4px rgb(0 0 0 / 44%)',
    surface: 'surface-overlay',
    usage: 'Dropdown menus, popovers, comboboxes, date pickers.',
  },
  '4': {
    light: '0 8px 16px -4px rgb(14 19 26 / 12%), 0 16px 32px -8px rgb(14 19 26 / 12%)',
    dark: '0 8px 16px -4px rgb(0 0 0 / 56%), 0 16px 32px -8px rgb(0 0 0 / 48%)',
    surface: 'surface-overlay',
    usage: 'Modal dialogs, drawers, command palette.',
  },
  '5': {
    light: '0 16px 32px -8px rgb(14 19 26 / 16%), 0 32px 64px -16px rgb(14 19 26 / 14%)',
    dark: '0 16px 32px -8px rgb(0 0 0 / 60%), 0 32px 64px -16px rgb(0 0 0 / 52%)',
    surface: 'surface-overlay',
    usage: 'Toasts and transient notifications that float above everything.',
  },
};

/* ------------------------------------------------------------------ *
 * Motion
 * ------------------------------------------------------------------ */

export const duration: Record<string, string> = {
  instant: '0ms',
  fast: '120ms',
  normal: '200ms',
  slow: '320ms',
  slower: '480ms',
  deliberate: '640ms',
};

export const easing: Record<string, string> = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  entrance: 'cubic-bezier(0, 0, 0, 1)',
  exit: 'cubic-bezier(0.3, 0, 1, 1)',
  emphasised: 'cubic-bezier(0.3, 0, 0, 1.2)',
  linear: 'linear',
};

export const motionUsage: Record<string, string> = {
  instant: 'State changes that must feel like a direct manipulation result.',
  fast: 'Hover, focus, checkbox and switch toggles, tooltip open.',
  normal: 'Menus, popovers, accordions, tab panel swaps, toasts.',
  slow: 'Dialogs, drawers, page-level transitions.',
  slower: 'Large surface reveals, onboarding sequences.',
  deliberate:
    'Progress and skeleton loops only. Never blocks a user-initiated action.',
};

/* ------------------------------------------------------------------ *
 * Layering
 *
 * A single ordered scale. Nothing in the system may invent a z-index outside it;
 * arbitrary values are how stacking bugs start.
 * ------------------------------------------------------------------ */

export const zIndex: Record<string, string> = {
  below: '-1',
  base: '0',
  raised: '10',
  sticky: '100',
  header: '200',
  drawer: '300',
  overlay: '400',
  dialog: '500',
  popover: '600',
  toast: '700',
  tooltip: '800',
  skipLink: '900',
  debug: '1000',
};

/* ------------------------------------------------------------------ *
 * Breakpoints and layout
 * ------------------------------------------------------------------ */

export interface Breakpoint {
  min: string;
  px: number;
  columns: number;
  gutter: string;
  margin: string;
  description: string;
}

export const breakpoints: Record<string, Breakpoint> = {
  xs: {
    min: '0',
    px: 0,
    columns: 4,
    gutter: '1rem',
    margin: '1rem',
    description: 'Phone portrait. Single column, stacked, no side navigation.',
  },
  sm: {
    min: '30rem',
    px: 480,
    columns: 4,
    gutter: '1rem',
    margin: '1.5rem',
    description: 'Large phone. Still single column; more breathing room.',
  },
  md: {
    min: '48rem',
    px: 768,
    columns: 8,
    gutter: '1.5rem',
    margin: '2rem',
    description:
      'Tablet portrait. Two-column content becomes viable; navigation still collapsed.',
  },
  lg: {
    min: '64rem',
    px: 1024,
    columns: 12,
    gutter: '1.5rem',
    margin: '2rem',
    description:
      'Laptop. Persistent side navigation appears. The primary product breakpoint.',
  },
  xl: {
    min: '80rem',
    px: 1280,
    columns: 12,
    gutter: '2rem',
    margin: '2.5rem',
    description: 'Desktop. Detail panels can sit beside content.',
  },
  '2xl': {
    min: '96rem',
    px: 1536,
    columns: 12,
    gutter: '2rem',
    margin: '3rem',
    description: 'Wide desktop. Content is capped; margins absorb the surplus.',
  },
};

export const containerWidth: Record<string, string> = {
  xs: '30rem',
  sm: '40rem',
  md: '48rem',
  prose: '68ch',
  lg: '64rem',
  xl: '80rem',
  '2xl': '90rem',
  full: '100%',
};

/**
 * Density modes. Density changes control padding and row height only. It never
 * changes font size below `body-sm`, and never shrinks a hit target below 24x24 CSS
 * px (WCAG 2.2 SC 2.5.8 Target Size (Minimum)).
 */
export interface Density {
  controlHeightSm: string;
  controlHeightMd: string;
  controlHeightLg: string;
  controlPaddingInline: string;
  controlPaddingBlock: string;
  rowPaddingBlock: string;
  stackGap: string;
  sectionGap: string;
  description: string;
}

export const densities: Record<string, Density> = {
  comfortable: {
    controlHeightSm: '2rem',
    controlHeightMd: '2.5rem',
    controlHeightLg: '3rem',
    controlPaddingInline: '1rem',
    controlPaddingBlock: '0.5rem',
    rowPaddingBlock: '0.75rem',
    stackGap: '1rem',
    sectionGap: '2rem',
    description:
      'Default. Suits mixed-ability audiences, touch input and marketing surfaces.',
  },
  compact: {
    controlHeightSm: '1.75rem',
    controlHeightMd: '2.25rem',
    controlHeightLg: '2.75rem',
    controlPaddingInline: '0.75rem',
    controlPaddingBlock: '0.375rem',
    rowPaddingBlock: '0.5rem',
    stackGap: '0.75rem',
    sectionGap: '1.5rem',
    description:
      'Operator consoles and admin tools where more rows on screen is worth the tighter rhythm.',
  },
  dense: {
    controlHeightSm: '1.5rem',
    controlHeightMd: '2rem',
    controlHeightLg: '2.5rem',
    controlPaddingInline: '0.5rem',
    controlPaddingBlock: '0.25rem',
    rowPaddingBlock: '0.25rem',
    stackGap: '0.5rem',
    sectionGap: '1rem',
    description:
      'Data grids and log views only. Requires an escape hatch back to comfortable, and must never be the default for a first-time user.',
  },
};

/**
 * Focus ring. A single, unmistakable treatment used everywhere. It is two-tone so it
 * survives on both light and dark surfaces and against brand-coloured buttons.
 */
export const focusRing: Record<string, string> = {
  width: '2px',
  offset: '2px',
  style: 'solid',
};

/** CSS names shared by emission, discovery and validation. */
import {
  alpha, borderWidth, breakpoints, containerWidth, densities, duration, easing,
  elevation, focusRing, fontFamily, fontWeight, layout, opacity, radius, ramps,
  space, typeScale, zIndex,
} from '../data/primitives.js';
import { semanticTokens } from '../data/tokens.js';

export function scaleEntries(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [prefix, scale] of Object.entries({
    space, radius, 'border-width': borderWidth, opacity, z: zIndex, duration,
    easing, 'font-family': fontFamily, 'font-weight': fontWeight, layout,
    container: containerWidth,
  })) for (const [key, value] of Object.entries(scale)) out.push([`${prefix}-${key}`, value]);
  for (const [key, value] of Object.entries(typeScale)) {
    out.push([`font-size-${key}`, value.fontSize], [`line-height-${key}`, value.lineHeight],
      [`font-weight-${key}`, value.fontWeight], [`letter-spacing-${key}`, value.letterSpacing]);
  }
  out.push(['focus-ring-width', focusRing.width!], ['focus-ring-offset', focusRing.offset!]);
  for (const [key, value] of Object.entries(breakpoints)) out.push([`breakpoint-${key}`, value.min]);
  return out;
}

export function densityEntries(density: typeof densities[string]): Array<[string, string]> {
  return [
    ['control-height-sm', density.controlHeightSm], ['control-height-md', density.controlHeightMd],
    ['control-height-lg', density.controlHeightLg], ['control-padding-inline', density.controlPaddingInline],
    ['control-padding-block', density.controlPaddingBlock], ['row-padding-block', density.rowPaddingBlock],
    ['cell-padding-inline', density.cellPaddingInline], ['stack-gap', density.stackGap],
    ['section-gap', density.sectionGap],
  ];
}

/** Names are case-sensitive, just like CSS custom properties. */
export const tokenNames = new Set<string>([
  ...semanticTokens.map(token => token.name),
  ...scaleEntries().map(([name]) => name),
  ...Object.values(densities).flatMap(density => densityEntries(density).map(([name]) => name)),
  ...Object.keys(elevation).map(key => `elevation-${key}`),
  ...Object.entries(ramps).flatMap(([ramp, values]) => Object.keys(values).map(key => `palette-${ramp}-${key}`)),
  ...Object.keys(alpha).map(key => `palette-alpha-${key}`),
]);

/** Component-scoped parameters; defaults live in their owning CSS/controller. */
export const componentVariableNames = new Set([
  'grid-min', 'grid-gap', 'cluster-gap', 'sidebar-width', 'content-min',
  'slider-progress', 'slider-direction', 'control-size', 'dir-scale',
  'layout-content-header-offset',
]);

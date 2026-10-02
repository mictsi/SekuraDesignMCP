/** Optional migration bridge: preserve v2 geometry while adopting the v3 palette.
 * Use data-sk-geometry="v2" on the application root. Not a second theme.
 */
export function legacyGeometryCss(): string {
  const modes = {
    comfortable: ['2rem', '2.5rem', '3rem', '1rem'],
    compact: ['1.75rem', '2.25rem', '2.75rem', '0.75rem'],
    dense: ['1.5rem', '2rem', '2.5rem', '0.5rem'],
  };
  return `/* Opt-in geometry bridge for incremental v2 migrations. */
[data-sk-geometry="v2"] {
  --sk-layout-header-height: 3.5rem;
  --sk-layout-nav-width: 16rem;
  --sk-layout-detail-width: 28rem;
  --sk-container-prose: 68ch;
  --sk-font-size-body-xs: 0.8125rem;
  --sk-line-height-body-xs: 1.4;
  --sk-line-height-body-md: 1.6;
  --sk-line-height-body-sm: 1.5;
  --sk-font-size-heading-xl: clamp(1.5rem, 1.28rem + 1.1vw, 2rem);
  --sk-line-height-heading-xl: 1.2;
}
${Object.entries(modes).map(([mode, [sm, md, lg, padding]]) => {
  const selector = `[data-sk-geometry="v2"][data-sk-density="${mode}"], [data-sk-geometry="v2"] [data-sk-density="${mode}"]`;
  return `${mode === 'comfortable' ? '[data-sk-geometry="v2"], ' : ''}${selector} {
  --sk-control-height-sm: ${sm};
  --sk-control-height-md: ${md};
  --sk-control-height-lg: ${lg};
  --sk-control-padding-inline: ${padding};
}`;
}).join('\n')}`;
}

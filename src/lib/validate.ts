/**
 * Markup linting against the Sekura specification.
 *
 * This is a pragmatic regex-and-heuristic linter, not a DOM-accurate one. It is
 * tuned to catch the failures that actually ship: icon buttons with no accessible
 * name, inputs with no label, colour used as the only signal, hard-coded hex values
 * that will break in dark mode, and flex containers that will overflow.
 *
 * Findings are advisory. A `no findings` result is not a certificate of
 * accessibility — it means none of the checked patterns matched.
 */

import { components, getComponent } from '../data/components/index.js';
import { semanticTokens } from '../data/tokens.js';

export type Severity = 'error' | 'warning' | 'info';

export interface Finding {
  severity: Severity;
  rule: string;
  message: string;
  /** The offending snippet, truncated. */
  snippet?: string;
  /** What to do instead. */
  fix: string;
  wcag?: string;
}

const tokenNames = new Set(semanticTokens.map((t) => t.name));

function snip(s: string, max = 120): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/** Does this element have any plausible accessible name? */
function hasAccessibleName(tag: string, inner: string): boolean {
  if (/\baria-label\s*=\s*["'][^"']+["']/i.test(tag)) return true;
  if (/\baria-labelledby\s*=\s*["'][^"']+["']/i.test(tag)) return true;
  if (/\btitle\s*=\s*["'][^"']+["']/i.test(tag)) return true;
  // Visible text that is not only an svg/icon.
  const text = inner.replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<[^>]+>/g, '').trim();
  if (text.length > 0) return true;
  // A visually hidden span counts, and is the preferred technique.
  if (/class\s*=\s*["'][^"']*sk-visually-hidden/i.test(inner)) return true;
  return false;
}

export function validateMarkup(html: string, componentId?: string): Finding[] {
  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  /* ---------------- Accessible names ---------------- */

  // Buttons whose only content is an icon.
  const buttonRe = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let m: RegExpExecArray | null;
  while ((m = buttonRe.exec(html)) !== null) {
    const [full, attrs = '', inner = ''] = m;
    if (!hasAccessibleName(attrs, inner)) {
      add({
        severity: 'error',
        rule: 'button-accessible-name',
        message:
          'A <button> has no accessible name. Its content is an icon or empty, so screen reader and voice control users cannot identify or invoke it.',
        snippet: snip(full),
        fix: 'Add a visually hidden label inside the button: <span class="sk-visually-hidden">Delete project</span>. Prefer this over aria-label — it survives translation pipelines that skip attributes.',
        wcag: '4.1.2 Name, Role, Value; 1.1.1 Non-text Content',
      });
    }
  }

  // Links with no name, or href="#".
  const linkRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  while ((m = linkRe.exec(html)) !== null) {
    const [full, attrs = '', inner = ''] = m;
    if (!hasAccessibleName(attrs, inner)) {
      add({
        severity: 'error',
        rule: 'link-accessible-name',
        message: 'A link has no accessible name.',
        snippet: snip(full),
        fix: 'Give the link text describing its destination, or a visually hidden label.',
        wcag: '2.4.4 Link Purpose (In Context)',
      });
    }
    if (/\bhref\s*=\s*["']#["']/.test(attrs)) {
      add({
        severity: 'error',
        rule: 'link-as-button',
        message:
          'A link with href="#" is being used as a button. It navigates nowhere, breaks middle-click and open-in-new-tab, and is announced as a link.',
        snippet: snip(full),
        fix: 'Use <button type="button"> for actions. Reserve <a href> for real destinations.',
        wcag: '4.1.2 Name, Role, Value',
      });
    }
    if (/target\s*=\s*["']_blank["']/i.test(attrs) && !/opens in a new tab/i.test(inner)) {
      add({
        severity: 'warning',
        rule: 'new-tab-unannounced',
        message: 'A link opens in a new tab without warning the user.',
        snippet: snip(full),
        fix: 'Add <span class="sk-visually-hidden">(opens in a new tab)</span> inside the link.',
        wcag: '3.2.5 Change on Request',
      });
    }
    if (/^\s*(click here|here|read more|more|learn more)\s*$/i.test(inner.replace(/<[^>]+>/g, ''))) {
      add({
        severity: 'warning',
        rule: 'vague-link-text',
        message:
          'Link text is not meaningful out of context. Screen reader users often list all links on a page, stripped of their surrounding sentence.',
        snippet: snip(full),
        fix: 'Describe the destination: "Task field reference" rather than "read more".',
        wcag: '2.4.4 Link Purpose (In Context)',
      });
    }
  }

  /* ---------------- Form labelling ---------------- */

  const inputRe = /<(input|select|textarea)\b([^>]*)>/gi;
  while ((m = inputRe.exec(html)) !== null) {
    const [full, tag = '', attrs = ''] = m;
    const typeMatch = /\btype\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const type = typeMatch?.[1]?.toLowerCase() ?? 'text';
    if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) continue;

    const id = /\bid\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];

    // Wrapping the control in a <label> is a valid association — and a more
    // robust one than for/id, since it cannot be broken by an id collision.
    // Checking only for `for=` produces false positives on exactly the markup
    // this design system recommends.
    const before = html.slice(0, m.index);
    const lastLabelOpen = before.lastIndexOf('<label');
    const lastLabelClose = before.lastIndexOf('</label>');
    const insideLabel = lastLabelOpen !== -1 && lastLabelOpen > lastLabelClose;

    const labelled =
      insideLabel ||
      /\baria-label\s*=/i.test(attrs) ||
      /\baria-labelledby\s*=/i.test(attrs) ||
      (id && new RegExp(`<label[^>]*\\bfor\\s*=\\s*["']${id}["']`, 'i').test(html));

    if (!labelled) {
      add({
        severity: 'error',
        rule: 'input-missing-label',
        message: `A <${tag}> has no associated label.`,
        snippet: snip(full),
        fix: id
          ? `Add <label class="sk-field__label" for="${id}">…</label>, or wrap the control in a label.`
          : 'Give the control an id and associate a <label for>. A placeholder is not a label.',
        wcag: '1.3.1 Info and Relationships; 3.3.2 Labels or Instructions',
      });
    }

    if (/\bplaceholder\s*=/i.test(attrs) && !labelled) {
      add({
        severity: 'error',
        rule: 'placeholder-as-label',
        message:
          'A placeholder is being used as the only label. It disappears as soon as the user types, exactly when they need to check what they are filling in.',
        snippet: snip(full),
        fix: 'Add a persistent visible <label>. Keep the placeholder for an example value only.',
        wcag: '3.3.2 Labels or Instructions',
      });
    }

    // Autocomplete on personal-information fields.
    const personal = /\bname\s*=\s*["'](email|name|tel|phone|address|postal|zip|country|username|given|family|cc-|organi[sz]ation)/i;
    if (personal.test(attrs) && !/\bautocomplete\s*=/i.test(attrs)) {
      add({
        severity: 'warning',
        rule: 'missing-autocomplete',
        message: 'A field collecting information about the user has no autocomplete token.',
        snippet: snip(full),
        fix: 'Add the appropriate autocomplete value, e.g. autocomplete="email". This is a WCAG requirement, not an optimisation.',
        wcag: '1.3.5 Identify Input Purpose',
      });
    }

    if (type === 'number') {
      add({
        severity: 'info',
        rule: 'number-input',
        message:
          'type="number" adds a spinner and scroll-wheel behaviour that cause accidental edits, and silently rejects leading zeros.',
        snippet: snip(full),
        fix: 'For identifiers that merely look numeric (postcodes, account numbers), use type="text" inputmode="numeric" pattern="[0-9]*".',
      });
    }
  }

  /* ---------------- Grouping ---------------- */

  const radios = html.match(/<input\b[^>]*type\s*=\s*["']radio["'][^>]*>/gi) ?? [];
  if (radios.length > 1 && !/<fieldset/i.test(html)) {
    add({
      severity: 'error',
      rule: 'radio-group-no-fieldset',
      message:
        'Several radio buttons are present with no <fieldset> and <legend>. A screen reader user hears unrelated options with no idea what question they answer.',
      fix: 'Wrap the group in <fieldset class="sk-fieldset"> with a <legend> stating the question.',
      wcag: '1.3.1 Info and Relationships',
    });
  }
  if (radios.length === 1) {
    add({
      severity: 'warning',
      rule: 'lone-radio',
      message: 'A single radio button cannot be deselected once chosen.',
      fix: 'Use a checkbox for an independent binary choice, or add the other options.',
    });
  }

  /* ---------------- Structure ---------------- */

  const h1s = html.match(/<h1\b/gi) ?? [];
  if (h1s.length > 1) {
    add({
      severity: 'warning',
      rule: 'multiple-h1',
      message: `${h1s.length} <h1> elements found. The page outline becomes ambiguous.`,
      fix: 'Use exactly one <h1>, in the page header, matching the document title.',
      wcag: '1.3.1 Info and Relationships; 2.4.6 Headings and Labels',
    });
  }

  const imgRe = /<img\b([^>]*)>/gi;
  while ((m = imgRe.exec(html)) !== null) {
    const [full, attrs = ''] = m;
    if (!/\balt\s*=/i.test(attrs)) {
      add({
        severity: 'error',
        rule: 'img-missing-alt',
        message: 'An <img> has no alt attribute. Screen readers fall back to announcing the file name.',
        snippet: snip(full),
        fix: 'Add alt="" for decorative images, or descriptive alt text for meaningful ones.',
        wcag: '1.1.1 Non-text Content',
      });
    }
  }

  const svgRe = /<svg\b([^>]*)>/gi;
  while ((m = svgRe.exec(html)) !== null) {
    const [full, attrs = ''] = m;
    if (!/\baria-hidden\s*=\s*["']true["']/i.test(attrs) && !/\brole\s*=\s*["']img["']/i.test(attrs)) {
      add({
        severity: 'warning',
        rule: 'svg-not-hidden',
        message:
          'A decorative <svg> is not hidden from assistive technology, so it may be announced as an unlabelled graphic.',
        snippet: snip(full),
        fix: 'Add aria-hidden="true" focusable="false" to decorative icons, or role="img" with a <title> for meaningful ones.',
        wcag: '1.1.1 Non-text Content',
      });
    }
  }

  /* ---------------- Interaction semantics ---------------- */

  const clickableDiv = /<(div|span)\b[^>]*\bonclick\b[^>]*>/gi;
  while ((m = clickableDiv.exec(html)) !== null) {
    add({
      severity: 'error',
      rule: 'non-semantic-interactive',
      message:
        'A <div> or <span> has a click handler. It is not focusable, not announced as a control, and does not respond to Enter or Space.',
      snippet: snip(m[0]!),
      fix: 'Use <button type="button">. If you genuinely cannot, add role="button", tabindex="0" and keyboard handlers for Enter and Space — but use a button.',
      wcag: '2.1.1 Keyboard; 4.1.2 Name, Role, Value',
    });
  }

  if (/\btabindex\s*=\s*["']([1-9]\d*)["']/i.test(html)) {
    add({
      severity: 'error',
      rule: 'positive-tabindex',
      message:
        'A positive tabindex overrides the natural tab order for the whole page, which almost always produces a confusing focus sequence.',
      fix: 'Use tabindex="0" to make something focusable and tabindex="-1" for programmatic focus targets. Fix the DOM order instead.',
      wcag: '2.4.3 Focus Order',
    });
  }

  if (/outline\s*:\s*(none|0)/i.test(html) && !/:focus-visible/i.test(html)) {
    add({
      severity: 'error',
      rule: 'focus-outline-removed',
      message: 'The focus outline is removed with no replacement indicator.',
      fix: 'Never remove the outline without providing a visible focus-visible style. Sekura supplies one globally.',
      wcag: '2.4.7 Focus Visible; 2.4.13 Focus Appearance',
    });
  }

  /* ---------------- Colour and tokens ---------------- */

  const hexRe = /(?:color|background|background-color|border-color|fill|stroke)\s*:\s*(#[0-9a-f]{3,8})/gi;
  const seenHex = new Set<string>();
  while ((m = hexRe.exec(html)) !== null) {
    const hex = m[1]!.toLowerCase();
    if (seenHex.has(hex)) continue;
    seenHex.add(hex);
    add({
      severity: 'error',
      rule: 'hard-coded-color',
      message: `Hard-coded colour ${hex}. It will not change when the theme does, so this element will be wrong in dark mode.`,
      snippet: snip(m[0]!),
      fix: 'Use a semantic token: var(--sk-color-text-primary), var(--sk-color-surface-raised), and so on. Call suggest_token if you are unsure which.',
      wcag: '1.4.3 Contrast (Minimum)',
    });
  }

  const varRe = /var\(\s*(--sk-[a-z0-9-]+)/gi;
  while ((m = varRe.exec(html)) !== null) {
    const name = m[1]!.replace(/^--sk-/, '');
    const isScale = /^(space|radius|border-width|opacity|z|duration|easing|font|line-height|letter-spacing|container|elevation|control|stack|section|focus-ring|breakpoint|palette|grid|sidebar|cluster)-/.test(name);
    if (!tokenNames.has(name) && !isScale) {
      add({
        severity: 'warning',
        rule: 'unknown-token',
        message: `--sk-${name} is not a Sekura token. It will resolve to nothing and the property will fall back or be dropped.`,
        fix: 'Check the name with list_tokens, or supply a fallback value as the second argument to var().',
      });
    }
  }

  if (/--sk-palette-/.test(html)) {
    add({
      severity: 'warning',
      rule: 'primitive-token-used',
      message:
        'A primitive palette token is referenced directly. Primitives do not change between themes, so this element will not adapt to dark mode.',
      fix: 'Reference a semantic token instead. Primitives exist only for building new semantic tokens.',
    });
  }

  /* ---------------- Flex and reflow ---------------- */

  if (/display\s*:\s*flex/i.test(html)) {
    const flexBlocks = html.match(/\{[^}]*display\s*:\s*flex[^}]*\}/gi) ?? [];
    for (const block of flexBlocks) {
      if (!/flex-wrap/i.test(block) && !/flex-direction\s*:\s*column/i.test(block)) {
        add({
          severity: 'warning',
          rule: 'flex-row-no-wrap',
          message:
            'A horizontal flex container does not declare flex-wrap. When its contents exceed the available width it will overflow rather than wrap, producing a horizontal scrollbar.',
          snippet: snip(block),
          fix: 'Add flex-wrap: wrap, or use the Cluster primitive which sets it. If nowrap is intentional, pair it with an explicit overflow strategy.',
          wcag: '1.4.10 Reflow',
        });
      }
    }
  }

  if (/(overflow|text-overflow)\s*:\s*(hidden|ellipsis)/i.test(html) && !/min-inline-size\s*:\s*0|min-width\s*:\s*0/i.test(html)) {
    add({
      severity: 'warning',
      rule: 'truncation-without-min-size',
      message:
        'Truncation is applied without min-inline-size: 0. A flex item defaults to min-width: auto and refuses to shrink below its content, so the ellipsis never appears and the container overflows instead.',
      fix: 'Add min-inline-size: 0 to the truncating flex item, or use the .sk-truncate utility which includes it.',
      wcag: '1.4.10 Reflow',
    });
  }

  const fixedPx = /(?:width|min-width|inline-size|min-inline-size)\s*:\s*(\d{3,})px/gi;
  while ((m = fixedPx.exec(html)) !== null) {
    const px = parseInt(m[1]!, 10);
    if (px > 320) {
      add({
        severity: 'warning',
        rule: 'fixed-width-breaks-reflow',
        message: `A fixed width of ${px}px will overflow a 320px viewport and will not respond to its container.`,
        snippet: snip(m[0]!),
        fix: 'Use flex-basis for an ideal width, or max-inline-size with a percentage or min() so the element can shrink.',
        wcag: '1.4.10 Reflow',
      });
    }
  }

  /* ---------------- Live regions and motion ---------------- */

  if (/role\s*=\s*["']alert["']/i.test(html) && /(success|saved|complete|created)/i.test(html)) {
    add({
      severity: 'warning',
      rule: 'assertive-for-success',
      message:
        'role="alert" interrupts the user immediately. Using it for a success message makes the product hostile to screen reader users.',
      fix: 'Use role="status" (polite) for confirmations. Reserve role="alert" for genuine failures.',
      wcag: '4.1.3 Status Messages',
    });
  }

  if (/animation\s*:/i.test(html) && !/prefers-reduced-motion/i.test(html)) {
    add({
      severity: 'warning',
      rule: 'animation-without-reduced-motion',
      message: 'An animation is declared with no prefers-reduced-motion guard.',
      fix: 'Wrap it in @media (prefers-reduced-motion: no-preference), or reduce it under @media (prefers-reduced-motion: reduce). Sekura reduces durations globally, but keyframe animations still need attention.',
      wcag: '2.3.3 Animation from Interactions',
    });
  }

  /* ---------------- Component-specific ---------------- */

  if (componentId) {
    const spec = getComponent(componentId);
    if (!spec) {
      add({
        severity: 'info',
        rule: 'unknown-component',
        message: `"${componentId}" is not a Sekura component. Known ids: ${components.map((c) => c.id).join(', ')}.`,
        fix: 'Call list_components for the full catalogue.',
      });
    } else {
      const expected = `sk-${spec.id}`;
      if (!html.includes(expected) && spec.category !== 'layout') {
        add({
          severity: 'info',
          rule: 'component-class-missing',
          message: `The markup does not use the .${expected} class, so it will not pick up the component's styles.`,
          fix: `Apply class="${expected}" to the component root, or call get_component_code for reference markup.`,
        });
      }
      // Surface the spec's own "don't" list as advisory context.
      for (const dont of spec.donts) {
        void dont; // Reported through get_component rather than duplicated per lint run.
      }
    }
  }

  // Deduplicate identical rule+snippet pairs.
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.rule}|${f.snippet ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function summariseFindings(findings: Finding[]): string {
  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;
  const infos = findings.filter((f) => f.severity === 'info').length;
  if (findings.length === 0) {
    return 'No issues matched the checked patterns. This is not a certificate of accessibility — automated checks catch roughly a third of real barriers. Manual keyboard and screen-reader testing is still required.';
  }
  return `${errors} error(s), ${warnings} warning(s), ${infos} note(s).`;
}

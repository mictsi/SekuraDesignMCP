/**
 * Bounded static markup checks. This does not compute a browser accessibility
 * tree: external CSS, generated content and runtime state require browser tests.
 */
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { components, getComponent } from '../data/components/index.js';
import { componentVariableNames, tokenNames } from './token-registry.js';

export type Severity = 'error' | 'warning' | 'info';
export interface Finding {
  severity: Severity;
  rule: string;
  message: string;
  snippet?: string;
  fix: string;
  wcag?: string;
}

export const MARKUP_LIMITS = { codeUnits: 524288, nodes: 20000, depth: 128, nameVisits: 100000 } as const;
export const MARKUP_CHECK_SCOPE = {
  checked: ['Parsed label/ID associations', 'Static accessible names for links, buttons and form controls', 'Default application identity in UI labels', 'Inline/HTML hidden content', 'Token names and the documented structural/CSS patterns'],
  skipped: ['External stylesheet visibility', 'Pseudo-element content', 'Runtime state and shadow DOM', 'Full accessible-name computation', 'Keyboard and screen-reader behavior'],
};
class ValidationLimit extends Error {}
type Element = DefaultTreeAdapterMap['element'];
type Node = DefaultTreeAdapterMap['node'];
function attr(node: Element, name: string): string | undefined { return node.attrs.find(a => a.name === name)?.value; }
function snip(s: string, max = 120): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}
function limitFinding(message: string): Finding {
  return { severity: 'error', rule: 'validation-limit', message: `Validation was not completed: ${message}`,
    fix: `Check a smaller fragment (at most ${MARKUP_LIMITS.codeUnits} UTF-16 code units, ${MARKUP_LIMITS.nodes} nodes and ${MARKUP_LIMITS.depth} levels). No clean-result claim is made.` };
}

export function validateMarkup(html: string, componentId?: string): Finding[] {
  if (html.length > MARKUP_LIMITS.codeUnits) return [limitFinding('the input size limit was exceeded.')];
  try { return validateWithinBudget(html, componentId); }
  catch (error) {
    if (error instanceof ValidationLimit) return [limitFinding(error.message)];
    throw error;
  }
}

function validateWithinBudget(html: string, componentId?: string): Finding[] {
  const findings: Finding[] = [];
  const add = (finding: Finding): void => {
    if (findings.length >= 1000) throw new ValidationLimit('the finding limit was exceeded.');
    findings.push(finding);
  };
  const root = parseFragment(html, { sourceCodeLocationInfo: true });
  const elements: Element[] = [];
  const byId = new Map<string, Element>();
  const labels = new Map<string, Element[]>();
  type Field = { control?: number; hints: Array<{ offset: number; html: string }> };
  const fields: Field[] = [];
  const pending: Array<{ node: Node; depth: number; field?: Field }> = [{ node: root, depth: 0 }];
  let count = 0;
  while (pending.length) {
    let { node, depth, field } = pending.pop()!;
    if (++count > MARKUP_LIMITS.nodes || depth > MARKUP_LIMITS.depth) throw new ValidationLimit('the parsed document is too large or deeply nested.');
    if ('tagName' in node) {
      elements.push(node);
      const id = attr(node, 'id');
      if (id && !byId.has(id)) byId.set(id, node);
      if (node.tagName === 'label') {
        const target = attr(node, 'for');
        if (target !== undefined) {
          const group = labels.get(target);
          if (group) group.push(node); else labels.set(target, [node]);
        }
      }
      const classes = attr(node, 'class')?.split(/\s+/) ?? [];
      if (classes.includes('sk-field')) { field = { hints: [] }; fields.push(field); }
      const location = node.sourceCodeLocation;
      if (field && location) {
        if (['input', 'select', 'textarea'].includes(node.tagName) && !['checkbox', 'radio', 'hidden'].includes(attr(node, 'type') ?? '')) field.control ??= location.startOffset;
        if (classes.includes('sk-field__hint')) field.hints.push({ offset: location.startOffset, html: html.slice(location.startOffset, location.endOffset) });
      }
    }
    if ('childNodes' in node) for (let i = node.childNodes.length - 1; i >= 0; i--) pending.push({ node: node.childNodes[i]!, depth: depth + 1, field });
  }
  for (const field of fields) for (const hint of field.hints) if (field.control !== undefined && hint.offset > field.control) add({
    severity: 'warning', rule: 'field-hint-order', message: 'Explanatory text follows its control instead of its label.', snippet: snip(hint.html),
    fix: 'Move sk-field__hint directly after the label, before sk-field__control. Reserve sk-field__support for errors/counters after the control; preserve aria-describedby.',
  });

  const markupOf = (node: Element): string => {
    const loc = node.sourceCodeLocation;
    return loc ? html.slice(loc.startOffset, loc.endOffset) : `<${node.tagName}>`;
  };
  const hiddenHere = (node: Element, includeAria = true): boolean =>
    attr(node, 'hidden') !== undefined || (includeAria && attr(node, 'aria-hidden')?.toLowerCase() === 'true') ||
    /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse))\s*(?:!important\s*)?(?:;|$)/i.test(attr(node, 'style') ?? '');
  const hiddenByAncestor = (node: Element, includeAria = true): boolean => {
    let current: Node | null = node;
    while (current && 'tagName' in current) {
      if (hiddenHere(current, includeAria)) return true;
      current = current.parentNode;
    }
    return false;
  };
  let nameVisits = 0;
  const visitName = (): void => {
    if (++nameVisits > MARKUP_LIMITS.nameVisits) throw new ValidationLimit('the accessible-name work limit was exceeded.');
  };
  const nameCache = new WeakMap<Node, string>();
  const referenceCache = new WeakMap<Node, string>();
  const textAlternative = (node: Element, referenced = false): string => {
    visitName();
    const cache = referenced ? referenceCache : nameCache;
    const cached = cache.get(node);
    if (cached !== undefined) return cached;
    const texts: string[] = [];
    const queue: Node[] = [node];
    while (queue.length) {
      visitName();
      const item = queue.pop()!;
      if ('value' in item && item.nodeName === '#text') texts.push(item.value);
      if ('tagName' in item) {
        if ((!referenced && hiddenHere(item)) || ['script', 'style', 'template', 'input', 'select', 'textarea'].includes(item.tagName)) continue;
        if (item.tagName === 'img') { texts.push(attr(item, 'alt') ?? ''); continue; }
        if (item.tagName === 'svg') {
          // SVG names count only when explicitly authored, not from path data.
          const title = item.childNodes.find(child => 'tagName' in child && child.tagName === 'title');
          texts.push(attr(item, 'aria-label') ?? (title && 'tagName' in title ? textAlternative(title, referenced) : ''));
          continue;
        }
      }
      if ('childNodes' in item) for (let i = item.childNodes.length - 1; i >= 0; i--) queue.push(item.childNodes[i]!);
    }
    const value = texts.join(' ').replace(/\s+/g, ' ').trim();
    cache.set(node, value);
    return value;
  };
  const explicitName = (node: Element): string | undefined => {
    const targets = (attr(node, 'aria-labelledby') ?? '').trim().split(/\s+/).map(id => { visitName(); return byId.get(id); }).filter((target): target is Element => !!target);
    // Directly referenced hidden text can name a control under the accessible-
    // name rules; ordinary hidden descendants cannot name one by contents.
    if (targets.length) return targets.map(target => textAlternative(target, hiddenByAncestor(target))).join(' ').trim();
    const aria = attr(node, 'aria-label')?.trim();
    return aria || undefined;
  };
  const hasName = (node: Element, contents: boolean): boolean => {
    const explicit = explicitName(node);
    if (explicit !== undefined) return explicit.length > 0;
    return (contents && textAlternative(node).length > 0) || !!attr(node, 'title')?.trim();
  };

  // Inspect displayed/accessibility labels, never IDs, URLs or storage keys.
  // This is an advisory content rule: application-specific terminology can be
  // intentional, but copying the old example identity must not pass silently.
  for (const node of elements) {
    if (hiddenByAncestor(node)) continue;
    const contentLabel = /^(h[1-6]|label|legend|title|a|button)$/.test(node.tagName) ||
      /(?:^|\s)sk-(?:document__eyebrow|side-nav__group-label|top-bar__product)(?:\s|$)/.test(attr(node, 'class') ?? '') ||
      /^(heading|menuitem|treeitem)$/.test(attr(node, 'role') ?? '');
    const label = [explicitName(node) ?? '', attr(node, 'title') ?? '', contentLabel ? textAlternative(node) : ''].join(' ');
    if (/\bworkspaces?\b/i.test(label)) add({
      severity: 'warning', rule: 'default-workspace-label',
      message: 'A UI label uses Workspace terminology from the old examples.', snippet: snip(markupOf(node)),
      fix: 'Do not use Workspace as default UI identity. Use the application’s actual domain name or remove a redundant caption. Keep internal IDs and routes unchanged; retain this wording only when explicitly required by the product.',
    });
  }

  for (const node of elements) {
    if (!['button', 'a', 'input', 'select', 'textarea'].includes(node.tagName) || hiddenByAncestor(node, false)) continue;
    const full = markupOf(node);
    if (node.tagName === 'button') {
      if (hiddenByAncestor(node)) {
        const notFocusable = Number(attr(node, 'tabindex') ?? 0) < 0 || attr(node, 'disabled') !== undefined;
        if (!notFocusable) add({ severity: 'error', rule: 'aria-hidden-focusable', message: 'A button is hidden from assistive technology but remains focusable.', snippet: snip(full),
          fix: 'Remove aria-hidden and provide a name, or use tabindex="-1" for a decorative duplicate control.', wcag: '4.1.2 Name, Role, Value; 2.4.3 Focus Order' });
        continue;
      }
      if (!hasName(node, true)) add({ severity: 'error', rule: 'button-accessible-name', message: 'A button has no static accessible name. Empty labels and hidden contents do not provide one.', snippet: snip(full),
        fix: 'Add visible text or a nonempty visually hidden label inside the button.', wcag: '4.1.2 Name, Role, Value; 1.1.1 Non-text Content' });
    } else if (node.tagName === 'a') {
      if (!hasName(node, true)) add({ severity: 'error', rule: 'link-accessible-name', message: 'A link has no accessible name.', snippet: snip(full),
        fix: 'Give the link text describing its destination, or a nonempty visually hidden label.', wcag: '2.4.4 Link Purpose (In Context)' });
      if (attr(node, 'href') === '#') add({ severity: 'error', rule: 'link-as-button', message: 'A link with href="#" is being used as a button.', snippet: snip(full),
        fix: 'Use <button type="button"> for actions. Reserve <a href> for real destinations.', wcag: '4.1.2 Name, Role, Value' });
      const content = textAlternative(node);
      if (attr(node, 'target')?.toLowerCase() === '_blank' && !/opens in a new tab/i.test(content)) add({ severity: 'warning', rule: 'new-tab-unannounced', message: 'A link opens in a new tab without warning the user.', snippet: snip(full),
        fix: 'Add <span class="sk-visually-hidden">(opens in a new tab)</span> inside the link.', wcag: '3.2.5 Change on Request' });
      if (/^(click here|here|read more|more|learn more)$/i.test(content)) add({ severity: 'warning', rule: 'vague-link-text', message: 'Link text is not meaningful out of context.', snippet: snip(full),
        fix: 'Describe the destination, for example "Task field reference".', wcag: '2.4.4 Link Purpose (In Context)' });
    } else {
      const type = attr(node, 'type')?.toLowerCase() ?? 'text';
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) continue;
      const id = attr(node, 'id');
      const explicit = explicitName(node);
      const associated = id === undefined ? [] : labels.get(id) ?? [];
      let labelled = explicit !== undefined ? !!explicit : associated.some(label => { visitName(); return !hiddenByAncestor(label) && !!textAlternative(label); });
      let parent: Node | null = node.parentNode;
      while (explicit === undefined && !labelled && parent && 'tagName' in parent) {
        visitName();
        if (parent.tagName === 'label' && (attr(parent, 'for') === undefined || attr(parent, 'for') === id)) labelled = !hiddenByAncestor(parent) && !!textAlternative(parent);
        parent = parent.parentNode;
      }
      if (!labelled) add({ severity: 'error', rule: 'input-missing-label', message: `A <${node.tagName}> has no nonempty associated label.`, snippet: snip(full),
        fix: 'Give the control a unique id and a nonempty matching <label for>, wrap it in a label, or provide a valid accessible name. A placeholder is not a label.', wcag: '1.3.1 Info and Relationships; 3.3.2 Labels or Instructions' });
      if (attr(node, 'placeholder') !== undefined && !labelled) add({ severity: 'error', rule: 'placeholder-as-label', message: 'A placeholder is being used as the only label.', snippet: snip(full),
        fix: 'Add a persistent visible <label>. Keep the placeholder for an example value only.', wcag: '3.3.2 Labels or Instructions' });
      if (/^(email|name|tel|phone|address|postal|zip|country|username|given|family|cc-|organi[sz]ation)/i.test(attr(node, 'name') ?? '') && attr(node, 'autocomplete') === undefined) add({ severity: 'warning', rule: 'missing-autocomplete', message: 'A personal-information field has no autocomplete token.', snippet: snip(full),
        fix: 'Add the appropriate autocomplete value, e.g. autocomplete="email".', wcag: '1.3.5 Identify Input Purpose' });
      if (type === 'number') add({ severity: 'info', rule: 'number-input', message: 'type="number" has spinner and scroll-wheel behavior and rejects leading zeros.', snippet: snip(full),
        fix: 'For identifiers such as postcodes and account numbers, use type="text" inputmode="numeric".' });
    }
  }
  let m: RegExpExecArray | null;

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

  const localTokens = new Set([...html.matchAll(/(--sk-[a-zA-Z0-9-]+)\s*:/g)].map(match => match[1]!.slice(5)));
  const varRe = /var\(\s*(--sk-[a-zA-Z0-9-]+)/g;
  while ((m = varRe.exec(html)) !== null) {
    const name = m[1]!.replace(/^--sk-/, '');
    if (!tokenNames.has(name) && !componentVariableNames.has(name) && !localTokens.has(name)) {
      add({
        severity: 'warning',
        rule: 'unknown-token',
        message: `--sk-${name} is not a Sekura token. It will resolve to nothing and the property will fall back or be dropped.`,
        fix: 'Check the name with get_tokens({ includeScales: true }), or supply a fallback value as the second argument to var().',
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
    return 'No issues matched the checked patterns. This is a scoped static check, not an accessibility certificate. External CSS, runtime state, keyboard and screen-reader behavior were not checked.';
  }
  return `${errors} error(s), ${warnings} warning(s), ${infos} note(s).`;
}

/**
 * Framework code generation.
 *
 * Sekura ships class-based CSS, so a framework "component" is a thin typed wrapper
 * that maps props onto class names and forwards the accessibility attributes the
 * spec requires. Generating these from the spec keeps the wrappers honest: a
 * required ARIA attribute in the spec becomes a required prop in the wrapper.
 */

import type { ComponentSpec } from '../data/components/types.js';

export const FRAMEWORKS = [
  'html',
  'css',
  'react',
  'vue',
  'svelte',
  'angular',
  'blazor',
  'web-component',
] as const;
export type Framework = (typeof FRAMEWORKS)[number];

export const frameworkDescriptions: Record<Framework, string> = {
  html: 'Reference markup with the required ARIA wiring in place.',
  css: 'The production stylesheet for this component, written against semantic tokens.',
  react: 'TypeScript React component. Interactive components wire the real @sekura/behaviours controller rather than only mapping classes.',
  vue: 'Vue 3 single-file component. Interactive components wire the real controller.',
  svelte: 'Svelte 5 component. Interactive components use an action wrapping the real controller.',
  angular: 'Angular standalone directive wiring the real controller.',
  blazor: 'Blazor Razor component with typed parameters.',
  'web-component': 'Framework-free custom element wrapping the same classes.',
};


/**
 * Components whose behaviour is implemented by @sekura/behaviours.
 *
 * This is the difference between a specification and a system. Before this map
 * existed, generated framework code was a wrapper that mapped props to class
 * names — it documented a keyboard contract it did not implement, leaving every
 * consumer to build the ARIA 1.2 combobox pattern themselves. Now the generated
 * code wires the controller that already passes the behaviour tests.
 */
interface ControllerBinding {
  /** Factory exported from @sekura/behaviours. */
  factory: string;
  /** Refs the factory needs, in order. */
  refs: string[];
  /** One-line summary of what the controller takes care of. */
  handles: string;
}

const CONTROLLERS: Record<string, ControllerBinding> = {
  menu: {
    factory: 'createMenu',
    refs: ['trigger', 'menu'],
    handles:
      'open/close, real focus movement between items, wrap, Home/End, type-ahead, skipping aria-disabled items, Escape restoring focus to the trigger, and Tab closing rather than trapping',
  },
  combobox: {
    factory: 'createCombobox',
    refs: ['input', 'listbox'],
    handles:
      'the ARIA 1.2 pattern: DOM focus stays in the input while aria-activedescendant moves, debounced search, result-count announcement, and two-stage Escape (close, then clear)',
  },
  tabs: {
    factory: 'createTabs',
    refs: ['tablist'],
    handles:
      'roving tabindex so the list is one tab stop, arrow navigation mirrored for RTL, automatic or manual activation, and panel visibility',
  },
  disclosure: {
    factory: 'createDisclosure',
    refs: ['trigger', 'panel'],
    handles:
      'aria-expanded, aria-controls, labelling the panel from its trigger, and hiding the panel with `hidden` so collapsed content leaves the tab order rather than lingering in it invisibly',
  },
  accordion: {
    factory: 'createAccordion',
    refs: ['container'],
    handles:
      'a roving tabindex so the whole group is one tab stop rather than one per header, arrow navigation between headers, and optional single-open behaviour',
  },
  'date-picker': {
    factory: 'createDatePicker',
    refs: ['input', 'trigger', 'panel'],
    handles:
      'the ARIA Date Picker Dialog pattern: grid navigation by day, week, month and year, a roving tabindex so the calendar is one tab stop, focus trapped while open and returned to the trigger on close, and a text input that stays authoritative',
  },
  'date-range-picker': {
    factory: 'createDateRange',
    refs: ['startInput', 'endInput', 'calendar'],
    handles:
      'two inputs sharing one grid, start-then-end selection, restarting rather than inverting when a date before the start is picked, and announcing the half-finished state',
  },
  'number-input': {
    factory: 'createNumberInput',
    refs: ['input'],
    handles:
      'the spinbutton contract, arrow and page stepping, snapping to the step grid, clamping on blur rather than per keystroke, and announcing a clamp instead of silently rewriting what was typed',
  },
  'tag-input': {
    factory: 'createTagInput',
    refs: ['input', 'list'],
    handles:
      'token rendering, two-step Backspace removal, arrow navigation into the tokens, duplicate and limit rejection with a spoken reason, and keeping the whole control to one tab stop',
  },
  toolbar: {
    factory: 'createToolbar',
    refs: ['container'],
    handles: 'a roving tabindex so the whole bar is one tab stop, with RTL-aware arrow keys',
  },
  'segmented-control': {
    factory: 'createSegmented',
    refs: ['group'],
    handles: 'radiogroup semantics with a roving tabindex and RTL-aware arrow keys',
  },
  'button-group': {
    factory: 'createSegmented',
    refs: ['group'],
    handles: 'radiogroup semantics with a roving tabindex and RTL-aware arrow keys',
  },
  dialog: {
    factory: 'createDialog',
    refs: ['dialog'],
    handles:
      'native showModal(), focus to the safe option, focus restore on close, and a veto hook so a dirty dialog confirms instead of discarding work on Escape',
  },
  drawer: {
    factory: 'createDrawer',
    refs: ['drawer'],
    handles:
      'switching between modal and inline on a media query — including the ARIA, not just the CSS — plus inert on close so a hidden drawer leaves no invisible tab stops',
  },
  popover: {
    factory: 'createPopover',
    refs: ['trigger', 'panel'],
    handles: 'anchored positioning with flip, light dismiss, and focus restore',
  },
  tooltip: {
    factory: 'createTooltip',
    refs: ['trigger', 'tip'],
    handles:
      'WCAG 1.4.13: dismissible with Escape, hoverable without vanishing, and persistent until focus moves',
  },
  table: {
    factory: 'createSelection',
    refs: ['container'],
    handles: 'tri-state header checkbox scoped to the current page, with announcements',
  },
  switch: {
    factory: 'createAsyncSwitch',
    refs: ['input'],
    handles: 'a pending state until the server confirms, rather than claiming a state it has not reached',
  },
};

function pascal(id: string): string {
  return id
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

function baseClass(spec: ComponentSpec): string {
  return `sk-${spec.id}`;
}

/** Variant names as a union type, derived from the spec's className modifiers. */
function variantUnion(spec: ComponentSpec): { names: string[]; union: string } {
  const names = spec.variants
    .map((v) => v.className.replace(`${baseClass(spec)}--`, ''))
    .filter((n) => n && !n.startsWith('sk-'));
  return {
    names,
    union: names.length ? names.map((n) => `'${n}'`).join(' | ') : "'default'",
  };
}

function sizeUnion(spec: ComponentSpec): { names: string[]; union: string } {
  const names = spec.sizes
    .map((s) => s.className.replace(`${baseClass(spec)}--`, ''))
    .filter((n) => n && !n.startsWith('sk-'));
  return {
    names,
    union: names.length ? [...names, 'md'].map((n) => `'${n}'`).join(' | ') : "'md'",
  };
}

/** ARIA obligations the wrapper must not let a consumer forget. */
function ariaNotes(spec: ComponentSpec): string {
  return spec.accessibility.aria.map((a) => ` *   - ${a}`).join('\n');
}

function header(spec: ComponentSpec, framework: string): string {
  return `/**
 * Sekura ${spec.name} — ${framework}
 *
 * ${spec.summary}
 *
 * Accessibility obligations carried by this component:
${ariaNotes(spec)}
 *
 * Dark mode: ${spec.darkMode.split('. ')[0]}.
 *
 * Requires the Sekura stylesheet (tokens.css + components/${spec.id}.css).
 */`;
}

/* ------------------------------------------------------------------ *
 * React
 * ------------------------------------------------------------------ */

/**
 * React wrapper that wires the controller.
 *
 * Deliberately short. All the hard work — the keyboard model, the ARIA
 * bookkeeping, focus restore — lives in the controller, so there is nothing here
 * for a consumer to get wrong and nowhere for behaviour to diverge between
 * frameworks.
 */
function reactWithController(spec: ComponentSpec, binding: ControllerBinding): string {
  const Name = pascal(spec.id);
  const refs = binding.refs;
  const refDecls = refs
    .map((r) => `  const ${r}Ref = useRef<HTMLElement>(null);`)
    .join('\n');
  const guards = refs.map((r) => `${r}Ref.current`).join(' && ');
  const args = refs.map((r) => `${r}Ref.current as never`).join(', ');

  return `${header(spec, 'React (TypeScript)')}
import { useEffect, useRef, type ReactNode } from 'react';
import { ${binding.factory} } from '@sekura/behaviours';

/**
 * The controller handles ${binding.handles}.
 *
 * Do not also manage those attributes from React state — you would be fighting
 * the controller, and one of you would lose at the wrong moment.
 */
export function ${Name}({ children }: { children?: ReactNode }) {
${refDecls}

  useEffect(() => {
    if (!(${guards})) return;
    const controller = ${binding.factory}(${args});
    // Controllers register document-level listeners for light dismiss.
    // Returning destroy is what stops those leaking.
    return controller.destroy;
  }, []);

  return (
${refs.map((r) => `    <div ref={${r}Ref as never} className="sk-${spec.id}${refs.length > 1 ? `__${r}` : ''}" />`).join('\n')}
  );
}
`;
}


/* ------------------------------------------------------------------ *
 * Controller-backed wrappers for the remaining frameworks.
 *
 * All three are short for the same reason React's is: the keyboard model, the
 * ARIA bookkeeping and focus restore live in the controller, so a binding only
 * hands over an element and calls destroy on teardown. Svelte and Angular are
 * shortest of all, because an action and a directive already have exactly the
 * shape a controller returns.
 * ------------------------------------------------------------------ */

function controllerNote(binding: ControllerBinding): string {
  return `The controller handles ${binding.handles}.

  Do not also manage those attributes from framework state — you would be
  fighting the controller, and one of you would lose at the wrong moment.`;
}

function vueWithController(spec: ComponentSpec, binding: ControllerBinding): string {
  const Name = pascal(spec.id);
  const refs = binding.refs;
  return `<!--
  Sekura ${spec.name} — Vue 3

  ${controllerNote(binding)}
-->
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { ${binding.factory} } from '@sekura/behaviours';

${refs.map((r) => `const ${r} = ref<HTMLElement>();`).join('\n')}
let controller: { destroy: () => void } | undefined;

onMounted(() => {
  if (${refs.map((r) => `${r}.value`).join(' && ')}) {
    controller = ${binding.factory}(${refs.map((r) => `${r}.value as never`).join(', ')});
  }
});

// Controllers register document-level listeners for light dismiss; skipping
// this leaks them on every unmount.
onUnmounted(() => controller?.destroy());
</script>

<template>
${refs.map((r) => `  <div ref="${r}" class="sk-${spec.id}${refs.length > 1 ? `__${r}` : ''}"><slot name="${r}" /></div>`).join('\n')}
</template>
`;
}

function svelteWithController(spec: ComponentSpec, binding: ControllerBinding): string {
  const refs = binding.refs;
  const primary = refs[0]!;
  const rest = refs.slice(1);

  return `<!--
  Sekura ${spec.name} — Svelte 5

  ${controllerNote(binding)}

  Implemented as an action: \`use:\` receives the node and expects an object
  with \`destroy\` — which is exactly what a controller returns.
-->
<script lang="ts">
  import { ${binding.factory} } from '@sekura/behaviours';

${rest.map((r) => `  let ${r}El: HTMLElement;`).join('\n')}
  let { children } = $props();

  function ${spec.id.replace(/-([a-z])/g, (_m, c) => c.toUpperCase())}(node: HTMLElement) {
    const controller = ${binding.factory}(${['node', ...rest.map((r) => `${r}El as never`)].join(', ')});
    return { destroy: controller.destroy };
  }
</script>

<div use:${spec.id.replace(/-([a-z])/g, (_m, c) => c.toUpperCase())} class="sk-${spec.id}${refs.length > 1 ? `__${primary}` : ''}">
  {@render children?.()}
</div>
${rest.map((r) => `<div bind:this={${r}El} class="sk-${spec.id}__${r}"></div>`).join('\n')}
`;
}

function angularWithController(spec: ComponentSpec, binding: ControllerBinding): string {
  const Name = pascal(spec.id);
  const refs = binding.refs;
  const extra = refs.slice(1);

  return `${header(spec, 'Angular (standalone directive)')}
import {
  Directive, ElementRef, Input, OnDestroy, OnInit, inject,
} from '@angular/core';
import { ${binding.factory} } from '@sekura/behaviours';

/**
 * ${controllerNote(binding).split('\n')[0]}
 *
 * A directive rather than a component: the controller attaches to an element
 * the template already renders, so there is no markup for it to own.
 */
@Directive({ selector: '[sk${Name}]', standalone: true })
export class Sk${Name}Directive implements OnInit, OnDestroy {
${extra.map((r) => `  /** Element id of the ${r}. */\n  @Input() sk${pascal(r)}Id?: string;`).join('\n')}

  private readonly host = inject(ElementRef<HTMLElement>);
  private controller?: { destroy: () => void };

  ngOnInit(): void {
${extra.map((r) => `    const ${r} = this.sk${pascal(r)}Id ? document.getElementById(this.sk${pascal(r)}Id) : null;`).join('\n')}
${extra.length ? `    if (${extra.map((r) => r).join(' && ')}) {\n      this.controller = ${binding.factory}(${['this.host.nativeElement', ...extra.map((r) => `${r} as never`)].join(', ')});\n    }` : `    this.controller = ${binding.factory}(this.host.nativeElement as never);`}
  }

  ngOnDestroy(): void {
    // Controllers register document-level listeners; destroy releases them.
    this.controller?.destroy();
  }
}
`;
}

function reactComponent(spec: ComponentSpec): string {
  const Name = pascal(spec.id);
  const base = baseClass(spec);
  const { union: variants, names: variantNames } = variantUnion(spec);
  const { union: sizes, names: sizeNames } = sizeUnion(spec);
  const defaultVariant = variantNames[0] ?? 'default';

  const propLines = spec.props
    .map((p) => {
      const optional = p.required ? '' : '?';
      return `  /** ${p.description}${p.default ? ` @default ${p.default}` : ''} */\n  ${p.name}${optional}: ${p.type};`;
    })
    .join('\n');

  return `${header(spec, 'React (TypeScript)')}
import { forwardRef, type ReactNode, type ComponentPropsWithoutRef } from 'react';

export type ${Name}Variant = ${variants};
export type ${Name}Size = ${sizes};

export interface ${Name}Props extends Omit<ComponentPropsWithoutRef<'div'>, 'size'> {
${propLines}
  /** Visual variant. */
  variant?: ${Name}Variant;
  /** Control size. */
  size?: ${Name}Size;
  className?: string;
  children?: ReactNode;
}

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

export const ${Name} = forwardRef<HTMLDivElement, ${Name}Props>(function ${Name}(
  { variant = '${defaultVariant}', size = 'md', className, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cx(
        '${base}',
        variant && variant !== 'default' && \`${base}--\${variant}\`,
        size && size !== 'md' && \`${base}--\${size}\`,
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

${Name}.displayName = '${Name}';
`;
}

/* Button and a few others need a real element rather than the generic wrapper. */
function reactButton(): string {
  return `/**
 * Sekura Button — React (TypeScript)
 *
 * A button does something; it never navigates. Rendering an <a> from this
 * component is deliberately not supported — use Link.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant =
  | 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Decorative leading icon. Rendered aria-hidden by the caller. */
  iconStart?: ReactNode;
  /** Trailing icon signalling a consequence (menu, external link). */
  iconEnd?: ReactNode;
  /** Async action in flight. Sets aria-busy and shows the spinner without
   *  changing the label — a label that mutates mid-press is disorienting. */
  busy?: boolean;
  fullWidth?: boolean;
  /**
   * Explicit, because an untyped <button> inside a <form> submits it.
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset';
  children: ReactNode;
}

const cx = (...p: Array<string | false | undefined>) => p.filter(Boolean).join(' ');

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    iconStart,
    iconEnd,
    busy = false,
    fullWidth = false,
    type = 'button',
    disabled,
    className,
    children,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      // aria-busy rather than disabled: focus is retained so a keyboard user is
      // not stranded when the button becomes temporarily inert.
      aria-busy={busy || undefined}
      disabled={disabled}
      className={cx(
        'sk-button',
        \`sk-button--\${variant}\`,
        size !== 'md' && \`sk-button--\${size}\`,
        fullWidth && 'sk-button--full-width',
        className
      )}
      {...rest}
    >
      {busy ? (
        <span className="sk-button__spinner" aria-hidden="true" />
      ) : (
        iconStart
      )}
      <span className="sk-button__label">{children}</span>
      {iconEnd}
    </button>
  );
});

Button.displayName = 'Button';
`;
}

/* ------------------------------------------------------------------ *
 * Vue
 * ------------------------------------------------------------------ */

function vueComponent(spec: ComponentSpec): string {
  const Name = pascal(spec.id);
  const base = baseClass(spec);
  const { union: variants, names: variantNames } = variantUnion(spec);
  const { union: sizes } = sizeUnion(spec);
  const defaultVariant = variantNames[0] ?? 'default';

  return `<!--
  Sekura ${spec.name} — Vue 3

  ${spec.summary}

  Accessibility obligations:
${spec.accessibility.aria.map((a) => `    - ${a}`).join('\n')}
-->
<script setup lang="ts">
import { computed } from 'vue';

type ${Name}Variant = ${variants};
type ${Name}Size = ${sizes};

const props = withDefaults(
  defineProps<{
    variant?: ${Name}Variant;
    size?: ${Name}Size;
  }>(),
  { variant: '${defaultVariant}', size: 'md' }
);

const classes = computed(() => [
  '${base}',
  props.variant !== 'default' ? \`${base}--\${props.variant}\` : null,
  props.size !== 'md' ? \`${base}--\${props.size}\` : null,
]);
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
`;
}

/* ------------------------------------------------------------------ *
 * Svelte
 * ------------------------------------------------------------------ */

function svelteComponent(spec: ComponentSpec): string {
  const base = baseClass(spec);
  const { union: variants, names: variantNames } = variantUnion(spec);
  const { union: sizes } = sizeUnion(spec);
  const defaultVariant = variantNames[0] ?? 'default';

  return `<!--
  Sekura ${spec.name} — Svelte 5 (runes)

  ${spec.summary}
-->
<script lang="ts">
  type Variant = ${variants};
  type Size = ${sizes};

  let {
    variant = '${defaultVariant}' as Variant,
    size = 'md' as Size,
    class: className = '',
    children,
    ...rest
  } = $props();

  const classes = $derived(
    [
      '${base}',
      variant !== 'default' ? \`${base}--\${variant}\` : '',
      size !== 'md' ? \`${base}--\${size}\` : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')
  );
</script>

<div class={classes} {...rest}>
  {@render children?.()}
</div>
`;
}

/* ------------------------------------------------------------------ *
 * Angular
 * ------------------------------------------------------------------ */

function angularComponent(spec: ComponentSpec): string {
  const Name = pascal(spec.id);
  const base = baseClass(spec);
  const { union: variants, names: variantNames } = variantUnion(spec);
  const { union: sizes } = sizeUnion(spec);
  const defaultVariant = variantNames[0] ?? 'default';

  return `${header(spec, 'Angular (standalone)')}
import { Component, Input, computed, signal, ChangeDetectionStrategy } from '@angular/core';

export type ${Name}Variant = ${variants};
export type ${Name}Size = ${sizes};

@Component({
  selector: 'sk-${spec.id}',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<div [class]="classes()"><ng-content /></div>\`,
})
export class ${Name}Component {
  @Input() set variant(value: ${Name}Variant) { this._variant.set(value); }
  @Input() set size(value: ${Name}Size) { this._size.set(value); }

  private readonly _variant = signal<${Name}Variant>('${defaultVariant}');
  private readonly _size = signal<${Name}Size>('md');

  protected readonly classes = computed(() =>
    [
      '${base}',
      this._variant() !== 'default' ? \`${base}--\${this._variant()}\` : '',
      this._size() !== 'md' ? \`${base}--\${this._size()}\` : '',
    ]
      .filter(Boolean)
      .join(' ')
  );
}
`;
}

/* ------------------------------------------------------------------ *
 * Blazor
 * ------------------------------------------------------------------ */

function blazorComponent(spec: ComponentSpec): string {
  const Name = pascal(spec.id);
  const base = baseClass(spec);
  const { names: variantNames } = variantUnion(spec);
  const { names: sizeNames } = sizeUnion(spec);
  const defaultVariant = variantNames[0] ?? 'Default';

  const variantEnum = (variantNames.length ? variantNames : ['default'])
    .map((v) => `    ${pascal(v)},`)
    .join('\n');
  const sizeEnum = [...new Set([...sizeNames, 'md'])]
    .map((s) => `    ${pascal(s)},`)
    .join('\n');

  return `@* Sekura ${spec.name} — Blazor

   ${spec.summary}

   Accessibility obligations:
${spec.accessibility.aria.map((a) => `     - ${a}`).join('\n')}
*@
<div class="@CssClass" @attributes="AdditionalAttributes">
    @ChildContent
</div>

@code {
    public enum ${Name}Variant
    {
${variantEnum}
    }

    public enum ${Name}Size
    {
${sizeEnum}
    }

    [Parameter] public ${Name}Variant Variant { get; set; } = ${Name}Variant.${pascal(defaultVariant)};
    [Parameter] public ${Name}Size Size { get; set; } = ${Name}Size.Md;
    [Parameter] public string? Class { get; set; }
    [Parameter] public RenderFragment? ChildContent { get; set; }

    // Captures aria-* and data-* so callers can satisfy the accessibility
    // contract without the component enumerating every attribute.
    [Parameter(CaptureUnmatchedValues = true)]
    public IDictionary<string, object>? AdditionalAttributes { get; set; }

    private string CssClass => string.Join(" ", new[]
    {
        "${base}",
        Variant == ${Name}Variant.${pascal(defaultVariant)} ? null : $"${base}--{Kebab(Variant.ToString())}",
        Size == ${Name}Size.Md ? null : $"${base}--{Kebab(Size.ToString())}",
        Class
    }.Where(s => !string.IsNullOrWhiteSpace(s)));

    private static string Kebab(string value) =>
        string.Concat(value.Select((c, i) =>
            char.IsUpper(c) && i > 0 ? "-" + char.ToLowerInvariant(c) : char.ToLowerInvariant(c).ToString()));
}
`;
}

/* ------------------------------------------------------------------ *
 * Web component
 * ------------------------------------------------------------------ */

function webComponentCode(spec: ComponentSpec): string {
  const Name = pascal(spec.id);
  const base = baseClass(spec);
  const { names: variantNames } = variantUnion(spec);
  const defaultVariant = variantNames[0] ?? 'default';

  return `${header(spec, 'Custom element')}

/**
 * Deliberately uses light DOM rather than shadow DOM: Sekura styles come from a
 * global stylesheet driven by CSS custom properties, and a shadow root would
 * cut the component off from the theme.
 */
export class Sekura${Name} extends HTMLElement {
  static observedAttributes = ['variant', 'size'];

  connectedCallback() {
    this.#applyClasses();
  }

  attributeChangedCallback() {
    this.#applyClasses();
  }

  #applyClasses() {
    const variant = this.getAttribute('variant') ?? '${defaultVariant}';
    const size = this.getAttribute('size') ?? 'md';
    this.className = [
      '${base}',
      variant !== 'default' ? \`${base}--\${variant}\` : '',
      size !== 'md' ? \`${base}--\${size}\` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
}

customElements.define('sk-${spec.id}', Sekura${Name});
`;
}

/* ------------------------------------------------------------------ *
 * Dispatch
 * ------------------------------------------------------------------ */

export function generateCode(spec: ComponentSpec, framework: Framework): string {
  switch (framework) {
    case 'html':
      return spec.html;
    case 'css':
      return spec.css;
    case 'react': {
      // Button is hand-written: its element, busy behaviour and label handling
      // matter more than a generic wrapper can express.
      if (spec.id === 'button') return reactButton();
      const binding = CONTROLLERS[spec.id];
      // Interactive components get a wrapper around the real controller;
      // presentational ones only need class mapping.
      return binding ? reactWithController(spec, binding) : reactComponent(spec);
    }
    case 'vue': {
      const binding = CONTROLLERS[spec.id];
      return binding ? vueWithController(spec, binding) : vueComponent(spec);
    }
    case 'svelte': {
      const binding = CONTROLLERS[spec.id];
      return binding ? svelteWithController(spec, binding) : svelteComponent(spec);
    }
    case 'angular': {
      const binding = CONTROLLERS[spec.id];
      return binding ? angularWithController(spec, binding) : angularComponent(spec);
    }
    case 'blazor':
      return blazorComponent(spec);
    case 'web-component':
      return webComponentCode(spec);
    default: {
      const exhaustive: never = framework;
      throw new Error(`Unknown framework: ${String(exhaustive)}`);
    }
  }
}

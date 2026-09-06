/**
 * Framework code generation.
 *
 * Preserve the authored native markup across editable framework recipes.
 * React Button has a dedicated props API. Other outputs expose the reference
 * structure and controller lifecycle, with application state supplied by callers.
 */

import { referenceCode } from './reference-code.js';
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
  html: 'Reference markup. Load sekura.css and the behaviour bundle, then call Sekura.enhance().',
  css: 'Component CSS. Read implementation.cssDependencies for required child styles, or load sekura.css.',
  react: 'React TypeScript reference recipe with native markup, unique IDs, editable children and controller cleanup.',
  vue: 'Vue reference recipe with native markup, slots and controller cleanup.',
  svelte: 'Svelte reference recipe with native markup, snippets and controller cleanup.',
  angular: 'Angular standalone reference component with native markup and controller cleanup.',
  blazor: 'Blazor reference component. Requires the IIFE bundle and the documented JS lifecycle bridge.',
  'web-component': 'Light-DOM reference element with native markup and controller cleanup.',
};

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
    onClick,
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
      onClick={(event) => {
        if (busy || rest['aria-disabled'] === true || rest['aria-disabled'] === 'true') {
          event.preventDefault(); event.stopPropagation(); return;
        }
        onClick?.(event);
      }}
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

export function generateCode(spec: ComponentSpec, framework: Framework): string {
  if (framework === 'html') return spec.html;
  if (framework === 'css') return spec.css;
  if (framework === 'react' && spec.id === 'button') return reactButton();
  return referenceCode(spec, framework);
}

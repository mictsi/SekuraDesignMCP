/**
 * The shape of a Sekura component specification.
 *
 * Every field is mandatory-by-convention: a component with no documented keyboard
 * model, no dark-mode note, or no "when not to use" is not finished. The MCP tools
 * surface these fields directly, so a gap here becomes a gap in what a consuming
 * agent knows.
 */

export type ComponentCategory =
  | 'action'
  | 'form'
  | 'navigation'
  | 'feedback'
  | 'data-display'
  | 'overlay'
  | 'layout';

export type ComponentStatus = 'stable' | 'beta' | 'deprecated';

export interface AnatomyPart {
  part: string;
  required: boolean;
  description: string;
}

export interface Variant {
  name: string;
  className: string;
  description: string;
  /** When this variant is the right choice, in one sentence. */
  use: string;
}

export interface SizeOption {
  name: string;
  className: string;
  height: string;
  typeStyle: string;
  description: string;
}

export interface StateSpec {
  name: string;
  description: string;
  /** Selector or attribute that triggers it. */
  trigger: string;
}

export interface PropSpec {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  description: string;
}

export interface KeyBinding {
  keys: string;
  action: string;
}

export interface AccessibilitySpec {
  /** Native element or ARIA role the component must resolve to. */
  role: string;
  keyboard: KeyBinding[];
  /** ARIA attributes the implementation is responsible for. */
  aria: string[];
  /** WCAG 2.2 success criteria this component is specifically accountable for. */
  wcag: string[];
  screenReader: string;
  /** Minimum target size and how it is achieved. */
  targetSize: string;
}

export interface ComponentSpec {
  id: string;
  name: string;
  category: ComponentCategory;
  status: ComponentStatus;
  summary: string;
  whenToUse: string[];
  whenNotToUse: string[];
  anatomy: AnatomyPart[];
  variants: Variant[];
  sizes: SizeOption[];
  states: StateSpec[];
  props: PropSpec[];
  /** Semantic token names the component consumes. Used by `get_component` and by lint. */
  tokensUsed: string[];
  /** What specifically changes between light and dark, beyond token re-pointing. */
  darkMode: string;
  accessibility: AccessibilitySpec;
  /** Microcopy rules for text inside this component. */
  content: string[];
  dos: string[];
  donts: string[];
  /** Paste-ready reference markup. */
  html: string;
  /** Production CSS. Written against semantic tokens only. */
  css: string;
  related: string[];
}

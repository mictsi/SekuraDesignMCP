import { actionComponents } from './actions.js';
import { dataDisplayComponents } from './data-display.js';
import { feedbackComponents } from './feedback.js';
import { formComponents } from './forms.js';
import { layoutComponents } from './layout.js';
import { navigationComponents } from './navigation.js';
import { overlayComponents } from './overlay.js';
import type { ComponentCategory, ComponentSpec } from './types.js';
import { implementation, referenceMarkup } from './contracts.js';

export const components: ComponentSpec[] = [
  ...actionComponents,
  ...formComponents,
  ...navigationComponents,
  ...feedbackComponents,
  ...dataDisplayComponents,
  ...overlayComponents,
  ...layoutComponents,
];

for (const component of components) {
  // Whole-document recipes retain their document envelope.
  if (!/<(?:html|body)\b/i.test(component.html)) component.html = referenceMarkup(component);
}
for (const component of components) component.implementation = implementation(component, components);

const byId = new Map(components.map((c) => [c.id, c]));

export function getComponent(id: string): ComponentSpec | undefined {
  return byId.get(id.toLowerCase().trim());
}

export function componentsByCategory(
  category: ComponentCategory
): ComponentSpec[] {
  return components.filter((c) => c.category === category);
}

export const componentCategories: ComponentCategory[] = [
  'layout',
  'action',
  'form',
  'navigation',
  'feedback',
  'data-display',
  'overlay',
];

export const categoryDescriptions: Record<ComponentCategory, string> = {
  layout:
    'The frame and the composition primitives. Flex-first: Stack, Cluster and Sidebar layout produce responsive results without media queries.',
  action: 'Things that make something happen, plus links, which do not.',
  form: 'Collecting input. The most accessibility-sensitive group in the system.',
  navigation: 'Moving around and knowing where you are.',
  feedback: 'Telling the user what happened, what is happening, and what is missing.',
  'data-display': 'Presenting information the user came to read.',
  overlay: 'Content floating above the page, modal and non-modal.',
};

export type { ComponentSpec, ComponentCategory };
export * from './types.js';

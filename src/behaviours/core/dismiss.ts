/** Light dismiss shared by menus, popovers and modal fallback surfaces. */

import { combine, on, type Cleanup } from './dom.js';

export interface DismissOptions {
  /** Elements that count as inside, usually the trigger. */
  exclude?: Array<Element | null | undefined>;
  /** Logical parent surface, including when a child is portaled. */
  parent?: Element | null;
  /** False reserves Escape for the surface's own handler (for example a dialog). */
  escape?: boolean;
  outsidePointer?: boolean;
  focusOut?: boolean;
  /** Parent means an owning surface closed; children must release their state. */
  onDismiss: (reason: 'escape' | 'pointer' | 'focus' | 'parent') => void;
}

interface Layer {
  surface: Element;
  options: DismissOptions;
  parent: Layer | null;
}

interface DismissStack {
  layers: Layer[];
  destroy: Cleanup;
}

const stacks = new WeakMap<Document, DismissStack>();

function contains(layer: Layer, node: Node): boolean {
  return layer.surface.contains(node) || (layer.options.exclude ?? []).some(el => el?.contains(node));
}

/** A native modal above a registered surface owns its own Escape/backdrop. */
function nativeDialogBoundary(event: Event, layer: Layer): boolean {
  const dialog = event.composedPath().find((node): node is HTMLDialogElement => {
    if (typeof HTMLDialogElement === 'undefined' || !(node instanceof HTMLDialogElement) || !node.open) return false;
    // open also includes modeless show() dialogs, which do not own the top layer.
    try { return node.matches(':modal'); }
    catch {
      // Older engines without :modal retain conservative native-dialog ownership.
      return true;
    }
  });
  if (!dialog || dialog.contains(layer.surface)) return false;
  for (let parent = layer.parent; parent; parent = parent.parent) {
    if (dialog.contains(parent.surface)) return false;
  }
  return true;
}

function createStack(doc: Document): DismissStack {
  const layers: Layer[] = [];
  const inside = (layer: Layer, event: Event): boolean => event.composedPath().some(node =>
    node instanceof Node && contains(layer, node)
  );

  function dismissOutside(event: Event, reason: 'pointer' | 'focus'): void {
    // Work from a snapshot: dismissal may remove an entire submenu chain.
    for (const layer of [...layers].reverse()) {
      if (!layers.includes(layer)) continue;
      if (nativeDialogBoundary(event, layer) || inside(layer, event)) return;
      // A logically nested/portaled child still belongs to its ancestor region.
      if (layers.some(child => {
        if (!inside(child, event)) return false;
        for (let parent = child.parent; parent; parent = parent.parent) {
          if (parent === layer) return true;
        }
        return false;
      })) return;
      const enabled = reason === 'pointer'
        ? layer.options.outsidePointer !== false
        : layer.options.focusOut === true;
      if (!enabled) return;
      layer.options.onDismiss(reason);
      // A dirty/blocking dialog may veto dismissal; do not close beneath it.
      if (layers.includes(layer)) return;
    }
  }

  const destroy = combine(
    on(doc, 'keydown', (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
      const layer = layers[layers.length - 1];
      if (!layer || nativeDialogBoundary(event, layer) || layer.options.escape === false) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      layer.options.onDismiss('escape');
    }, true),
    on(doc, 'pointerdown', (event: PointerEvent) => dismissOutside(event, 'pointer'), true),
    on(doc, 'focusin', (event: FocusEvent) => dismissOutside(event, 'focus'))
  );
  return { layers, destroy };
}

/** Register an open surface. Only the top layer can consume an Escape key. */
export function dismissable(surface: Element, options: DismissOptions): Cleanup {
  const doc = surface.ownerDocument;
  let stack = stacks.get(doc);
  if (!stack) { stack = createStack(doc); stacks.set(doc, stack); }
  const parent = [...stack.layers].reverse().find(layer => options.parent
    ? layer.surface === options.parent
    : layer.surface.contains(surface) || (options.exclude ?? []).some(el => el && contains(layer, el))
  ) ?? null;
  const layer: Layer = { surface, options, parent };
  stack.layers.push(layer);
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    // A parent can close programmatically without an outside event. Its open
    // descendants must release focus traps and positioners before it disappears.
    for (const child of [...stack.layers].reverse()) {
      if (child === layer || !stack.layers.includes(child)) continue;
      for (let ancestor = child.parent; ancestor; ancestor = ancestor.parent) {
        if (ancestor !== layer) continue;
        child.options.onDismiss('parent');
        break;
      }
    }
    const index = stack.layers.indexOf(layer);
    if (index >= 0) stack.layers.splice(index, 1);
    if (!stack.layers.length) { stack.destroy(); stacks.delete(doc); }
  };
}

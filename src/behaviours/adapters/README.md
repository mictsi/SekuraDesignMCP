# Framework adapters

Every adapter below is short. That is the point: because the controllers attach
to real DOM rather than to framework state, a binding only has to hand over a
ref and call `destroy` on teardown. There is no per-framework reimplementation of
the keyboard model, so there is nowhere for behaviour to diverge.

The same controller code runs in all of them, and the same
[behaviour tests](../../scripts/test-behaviours.ts) cover all of them.

---

## Plain HTML — no framework, no build step

```html
<script src="/sekura.iife.min.js"></script>
<script>Sekura.enhance()</script>

<button data-sk-menu-trigger="row-menu">Actions</button>
<div id="row-menu" class="sk-menu">
  <button role="menuitem">Edit zone</button>
  <button role="menuitem">Delete zone</button>
</div>
```

That is the whole integration. `enhance()` is idempotent, so server-rendered
stacks that swap HTML at runtime — htmx, Turbo, Blazor Server, Livewire, Unpoly
— just call it again after a swap:

```js
document.body.addEventListener('htmx:afterSwap', () => Sekura.enhance())
document.addEventListener('turbo:load', () => Sekura.enhance())
```

Or let it watch for you:

```js
Sekura.autoEnhance()   // MutationObserver, debounced to a microtask
```

---

## React

```tsx
import { useEffect, useRef } from 'react';
import { createMenu } from '@sekura/behaviours';

export function Menu({ children, label }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trigger.current || !menu.current) return;
    const controller = createMenu(trigger.current, menu.current);
    return controller.destroy;   // cleanup is the controller's own teardown
  }, []);

  return (
    <>
      <button ref={trigger} type="button" className="sk-button sk-button--secondary">
        {label}
      </button>
      <div ref={menu} className="sk-menu">{children}</div>
    </>
  );
}
```

Note what is *not* here: no keyboard handling, no `aria-expanded` bookkeeping, no
focus restore. The controller owns all of it.

---

## Vue 3

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createMenu, type Menu } from '@sekura/behaviours';

const trigger = ref<HTMLElement>();
const menu = ref<HTMLElement>();
let controller: Menu | undefined;

onMounted(() => {
  if (trigger.value && menu.value) controller = createMenu(trigger.value, menu.value);
});
onUnmounted(() => controller?.destroy());
</script>

<template>
  <button ref="trigger" type="button" class="sk-button sk-button--secondary">
    <slot name="label" />
  </button>
  <div ref="menu" class="sk-menu"><slot /></div>
</template>
```

---

## Svelte 5

A Svelte *action* is the natural fit — it receives the node and returns
`destroy`, which is exactly the controller's shape:

```svelte
<script lang="ts">
  import { createMenu } from '@sekura/behaviours';

  let menuEl: HTMLElement;

  function menu(node: HTMLElement) {
    const controller = createMenu(node, menuEl);
    return { destroy: controller.destroy };
  }
</script>

<button use:menu type="button" class="sk-button sk-button--secondary">Actions</button>
<div bind:this={menuEl} class="sk-menu">
  <button role="menuitem">Edit zone</button>
</div>
```

---

## Angular

A directive, for the same reason:

```ts
import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { createMenu, type Menu } from '@sekura/behaviours';

@Directive({ selector: '[skMenu]', standalone: true })
export class SkMenuDirective implements OnInit, OnDestroy {
  @Input('skMenu') menuId!: string;
  private controller?: Menu;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngOnInit() {
    const menu = document.getElementById(this.menuId);
    if (menu) this.controller = createMenu(this.host.nativeElement, menu);
  }
  ngOnDestroy() {
    this.controller?.destroy();
  }
}
```

---

## Blazor

Blazor has no DOM abstraction to fight, so the IIFE build and `enhance()` are the
whole story. Call it after render:

```csharp
@inject IJSRuntime JS

protected override async Task OnAfterRenderAsync(bool firstRender)
{
    // enhance() is idempotent, so calling it on every render is safe and cheap.
    await JS.InvokeVoidAsync("Sekura.enhance");
}
```

```html
<!-- _Host.cshtml / index.html -->
<script src="_content/Sekura/sekura.iife.min.js"></script>
```

For a controller handle you can drive from C#, store it on `window` from a small
JS module and call through `IJSObjectReference`.

---

## Web components

The controllers work unchanged inside a custom element. Use light DOM, not a
shadow root: Sekura styling comes from global custom properties, and a shadow
boundary would cut the component off from the theme.

```js
import { createMenu } from '@sekura/behaviours';

class SkMenu extends HTMLElement {
  connectedCallback() {
    this.controller = createMenu(
      this.querySelector('[slot="trigger"]'),
      this.querySelector('[slot="menu"]')
    );
  }
  disconnectedCallback() {
    this.controller?.destroy();
  }
}
customElements.define('sk-menu', SkMenu);
```

---

## What every adapter must do

1. **Call `destroy` on unmount.** Controllers register document-level listeners
   for light dismiss; leaking them leaks behaviour.
2. **Let the controller own the ARIA.** Do not also set `aria-expanded` from
   framework state — you will fight it, and one of you will lose at the wrong
   moment.
3. **Re-run `enhance()` after markup changes** if you use the attribute API.
4. **Do not wrap the surface in a shadow root** unless you are also solving
   theming, positioning and focus across the boundary yourself.

## What the controllers deliberately do not do

- Render markup. Your framework already does that better.
- Inject CSS. The stylesheet is separate and yours to load.
- Manage application state. `onSelect` hands you the element and value; what
  happens next is your business.

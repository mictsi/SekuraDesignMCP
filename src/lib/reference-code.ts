import { parse, parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import type { ComponentSpec } from '../data/components/types.js';
import type { Framework } from './codegen.js';

type Node = DefaultTreeAdapterMap['node'];
const voids = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const booleans = new Set('disabled checked selected multiple required readonly autofocus hidden open inert novalidate'.split(' '));
const reactAttrs: Record<string, string> = { class: 'className', for: 'htmlFor', datetime: 'dateTime', tabindex: 'tabIndex', readonly: 'readOnly', autofocus: 'autoFocus', autocomplete: 'autoComplete', spellcheck: 'spellCheck', inputmode: 'inputMode', maxlength: 'maxLength', minlength: 'minLength', colspan: 'colSpan', rowspan: 'rowSpan', novalidate: 'noValidate', 'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin', 'fill-rule': 'fillRule', 'clip-rule': 'clipRule', 'xlink:href': 'href' };
const refs = new Set('for aria-controls aria-labelledby aria-describedby aria-activedescendant aria-owns headers data-sk-combobox data-sk-tag-input data-sk-menu-trigger data-sk-popover-trigger data-sk-tooltip-target data-sk-dialog-open data-sk-drawer-open data-sk-disclosure'.split(' '));
const escape = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Parse authored HTML; every framework receives the same native element tree. */
function markup(spec: ComponentSpec, framework: Framework): string {
  const doc = /<html\b/i.test(spec.html) ? parse(spec.html) : parseFragment(spec.html);
  const ids = new Set<string>();
  const collect = (node: Node): void => {
    if ('attrs' in node) for (const attr of node.attrs) if (attr.name === 'id') ids.add(attr.value);
    if ('childNodes' in node) node.childNodes.forEach(collect);
  };
  collect(doc);
  const idExpression = (value: string, name: string): string | null => {
    if (name === 'id' || refs.has(name)) {
      const words = value.split(/\s+/);
      if (words.some(word => ids.has(word))) return words.map(word => ids.has(word) ? `instanceId + ${JSON.stringify('-' + word)}` : JSON.stringify(word)).join(' + " " + ');
    }
    if (name === 'href' && value.startsWith('#') && ids.has(value.slice(1))) return `"#" + instanceId + ${JSON.stringify('-' + value.slice(1))}`;
    return null;
  };
  const render = (node: Node): string => {
    if (node.nodeName === '#text' && 'value' in node) {
      if (framework === 'react') return node.value.trim() ? `{${JSON.stringify(node.value)}}` : node.value;
      return escape(node.value).replace(/\{/g, '&#123;').replace(/\}/g, '&#125;').replace(/@/g, '&#64;');
    }
    if (!('tagName' in node)) return 'childNodes' in node ? node.childNodes.map(render).join('') : '';
    if (['script', 'style', 'head'].includes(node.tagName)) return '';
    if (node.tagName === 'html') return node.childNodes.map(render).join('');
    const tag = node.tagName === 'body' ? 'div' : node.tagName;
    const attrs = node.attrs.filter(a => !a.name.startsWith('on')).map(attr => {
      let name = attr.name; const value = attr.value;
      const expression = idExpression(value, name);
      if (framework === 'react') {
        name = reactAttrs[name] ?? name;
        if (name === 'checked') name = 'defaultChecked';
        if (name === 'value' && ['input', 'textarea', 'select'].includes(tag)) name = 'defaultValue';
        if (name === 'selected') return '';
        if (name === 'style') {
          const style = Object.fromEntries(value.split(';').filter(x => x.includes(':')).map(x => {
            const colon = x.indexOf(':'); const key = x.slice(0, colon).trim();
            return [key.startsWith('--') ? key : key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), x.slice(colon + 1).trim()];
          }));
          return `style={${JSON.stringify(style)} as CSSProperties}`;
        }
        if (name === 'hidden' && value === 'until-found') return 'hidden={true} data-sk-findable';
        if (['tabIndex', 'maxLength', 'minLength', 'rows', 'cols', 'colSpan', 'rowSpan', 'size', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-posinset', 'aria-setsize', 'aria-level'].includes(name)) return `${name}={${Number(value)}}`;
        if (expression) return `${name}={${expression}}`;
        if (booleans.has(attr.name) && !(attr.name === 'hidden' && value === 'until-found')) return `${name}={true}`;
        return `${name}=${JSON.stringify(value)}`;
      }
      if (expression) {
        if (framework === 'vue') return `:${name}="${escape(expression)}"`;
        if (framework === 'svelte') return `${name}={${expression}}`;
        if (framework === 'angular') return `[attr.${name}]="${escape(expression)}"`;
        if (framework === 'blazor') return `${name}="@(${expression.replace(/instanceId/g, 'InstanceId')})"`;
      }
      return `${name}="${escape(value)}"`;
    }).filter(Boolean).join(' ');
    const children = node.childNodes.map(render).join('');
    if (voids.has(tag)) return `<${tag}${attrs ? ' ' + attrs : ''}${framework === 'react' ? ' /' : ''}>`;
    if (tag === 'textarea' && framework === 'react') return `<textarea ${attrs} defaultValue={${JSON.stringify(node.childNodes.filter(n => 'value' in n).map(n => 'value' in n ? n.value : '').join(''))}} />`;
    return `<${tag}${attrs ? ' ' + attrs : ''}>${children}</${tag}>`;
  };
  return render(doc);
}

export function referenceCode(spec: ComponentSpec, framework: Framework): string {
  const name = spec.id.split('-').map(s => s[0]!.toUpperCase() + s.slice(1)).join('');
  const html = markup(spec, framework);
  const note = `Sekura ${spec.name}: editable reference recipe. Load sekura.css (includes dependencies).\nApplication owns data, persistence and action outcomes; controllers own keyboard/ARIA state.\nReplace the reference children with your content while preserving native elements and data-sk-* markers.`;
  if (framework === 'react') return `/** ${note} */
import { useEffect, useId, useRef, type ReactNode, type CSSProperties, type HTMLAttributes } from 'react';
import { enhance } from '@sekura/behaviours';
export interface ${name}Props extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  onReady?: (root: HTMLDivElement) => void | (() => void);
}
export function ${name}({ children, onReady, ...props }: ${name}Props) {
  const instanceId = useId();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current) return;
    const controller = enhance(root.current);
    const cleanup = onReady?.(root.current);
    return () => { cleanup?.(); controller.destroy(); };
  }, [children, onReady]);
  return <div {...props} ref={root}>{children ?? <>${html}</>}</div>;
}
`;
  if (framework === 'vue') return `<!-- ${note} -->
<script setup lang="ts">
import { onMounted, onBeforeUnmount, useId, ref } from 'vue';
import { autoEnhance } from '@sekura/behaviours';
const instanceId = useId();
const root = ref<HTMLDivElement>();
let cleanup: (() => void) | undefined;
onMounted(() => { if (root.value) cleanup = autoEnhance(root.value); });
onBeforeUnmount(() => cleanup?.());
</script>
<template><div ref="root"><slot>${html}</slot></div></template>
`;
  if (framework === 'svelte') return `<!-- ${note} -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { autoEnhance } from '@sekura/behaviours';
  const instanceId = $props.id();
  let { children }: { children?: Snippet } = $props();
  function wire(node: HTMLDivElement) { return { destroy: autoEnhance(node) }; }
</script>
<div use:wire>{#if children}{@render children()}{:else}${html}{/if}</div>
`;
  if (framework === 'angular') return `/** ${note} */
import { Component, ElementRef, Input, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { autoEnhance } from '@sekura/behaviours';
@Component({ selector: 'sk-${spec.id}-example', standalone: true, template: ${JSON.stringify(html)} })
export class ${name}Example implements AfterViewInit, OnDestroy {
  // Supply a unique, stable prefix per instance, including during server rendering.
  @Input({ required: true }) instanceId!: string;
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private cleanup?: () => void;
  ngAfterViewInit() { this.cleanup = autoEnhance(this.host.nativeElement); }
  ngOnDestroy() { this.cleanup?.(); }
}
`;
  if (framework === 'blazor') return `@* ${note}
Load sekura.iife.min.js before rendering this component.
*@
@using Microsoft.JSInterop
@implements IAsyncDisposable
@inject IJSRuntime JS
<div @ref="Root">${html}</div>
@code {
  private ElementReference Root;
  private string InstanceId { get; } = "sk-" + Guid.NewGuid().ToString("N");
  protected override async Task OnAfterRenderAsync(bool firstRender) {
    await JS.InvokeVoidAsync("Sekura.enhance", Root);
  }
  public async ValueTask DisposeAsync() {
    try { await JS.InvokeVoidAsync("Sekura.dispose", Root); }
    catch (JSDisconnectedException) { }
  }
}
`;
  return `/** ${note} */
import { autoEnhance, scopeIds } from '@sekura/behaviours';
export class ${name}Example extends HTMLElement {
  private cleanup?: () => void;
  connectedCallback() {
    if (!this.hasChildNodes()) this.innerHTML = ${JSON.stringify(html)};
    scopeIds(this, this.id || 'sk-' + crypto.randomUUID());
    this.cleanup = autoEnhance(this);
  }
  disconnectedCallback() { this.cleanup?.(); this.cleanup = undefined; }
}
if (!customElements.get('sk-${spec.id}-example')) customElements.define('sk-${spec.id}-example', ${name}Example);
`;
}

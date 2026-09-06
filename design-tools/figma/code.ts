interface Variant {
  id: string; theme: string; density: string; state: string; height: number; width: number;
  background: string; color: string; border: string; borderWidth: number; radius: number;
  fontSize: number; lineHeight: number; paddingX: number; paddingY: number;
  surface: string; text: string; secondary: string; error: string; thumb: string | null;
  implementation: Record<string, unknown>;
}
declare const __KIT__: { version: string; coverage: string[]; items: Variant[] };
function paint(css: string): SolidPaint[] {
  if (!css || css === 'transparent') return [];
  const hex = css.match(/^#([0-9a-f]{6})$/i);
  const rgb = css.match(/[\d.]+/g)?.map(Number);
  const channels = hex ? [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16)) : rgb;
  if (!channels || channels.length < 3) throw new Error(`Unsupported CSS color: ${css}`);
  return [{ type: 'SOLID', color: { r: channels[0] / 255, g: channels[1] / 255, b: channels[2] / 255 }, opacity: channels[3] ?? 1 }];
}
function label(value: string, color: string, size = 14): TextNode {
  const node = figma.createText(); node.fontName = { family: 'Inter', style: 'Regular' };
  node.fontSize = size; node.characters = value; node.fills = paint(color); node.textAutoResize = 'WIDTH_AND_HEIGHT'; return node;
}
function frame(): FrameNode {
  const node = figma.createFrame(); node.fills = []; node.layoutMode = 'HORIZONTAL';
  node.primaryAxisSizingMode = 'AUTO'; node.counterAxisSizingMode = 'AUTO'; node.counterAxisAlignItems = 'CENTER'; return node;
}
async function main() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  const page = figma.createPage(); page.name = `Sekura controls ${__KIT__.version}`; await figma.setCurrentPageAsync(page);
  let y = 0; const sets: ComponentSetNode[] = [];
  for (const id of __KIT__.coverage) {
    const variants: ComponentNode[] = []; const records = __KIT__.items.filter(v => v.id === id);
    for (const v of records) {
      const component = figma.createComponent(); component.name = `Theme=${v.theme}, Density=${v.density}, State=${v.state}`;
      component.layoutMode = 'VERTICAL'; component.primaryAxisSizingMode = 'AUTO'; component.counterAxisSizingMode = 'AUTO'; component.itemSpacing = 8;
      component.fills = paint(v.surface); component.description = `${id} · ${__KIT__.version}. CSS-derived starter control. Application owns validation, persistence and permissions. ${JSON.stringify(v.implementation)}`;
      component.setPluginData('sekura', JSON.stringify({ version: __KIT__.version, componentId: id, implementation: v.implementation }));
      const check = id === 'checkbox' || id === 'switch';
      if (!check && id !== 'button') component.appendChild(label(id === 'text-field' ? 'Project name' : id === 'select' ? 'Team' : 'Notes', v.text));
      const control = frame(); control.name = 'Control'; control.fills = paint(v.background); control.strokes = paint(v.border); control.strokeWeight = v.borderWidth; control.cornerRadius = v.radius;
      control.paddingLeft = v.paddingX; control.paddingRight = v.paddingX; control.paddingTop = v.paddingY; control.paddingBottom = v.paddingY;
      control.minHeight = v.height;
      if (check) {
        control.primaryAxisSizingMode = 'FIXED'; control.counterAxisSizingMode = 'FIXED'; control.resize(v.width, v.height);
        const row = frame(); row.itemSpacing = 10; row.appendChild(control); row.appendChild(label('Allow notifications', v.text)); component.appendChild(row);
        if (id === 'switch') {
          const thumb = figma.createEllipse(); thumb.resize(v.height - 6, v.height - 6); thumb.fills = paint(v.thumb!); control.appendChild(thumb);
          control.primaryAxisAlignItems = v.state === 'checked' ? 'MAX' : 'MIN';
        } else if (v.state === 'checked') {
          control.primaryAxisAlignItems = 'CENTER';
          const tick = figma.createNodeFromSvg('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 16 16"><path d="M13.5 4.5l-7 7L3 8" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
          for (const vector of tick.findAll(n => n.type === 'VECTOR')) (vector as VectorNode).strokes = paint(v.color);
          control.appendChild(tick);
        }
      } else {
        const text = label(id === 'button' ? 'Save project' : id === 'select' ? 'Design team' : id === 'textarea' ? 'Project notes' : 'Website redesign', v.color, v.fontSize);
        text.lineHeight = { unit: 'PIXELS', value: v.lineHeight }; control.appendChild(text);
        if (id !== 'button') { control.primaryAxisSizingMode = 'FIXED'; control.resize(320, Math.max(v.height, 40)); text.layoutGrow = 1; text.textAutoResize = 'HEIGHT'; }
        if (id === 'select') control.appendChild(label('⌄', v.color));
        component.appendChild(control);
        if (id !== 'button') { const hint = label(v.state === 'invalid' ? 'Enter a valid value.' : 'Visible to your team.', v.state === 'invalid' ? (v.error || v.text) : v.secondary, 12); component.appendChild(hint); }
      }
      component.x = (variants.length % 4) * 400; component.y = Math.floor(variants.length / 4) * 180;
      variants.push(component);
    }
    const set = figma.combineAsVariants(variants, page); set.name = `Sekura / ${id}`; set.x = 0; set.y = y; y += set.height + 120; sets.push(set);
    // Interactive state changes are explicit examples, not promises of backend persistence.
    if (id === 'button' || id === 'checkbox' || id === 'switch') {
      for (let i = 0; i < records.length; i++) {
        const v = records[i]; if (v.state === 'disabled') continue;
        const next = records.findIndex(r => r.theme === v.theme && r.density === v.density && r.state === (v.state === 'rest' ? (id === 'button' ? 'busy' : 'checked') : 'rest'));
        await variants[i].setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: variants[next].id, navigation: 'CHANGE_TO', transition: null, preserveScrollPosition: false }] }]);
      }
    }
  }
  figma.viewport.scrollAndZoomIntoView(sets); figma.closePlugin(`Created ${sets.length} editable sets. Review typography and prototype behavior before publishing.`);
}
main().catch(error => figma.closePlugin(String(error)));

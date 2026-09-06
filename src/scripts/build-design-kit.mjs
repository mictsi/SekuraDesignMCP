/** Derive native design-tool controls from the browser's resolved production CSS. */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { build } from 'esbuild';
import { components } from '../../dist/data/components/index.js';
const {version}=JSON.parse(readFileSync('package.json','utf8'));
const browser=await chromium.launch(); const page=await browser.newPage();
const items=[];
try {
  await page.setContent('<style>'+readFileSync('dist-css/sekura.css','utf8')+'</style><div id="preview"></div>');
  for(const id of ['button','text-field','textarea','select','checkbox','switch']) {
    const spec=components.find(c=>c.id===id);
    for(const theme of ['light','dark','hc-light','hc-dark']) for(const density of ['comfortable','compact','dense']) for(const state of (['checkbox','switch'].includes(id)?['rest','checked','disabled']:id==='button'?['rest','busy','disabled']:['rest','invalid','disabled'])) {
      const data=await page.evaluate(({id,theme,density,state})=>{
        document.documentElement.dataset.skTheme=theme; document.documentElement.dataset.skDensity=density;
        const root=document.getElementById('preview');
        const disabled=state==='disabled'?' disabled':''; const invalid=state==='invalid'?' aria-invalid="true"':'';
        root.innerHTML=id==='button'?`<button class="sk-button sk-button--primary" ${disabled} ${state==='busy'?'aria-busy="true"':''}>Save project</button>`:
          id==='checkbox'?`<label class="sk-checkbox"><input type="checkbox" class="sk-checkbox__input"${disabled}${state==='checked'?' checked':''}><span class="sk-checkbox__box"></span><span>Allow notifications</span></label>`:
          id==='switch'?`<label class="sk-switch"><input type="checkbox" class="sk-switch__input"${disabled}${state==='checked'?' checked':''}><span class="sk-switch__track"><span class="sk-switch__thumb"></span></span><span>Allow notifications</span></label>`:
          id==='textarea'?`<textarea class="sk-textarea" rows="3"${disabled}${invalid}>Project notes</textarea>`:
          id==='select'?`<select class="sk-select"${disabled}${invalid}><option>Design team</option></select>`:`<input class="sk-input" value="Website redesign"${disabled}${invalid}>`;
        const element=root.querySelector(id==='checkbox'?'.sk-checkbox__box':id==='switch'?'.sk-switch__track':':scope > *');
        const css=getComputedStyle(element); const tokens=getComputedStyle(document.documentElement);
        const number=p=>parseFloat(css[p])||0;
        return {height:element.getBoundingClientRect().height,width:element.getBoundingClientRect().width,background:css.backgroundColor,color:css.color,border:css.borderTopColor,borderWidth:number('borderTopWidth'),radius:number('borderTopLeftRadius'),fontSize:number('fontSize'),lineHeight:number('lineHeight')||20,paddingX:number('paddingLeft'),paddingY:number('paddingTop'),surface:tokens.getPropertyValue('--sk-color-surface-base').trim(),text:['checkbox','switch'].includes(id)?getComputedStyle(root.firstElementChild).color:tokens.getPropertyValue('--sk-color-text-primary').trim(),secondary:tokens.getPropertyValue('--sk-color-text-secondary').trim(),error:tokens.getPropertyValue('--sk-color-status-danger-text').trim(),thumb:id==='switch'?getComputedStyle(root.querySelector('.sk-switch__thumb')).backgroundColor:null};
      },{id,theme,density,state});
      items.push({id,theme,density,state,...data,implementation:spec.implementation});
    }
  }
} finally {await browser.close();}
mkdirSync('dist-design-kit',{recursive:true});
const kit={schemaVersion:1,version,coverage:['button','text-field','textarea','select','checkbox','switch'],items};
writeFileSync('dist-design-kit/components.json',JSON.stringify(kit,null,2)+'\n');
await build({entryPoints:['design-tools/figma/code.ts'],outfile:'dist-design-kit/code.js',bundle:true,format:'iife',target:'es2020',define:{__KIT__:JSON.stringify(kit)}});
// Figma assigns an ID when a local plugin is created/published; do not invent an account ID.
writeFileSync('dist-design-kit/manifest.json',JSON.stringify({name:`Sekura controls ${version}`,api:'1.0.0',main:'code.js',editorType:['figma'],documentAccess:'dynamic-page',networkAccess:{allowedDomains:['none']}},null,2)+'\n'); // version-check-ignore
copyFileSync('design-tools/figma/README.md','dist-design-kit/README.md');
console.log(`Design kit: ${items.length} native variants across ${kit.coverage.length} component sets, 4 themes and 3 densities.`);

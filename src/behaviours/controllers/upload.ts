import { combine, emit, on, type Cleanup } from '../core/dom.js';

export interface UploadOptions {
  maxBytes?: number;
  onChange?: (files: File[]) => void;
  /** Supply transport explicitly. Without it the control selects files only. */
  upload?: (file: File, signal: AbortSignal, progress: (percent: number) => void) => Promise<void>;
}
export function createUpload(root: HTMLElement, options: UploadOptions = {}): { destroy: Cleanup; readonly files: File[] } {
  const input = root.querySelector<HTMLInputElement>('input[type="file"]');
  const list = root.querySelector<HTMLElement>('.sk-upload__list');
  if (!input || !list) return { destroy() {}, files: [] };
  let status = root.querySelector<HTMLElement>('[role="status"]'); const ownsStatus = !status;
  if (!status) { status = document.createElement('p'); status.className = 'sk-field__hint'; status.setAttribute('role', 'status'); root.appendChild(status); }
  const entries: Array<{ file: File; node: HTMLElement; abort: AbortController }> = [];
  let destroyed = false, used = false, dragDepth = 0;
  const requestedMax = options.maxBytes ?? Number(root.dataset.skMaxBytes || 10 * 1024 * 1024);
  const maxBytes = Number.isFinite(requestedMax) && requestedMax >= 0 ? requestedMax : 10 * 1024 * 1024;
  const say = (message: string): void => { if (!destroyed) status!.textContent = message; };
  const update = (): void => { const files = entries.map(e => e.file); options.onChange?.(files); emit(root, 'sk:upload:change', { files }); };
  const clear = (): void => { entries.splice(0).forEach(e => { e.abort.abort(); e.node.remove(); }); };
  function accepts(file: File): boolean {
    const types = input!.accept.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    return !types.length || types.some(type => type.startsWith('.') ? file.name.toLowerCase().endsWith(type) : type.endsWith('/*') ? file.type.toLowerCase().startsWith(type.slice(0, -1)) : file.type.toLowerCase() === type);
  }
  function select(files: FileList | File[]): void {
    if (destroyed || input!.disabled) return;
    const rejected: string[] = [];
    for (const file of Array.from(files).slice(0, input!.multiple ? undefined : 1)) {
      if (!accepts(file)) { rejected.push(`${file.name} was not added. Accepted types: ${input!.accept}.`); continue; }
      if (file.size > maxBytes) { rejected.push(`${file.name} was not added. Maximum size is ${maxBytes} bytes.`); continue; }
      if (entries.some(e => e.file.name === file.name && e.file.size === file.size && e.file.lastModified === file.lastModified)) { say(`${file.name} is already selected.`); continue; }
      if (!used) { list!.replaceChildren(); used = true; }
      if (!input!.multiple) clear();
      const node = document.createElement('li'); node.className = 'sk-upload__file';
      const name = document.createElement('span'); name.className = 'sk-upload__file-name'; name.textContent = file.name;
      const size = document.createElement('span'); size.className = 'sk-upload__file-meta'; size.textContent = file.size < 1024 ? `${file.size} B` : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`;
      const state = document.createElement('span'); state.className = 'sk-upload__file-meta'; state.dataset.skUploadState = ''; state.textContent = 'Selected';
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'sk-button sk-button--ghost sk-button--sm';
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'sk-button sk-button--secondary sk-button--sm'; retry.textContent = 'Retry'; retry.setAttribute('aria-label', `Retry ${file.name}`); retry.hidden = true;
      const entry = { file, node, abort: new AbortController() }; entries.push(entry);
      function removalLabel(uploading: boolean): void { const label = uploading ? 'Cancel' : 'Remove'; remove.textContent = label; remove.setAttribute('aria-label', `${label} ${file.name}`); }
      removalLabel(false); node.append(name, size, state, retry, remove); list!.appendChild(node);
      async function start(): Promise<void> {
        if (!options.upload || destroyed || input!.disabled || !entries.includes(entry)) return;
        entry.abort.abort(); const attempt = new AbortController(); entry.abort = attempt;
        node.setAttribute('data-uploading', ''); node.removeAttribute('data-error'); node.removeAttribute('data-complete');
        retry.hidden = true; retry.disabled = true; state.textContent = 'Uploading'; removalLabel(true);
        let settled = false;
        const current = () => !settled && !destroyed && !attempt.signal.aborted && entry.abort === attempt && entries.includes(entry);
        try {
          await options.upload(file, attempt.signal, percent => {
            if (!current() || !Number.isFinite(percent)) return;
            const value = Math.max(0, Math.min(100, Math.round(percent))); state.textContent = `${value}%`;
            state.setAttribute('role', 'progressbar'); state.setAttribute('aria-label', `Uploading ${file.name}`); state.setAttribute('aria-valuemin', '0'); state.setAttribute('aria-valuemax', '100'); state.setAttribute('aria-valuenow', String(value));
          });
          if (!current()) return; state.textContent = 'Uploaded'; node.setAttribute('data-complete', ''); say(`${file.name} uploaded.`);
        } catch {
          if (!current()) return; state.textContent = 'Upload failed'; node.setAttribute('data-error', ''); retry.hidden = false; say(`${file.name} failed. Retry or remove it.`);
        } finally {
          if (current()) { node.removeAttribute('data-uploading'); retry.disabled = input!.disabled; removalLabel(false); ['role', 'aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow'].forEach(name => state.removeAttribute(name)); }
          settled = true;
        }
      }
      retry.onclick = () => { void start(); };
      remove.onclick = () => { if (destroyed || input!.disabled) return; entry.abort.abort(); const index = entries.indexOf(entry); if (index < 0) return; entries.splice(index, 1); node.remove(); update(); input!.focus(); say(`${file.name} removed.`); };
      update(); say(`${entries.length} file${entries.length === 1 ? '' : 's'} selected.`); void start();
    }
    if (rejected.length) say(rejected.join(' '));
  }
  const zone = root.querySelector<HTMLElement>('.sk-upload__zone') ?? root;
  const syncDisabled = () => { for (const entry of entries) entry.node.querySelectorAll('button').forEach(button => { button.disabled = input.disabled; }); };
  const observer = new MutationObserver(syncDisabled); observer.observe(input, { attributes: true, attributeFilter: ['disabled'] });
  const cleanup = combine(
    on(list, 'click', (event: MouseEvent) => {
      const button = (event.target as Element).closest('button'); const node = button?.closest<HTMLElement>('.sk-upload__file');
      if (!node || entries.some(entry => entry.node === node) || input.disabled) return;
      const name = node.querySelector('.sk-upload__file-name')?.textContent; node.remove(); input.focus(); say(`${name ?? 'Example file'} removed.`);
    }),
    on(input, 'change', () => { if (input.files) select(input.files); input.value = ''; }),
    input.form ? on(input.form, 'reset', () => { clear(); list.replaceChildren(); input.value = ''; update(); say('File selection cleared.'); }) : undefined,
    on(zone, 'dragenter', (event: DragEvent) => { event.preventDefault(); if (!input.disabled) { dragDepth++; root.setAttribute('data-dragover', ''); } }),
    on(zone, 'dragover', (event: DragEvent) => { event.preventDefault(); if (!input.disabled) root.setAttribute('data-dragover', ''); }),
    on(zone, 'dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) root.removeAttribute('data-dragover'); }),
    on(zone, 'drop', (event: DragEvent) => { event.preventDefault(); dragDepth = 0; root.removeAttribute('data-dragover'); if (event.dataTransfer?.files) select(event.dataTransfer.files); })
  );
  return { get files() { return entries.map(e => e.file); }, destroy() { destroyed = true; cleanup(); observer.disconnect(); root.removeAttribute('data-dragover'); entries.forEach(e => { e.abort.abort(); e.node.querySelectorAll('button').forEach(button => { button.onclick = null; }); }); if (ownsStatus) status!.remove(); } };
}

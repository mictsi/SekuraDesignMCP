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
  const status = root.querySelector<HTMLElement>('[role="status"]');
  const entries: Array<{ file: File; node: HTMLElement; abort: AbortController }> = [];
  let destroyed = false;
  const say = (message: string): void => { if (status) status.textContent = message; };
  const update = (): void => { const files = entries.map(e => e.file); options.onChange?.(files); emit(root, 'sk:upload:change', { files }); };
  function accept(file: File): boolean {
    const types = input!.accept.split(',').map(s => s.trim()).filter(Boolean);
    return !types.length || types.some(type => type.startsWith('.') ? file.name.toLowerCase().endsWith(type.toLowerCase()) : type.endsWith('/*') ? file.type.startsWith(type.slice(0, -1)) : file.type === type);
  }
  function add(files: FileList | File[]): void {
    if (input!.disabled) return;
    for (const file of Array.from(files).slice(0, input!.multiple ? undefined : 1)) {
      if (!accept(file) || file.size > (options.maxBytes ?? 10 * 1024 * 1024)) { say(`${file.name}: choose an accepted file smaller than ${Math.round((options.maxBytes ?? 10485760) / 1048576)} MB.`); continue; }
      if (entries.some(e => e.file.name === file.name && e.file.size === file.size)) { say(`${file.name} is already selected.`); continue; }
      const node = document.createElement('li'); node.className = 'sk-upload__file';
      const name = document.createElement('span'); name.className = 'sk-upload__file-name'; name.textContent = file.name;
      const state = document.createElement('span'); state.className = 'sk-upload__file-meta'; state.textContent = 'Selected';
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'sk-button sk-button--ghost sk-button--sm'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove ${file.name}`);
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'sk-button sk-button--secondary sk-button--sm'; retry.textContent = 'Retry'; retry.setAttribute('aria-label', `Retry ${file.name}`); retry.hidden = true;
      const entry = { file, node, abort: new AbortController() }; entries.push(entry);
      node.append(name, state, retry, remove); list!.appendChild(node);
      async function start(): Promise<void> {
        if (!options.upload) return;
        entry.abort = new AbortController(); retry.hidden = true; state.textContent = 'Uploading'; remove.textContent = 'Cancel';
        try {
          await options.upload(file, entry.abort.signal, percent => { if (!destroyed && !entry.abort.signal.aborted) state.textContent = `${Math.max(0, Math.min(100, Math.round(percent)))}%`; });
          if (destroyed || entry.abort.signal.aborted) return;
          state.textContent = 'Uploaded'; remove.textContent = 'Remove'; say(`${file.name} uploaded.`);
        } catch {
          if (destroyed || entry.abort.signal.aborted) return;
          state.textContent = 'Upload failed'; retry.hidden = false; remove.textContent = 'Remove'; say(`${file.name} failed. Retry or remove it.`);
        }
      }
      retry.onclick = () => { void start(); };
      remove.onclick = () => { entry.abort.abort(); entries.splice(entries.indexOf(entry), 1); node.remove(); update(); input!.focus(); say(`${file.name} removed.`); };
      update(); say(`${entries.length} files selected.`); void start();
    }
  }
  // Reference files are illustrative. Replace them when the user selects files.
  let used = false;
  function select(files: FileList | File[]): void { if (!used) { list!.replaceChildren(); used = true; } add(files); }
  const zone = root.querySelector<HTMLElement>('.sk-upload__zone') ?? root;
  const cleanup = combine(
    on(list, 'click', (event: MouseEvent) => {
      // Authored example rows have no File object, but their remove action still works.
      const button = (event.target as Element).closest('button');
      const node = button?.closest<HTMLElement>('.sk-upload__file');
      if (!node || entries.some(entry => entry.node === node) || input.disabled) return;
      const name = node.querySelector('.sk-upload__file-name')?.textContent;
      node.remove(); input.focus(); say(`${name ?? 'Example file'} removed.`);
    }),
    on(input, 'change', () => { if (input.files) select(input.files); input.value = ''; }),
    on(zone, 'dragover', (event: DragEvent) => { event.preventDefault(); root.setAttribute('data-dragover', ''); }),
    on(zone, 'dragleave', () => root.removeAttribute('data-dragover')),
    on(zone, 'drop', (event: DragEvent) => { event.preventDefault(); root.removeAttribute('data-dragover'); if (event.dataTransfer?.files) select(event.dataTransfer.files); })
  );
  return { get files() { return entries.map(e => e.file); }, destroy() { destroyed = true; cleanup(); entries.forEach(e => { e.abort.abort(); e.node.querySelectorAll('button').forEach(button => { button.onclick = null; }); }); } };
}

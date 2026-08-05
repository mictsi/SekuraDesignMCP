/**
 * A small Markdown renderer, scoped to exactly the subset the foundation
 * documents use: headings, paragraphs, lists, tables, fenced code, blockquotes,
 * and inline code/emphasis/links.
 *
 * Written rather than pulled in so the documentation site is generated from the
 * same source the MCP server serves, with no dependency that could drift.
 */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Stable, URL-safe id for a heading, so the on-page contents can link to it. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_[\]()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Minimal highlighter for the two languages the docs actually show. Deliberately
 * naive: it tags obvious tokens and leaves everything else alone, which is
 * better than a heavy dependency and honest about what it does.
 *
 * The token classes map onto the audited chart palette, so highlighted code
 * inherits verified per-theme contrast rather than needing its own audit.
 */
function highlight(code: string, lang: string): string {
  const escaped = escapeHtml(code);

  if (lang === 'html') {
    return escaped
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-comment">$1</span>')
      .replace(/(&lt;\/?)([a-zA-Z][\w-]*)/g, '$1<span class="tok-keyword">$2</span>')
      .replace(/([a-zA-Z-]+)(=)(&quot;[^&]*?&quot;)/g, '<span class="tok-function">$1</span>$2<span class="tok-string">$3</span>');
  }

  if (lang === 'css' || lang === 'scss') {
    return escaped
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>')
      .replace(/(--[a-z0-9-]+)/gi, '<span class="tok-function">$1</span>')
      .replace(/(^|[;{\s])([a-z-]+)(\s*:)/gm, '$1<span class="tok-keyword">$2</span>$3');
  }

  if (lang === 'bash' || lang === 'sh') {
    return escaped.replace(/(#.*)$/gm, '<span class="tok-comment">$1</span>');
  }

  if (lang === 'ts' || lang === 'tsx' || lang === 'js' || lang === 'json') {
    return escaped
      .replace(/(\/\/.*)$/gm, '<span class="tok-comment">$1</span>')
      .replace(/(&quot;[^&]*?&quot;|'[^']*?')/g, '<span class="tok-string">$1</span>')
      .replace(/\b(const|let|import|export|from|function|return|interface|type|await|async|new)\b/g,
        '<span class="tok-keyword">$1</span>');
  }

  return escaped;
}

interface RenderOptions {
  /** Heading level the document starts at. Foundation bodies begin at h2. */
  headingOffset?: number;
  /** Collected as a side effect, for building the on-page contents. */
  headings?: Array<{ level: number; text: string; id: string }>;
  /**
   * Prepended to every generated heading id. Needed when a page also has
   * hand-written sections, because a foundation's "## Families" would otherwise
   * collide with a section of the same name — and duplicate ids silently break
   * both anchor links and aria references.
   */
  idPrefix?: string;
}

function inline(text: string): string {
  let out = escapeHtml(text);

  // Inline code is extracted first, so its contents are never treated as
  // emphasis. The sentinel is a NUL byte, which cannot occur in the source —
  // a numeric placeholder would corrupt any number in the prose.
  const codeSlots: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => {
    codeSlots.push(`<code class="sk-code">${code}</code>`);
    return `\u0000${codeSlots.length - 1}\u0000`;
  });

  out = out
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="sk-link" href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codeSlots[Number(i)]!);
}

export function renderMarkdown(md: string, options: RenderOptions = {}): string {
  const offset = options.headingOffset ?? 0;
  const collect = options.headings;
  const idPrefix = options.idPrefix ?? '';
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;

  const flushParagraph = (buffer: string[]) => {
    if (buffer.length === 0) return;
    out.push(`<p>${inline(buffer.join(' '))}</p>`);
    buffer.length = 0;
  };

  const paragraph: string[] = [];

  while (i < lines.length) {
    const line = lines[i]!;

    /* ---- Fenced code ---- */
    if (/^```/.test(line)) {
      flushParagraph(paragraph);
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i]!)) {
        body.push(lines[i]!);
        i += 1;
      }
      i += 1;
      const label = lang || 'code';
      out.push(
        `<figure class="sk-code-block docs-code">` +
          `<figcaption class="sk-code-block__header">` +
            `<span class="sk-code-block__language">${escapeHtml(label)}</span>` +
            `<button type="button" class="sk-button sk-button--ghost sk-button--sm" data-sk-copy-block>` +
              `<svg class="sk-button__icon" aria-hidden="true" focusable="false" width="14" height="14"><use href="#sk-icon-copy"></use></svg>` +
              `<span class="sk-button__label" data-sk-copy-label>Copy</span>` +
            `</button>` +
          `</figcaption>` +
          `<div class="sk-code-block__scroll" tabindex="0" role="region" aria-label="${escapeHtml(label)} example">` +
            `<pre class="sk-code-block__pre"><code>${highlight(body.join('\n'), lang)}</code></pre>` +
          `</div>` +
        `</figure>`
      );
      continue;
    }

    /* ---- Table ---- */
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1]!.trim())) {
      flushParagraph(paragraph);
      const header = line.split('|').slice(1, -1).map((c) => c.trim());
      const alignRow = lines[i + 1]!.split('|').slice(1, -1).map((c) => c.trim());
      const align = alignRow.map((c) =>
        c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'end' : 'start'
      );
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|/.test(lines[i]!)) {
        rows.push(lines[i]!.split('|').slice(1, -1).map((c) => c.trim()));
        i += 1;
      }
      const thead = header
        .map((c, n) => `<th scope="col" style="text-align:${align[n] ?? 'start'}">${inline(c)}</th>`)
        .join('');
      const tbody = rows
        .map(
          (r) =>
            `<tr>${r
              .map((c, n) => `<td style="text-align:${align[n] ?? 'start'}">${inline(c)}</td>`)
              .join('')}</tr>`
        )
        .join('');
      out.push(
        `<div class="sk-table docs-table" role="region" tabindex="0" aria-label="Table">` +
          `<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>` +
        `</div>`
      );
      continue;
    }

    /* ---- Heading ---- */
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph(paragraph);
      const level = Math.min(6, heading[1]!.length + offset);
      const text = heading[2]!.trim();
      const id = `${idPrefix}${slugify(text)}`;
      collect?.push({ level, text, id });
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i += 1;
      continue;
    }

    /* ---- Blockquote ---- */
    if (/^>\s?/.test(line)) {
      flushParagraph(paragraph);
      const body: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) {
        body.push(lines[i]!.replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${inline(body.join(' '))}</blockquote>`);
      continue;
    }

    /* ---- Lists ---- */
    const bullet = /^(\s*)[-*]\s+(.*)$/.exec(line);
    const numbered = /^(\s*)\d+\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph(paragraph);
      const ordered = Boolean(numbered);
      const items: string[] = [];
      while (i < lines.length) {
        const m = ordered
          ? /^(\s*)\d+\.\s+(.*)$/.exec(lines[i]!)
          : /^(\s*)[-*]\s+(.*)$/.exec(lines[i]!);
        if (!m) {
          // A wrapped continuation line belongs to the previous item.
          if (/^\s+\S/.test(lines[i] ?? '') && items.length > 0) {
            items[items.length - 1] += ` ${lines[i]!.trim()}`;
            i += 1;
            continue;
          }
          break;
        }
        items.push(m[2]!);
        i += 1;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((it) => `<li>${inline(it)}</li>`).join('')}</${tag}>`);
      continue;
    }

    /* ---- Horizontal rule ---- */
    if (/^---+\s*$/.test(line)) {
      flushParagraph(paragraph);
      out.push('<hr class="sk-divider" aria-hidden="true" />');
      i += 1;
      continue;
    }

    /* ---- Blank line ---- */
    if (line.trim() === '') {
      flushParagraph(paragraph);
      i += 1;
      continue;
    }

    paragraph.push(line.trim());
    i += 1;
  }

  flushParagraph(paragraph);
  return out.join('\n');
}

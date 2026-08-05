/**
 * Full-text search across the whole design system.
 *
 * Small enough that a linear scan with weighted field matching beats pulling in an
 * index library. Weighting matters: a query matching a component's id should rank
 * far above one matching a sentence buried in its dark-mode notes.
 */

import { components } from '../data/components/index.js';
import { foundations } from '../data/foundations.js';
import { layouts } from '../data/layouts.js';
import { patterns } from '../data/patterns.js';
import { semanticTokens } from '../data/tokens.js';

export type ResultKind = 'component' | 'foundation' | 'pattern' | 'layout' | 'token';

export interface SearchResult {
  kind: ResultKind;
  id: string;
  title: string;
  summary: string;
  score: number;
  /** How to fetch the full record. */
  retrieveWith: string;
  /** The matching excerpt, when the match was in the body. */
  excerpt?: string;
}

interface Doc {
  kind: ResultKind;
  id: string;
  title: string;
  summary: string;
  retrieveWith: string;
  /** [text, weight] pairs. */
  fields: Array<[string, number]>;
}

function buildCorpus(): Doc[] {
  const docs: Doc[] = [];

  for (const c of components) {
    docs.push({
      kind: 'component',
      id: c.id,
      title: c.name,
      summary: c.summary,
      retrieveWith: `get_component({ id: "${c.id}" })`,
      fields: [
        [c.id, 10],
        [c.name, 10],
        [c.summary, 5],
        [c.category, 4],
        [c.whenToUse.join(' '), 3],
        [c.whenNotToUse.join(' '), 2],
        [c.variants.map((v) => `${v.name} ${v.use}`).join(' '), 2],
        [c.darkMode, 2],
        [c.accessibility.wcag.join(' '), 2],
        [c.accessibility.aria.join(' '), 1],
        [c.dos.concat(c.donts).join(' '), 1],
        [c.tokensUsed.join(' '), 1],
      ],
    });
  }

  for (const f of foundations) {
    docs.push({
      kind: 'foundation',
      id: f.id,
      title: f.title,
      summary: f.summary,
      retrieveWith: `get_foundation({ id: "${f.id}" })`,
      fields: [
        [f.id, 10],
        [f.title, 10],
        [f.summary, 5],
        [f.rules.join(' '), 4],
        [f.body, 1],
      ],
    });
  }

  for (const p of patterns) {
    docs.push({
      kind: 'pattern',
      id: p.id,
      title: p.name,
      summary: p.summary,
      retrieveWith: `get_pattern({ id: "${p.id}" })`,
      fields: [
        [p.id, 10],
        [p.name, 10],
        [p.summary, 5],
        [p.problem, 3],
        [p.solution, 2],
        [p.rules.join(' '), 2],
        [p.antiPatterns.join(' '), 2],
        [p.accessibility.join(' '), 1],
      ],
    });
  }

  for (const l of layouts) {
    docs.push({
      kind: 'layout',
      id: l.id,
      title: l.name,
      summary: l.summary,
      retrieveWith: `get_layout({ id: "${l.id}" })`,
      fields: [
        [l.id, 10],
        [l.name, 10],
        [l.summary, 5],
        [l.whenToUse.join(' '), 3],
        [l.responsive, 2],
        [l.components.join(' '), 2],
        [l.darkMode, 2],
        [l.accessibility.join(' '), 1],
      ],
    });
  }

  for (const t of semanticTokens) {
    docs.push({
      kind: 'token',
      id: t.name,
      title: `--sk-${t.name}`,
      summary: t.description,
      retrieveWith: `get_tokens({ filter: "${t.name}" })`,
      fields: [
        [t.name, 10],
        [t.description, 4],
        [t.group, 3],
      ],
    });
  }

  return docs;
}

const corpus = buildCorpus();

function excerptAround(text: string, term: string): string | undefined {
  const idx = text.toLowerCase().indexOf(term);
  if (idx === -1) return undefined;
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + term.length + 100);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

export function search(
  query: string,
  opts: { kinds?: ResultKind[]; limit?: number } = {}
): SearchResult[] {
  const terms = query
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  if (terms.length === 0) return [];

  const limit = opts.limit ?? 12;
  const results: SearchResult[] = [];

  for (const doc of corpus) {
    if (opts.kinds && !opts.kinds.includes(doc.kind)) continue;

    let score = 0;
    let excerpt: string | undefined;

    for (const term of terms) {
      for (const [text, weight] of doc.fields) {
        const lower = text.toLowerCase();
        if (!lower.includes(term)) continue;
        // Exact whole-field match ranks highest, then word-boundary, then substring.
        if (lower === term) score += weight * 3;
        else if (new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower))
          score += weight * 1.5;
        else score += weight * 0.5;

        if (!excerpt && weight <= 2) excerpt = excerptAround(text, term);
      }
    }

    // Require every term to have contributed something, so multi-word queries narrow.
    const allTermsPresent = terms.every((term) =>
      doc.fields.some(([text]) => text.toLowerCase().includes(term))
    );
    if (score > 0 && allTermsPresent) {
      results.push({
        kind: doc.kind,
        id: doc.id,
        title: doc.title,
        summary: doc.summary,
        score: Math.round(score * 10) / 10,
        retrieveWith: doc.retrieveWith,
        ...(excerpt ? { excerpt } : {}),
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

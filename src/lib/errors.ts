/**
 * Tool errors, written for the thing that actually reads them.
 *
 * This server's caller is a language model, not a person with a stack trace and
 * a debugger. That changes what a good error is.
 *
 * A person who sees "Unknown component" scrolls up, spots their typo and fixes
 * it. A model that receives the same string as a **successful** tool result has
 * no signal that anything went wrong at all — it will happily carry on and
 * generate markup for a component that does not exist. Three rules follow:
 *
 *  1. **A failure must be marked as one.** `isError: true` is the only part of
 *     the response a client is guaranteed to branch on. Returning a friendly
 *     sentence in a success envelope is worse than returning nothing, because
 *     it looks like an answer.
 *
 *  2. **Say what to do next, specifically.** Not "check your input" — the
 *     nearest valid values, or the tool that lists them. A model cannot guess
 *     what it does not know, so a correction it can act on in one step is worth
 *     more than an accurate description of the problem.
 *
 *  3. **Do not dump the whole namespace.** Listing all 64 component ids costs
 *     hundreds of tokens and buries the one that was meant. Rank by closeness,
 *     show a handful, and name the tool that enumerates the rest.
 *
 * Errors are also stated so they cannot be mistaken for content: a model that
 * has just been told to write documentation should not paste an error message
 * into it.
 */

/**
 * Standardised recovery hints.
 *
 * The vocabulary matters more than the wording: a model branching on
 * `TRY_ALTERNATIVE` behaves consistently across every tool, where it has to
 * re-interpret a fresh sentence each time. Four hints cover everything a
 * read-only server can fail with.
 */
export type RecoveryHint =
  /** Upstream is unavailable. The same call may work later. */
  | 'RETRY_LATER'
  /** The arguments were malformed. Fix them and call again. */
  | 'CHECK_INPUT'
  /** What was asked for does not exist. Use a different value or another tool. */
  | 'TRY_ALTERNATIVE'
  /** Unrecoverable. Relay the message to the user and stop. */
  | 'REPORT_TO_USER';

export interface ToolFailure {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
}

/**
 * A correlation id for one failure.
 *
 * This server is a static document, so there is no upstream to trace into — but
 * a failure a user can quote is still worth having, and it is what lets a bug
 * report be matched to a specific response rather than a description of one.
 */
function traceId(): string {
  let out = '';
  for (let i = 0; i < 8; i += 1) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

/**
 * Damerau-Levenshtein distance, capped.
 *
 * The transposition case matters here: `get_compoennt` and `date-pikcer` are
 * the mistakes that actually happen, and plain Levenshtein scores a swap as two
 * edits, which pushes the right answer out of the suggestions.
 */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;

  const prev2 = new Array<number>(n + 1);
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;

  let beforePrev = prev2;
  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, beforePrev[j - 2]! + cost);
      }
      curr[j] = best;
    }
    beforePrev = prev;
    prev = curr;
    curr = beforePrev === prev2 ? prev2 : new Array<number>(n + 1);
  }
  return prev[n]!;
}

/**
 * The closest candidates to what was asked for.
 *
 * Substring matches come first — someone asking for `date` wants every date
 * component, and that is a better answer than the single nearest edit.
 */
export function didYouMean(input: string, candidates: readonly string[], limit = 5): string[] {
  const needle = input.trim().toLowerCase();
  if (!needle) return candidates.slice(0, limit) as string[];

  const scored = candidates.map((candidate) => {
    const c = candidate.toLowerCase();
    // Normalising separators catches `datepicker` for `date-picker`, which is
    // by far the most common near-miss in a hyphenated namespace.
    const flat = c.replace(/[-_\s]/g, '');
    const flatNeedle = needle.replace(/[-_\s]/g, '');
    let score: number;
    if (c === needle || flat === flatNeedle) score = -1;
    else if (c.includes(needle) || flat.includes(flatNeedle)) score = 0;
    else score = editDistance(flatNeedle, flat);
    return { candidate, score };
  });

  const threshold = Math.max(3, Math.ceil(needle.length / 2));
  return scored
    .filter((s) => s.score <= threshold)
    .sort((a, b) => a.score - b.score || a.candidate.localeCompare(b.candidate))
    .slice(0, limit)
    .map((s) => s.candidate);
}

export interface FailureOptions {
  /**
   * Semantic, machine-branchable code — `UNKNOWN_COMPONENT`, not "not found".
   * A model can key off this without parsing prose.
   */
  code?: string;
  /** Which recovery path the caller should take. */
  hint?: RecoveryHint;
  /** What the caller asked for. */
  received?: string;
  /** Valid values, for suggestions. Not printed in full. */
  candidates?: readonly string[];
  /** Tool that enumerates the full set, e.g. `list_components`. */
  listTool?: string;
  /** Concrete next steps, in the order the caller should try them. */
  next?: string[];
  /**
   * Whether the same call could succeed later. Almost always false here — this
   * server is a static document, so a retry without a change is wasted work,
   * and a model told to "try again" will do exactly that.
   */
  retryable?: boolean;
}

/**
 * Build a failure a model can act on.
 *
 * Deliberately plain prose with a fixed shape rather than JSON: the client
 * pastes this text straight into the model's context, and a sentence saying
 * what to do next survives that better than a schema the model has to parse and
 * then narrate to itself.
 */
export function toolFailure(problem: string, options: FailureOptions = {}): ToolFailure {
  const {
    code = 'TOOL_ERROR',
    hint = options.retryable ? 'RETRY_LATER' : 'CHECK_INPUT',
    received,
    candidates,
    listTool,
    next = [],
    retryable = false,
  } = options;

  const trace = traceId();
  const lines: string[] = [`ERROR ${code}`, '', problem];

  if (received !== undefined) lines.push('', `Received: ${JSON.stringify(received)}`);

  const suggestions = received && candidates ? didYouMean(received, candidates) : [];
  if (suggestions.length) {
    lines.push('', suggestions.length === 1 ? 'Did you mean:' : 'Closest matches:');
    for (const s of suggestions) lines.push(`  - ${s}`);
  } else if (candidates && candidates.length) {
    // Nothing was close. Show a sample rather than the whole namespace.
    lines.push('', `No close match. ${candidates.length} valid values exist, for example:`);
    for (const s of candidates.slice(0, 5)) lines.push(`  - ${s}`);
  }

  const steps = [...next];
  if (listTool) steps.push(`Call \`${listTool}\` for the full list.`);
  if (steps.length) {
    lines.push('', 'Next:');
    for (const s of steps) lines.push(`  - ${s}`);
  }

  lines.push('', `Recovery hint: ${hint}`);
  lines.push(
    retryable
      ? 'Retryable: yes — this may succeed on a second attempt.'
      : 'Retryable: no — the same call will fail again. Change the arguments first.'
  );
  lines.push('This is an error, not content. Do not include it in generated output.');
  lines.push(`Trace: ${trace}`);

  /*
   * The same failure twice: prose for the model to reason from, and a compact
   * object for a client that wants to branch without parsing English. Neither
   * alone is enough — prose is what a model actually acts on, and a structured
   * code is what a client can switch on reliably.
   */
  lines.push(
    '',
    '```json',
    JSON.stringify(
      { error: { code, message: problem, hint, retryable, suggestions, traceId: trace } },
      null,
      2
    ),
    '```'
  );

  return { isError: true, content: [{ type: 'text', text: lines.join('\n') }] };
}

/** A failure for an argument that was structurally valid but semantically wrong. */
export function invalidArgument(
  argument: string,
  problem: string,
  options: FailureOptions = {}
): ToolFailure {
  return toolFailure(`\`${argument}\` is not valid — ${problem}`, {
    code: 'INVALID_ARGUMENT',
    hint: 'CHECK_INPUT',
    ...options,
  });
}

/** A failure for a name that does not exist in a known set. */
export function unknownValue(
  kind: string,
  received: string,
  candidates: readonly string[],
  listTool?: string
): ToolFailure {
  return toolFailure(`No ${kind} with that id.`, {
    code: `UNKNOWN_${kind.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`,
    // The thing does not exist, so fixing the spelling or picking another value
    // is the only way forward — never a retry.
    hint: 'TRY_ALTERNATIVE',
    received,
    candidates,
    listTool,
  });
}

/**
 * A tool returned nothing, and that is the truth rather than a failure.
 *
 * Kept deliberately distinct from an error. A model cannot tell an empty list
 * caused by "there genuinely are none" from one caused by "something broke and
 * I substituted a default" — so an empty result says which it is, in words,
 * and a broken lookup returns `isError` instead of an empty list.
 */
export function emptyResult(what: string, why: string, next: string[] = []): string {
  const lines = [`No ${what} matched. This is a real result, not a failure.`, '', why];
  if (next.length) {
    lines.push('', 'Next:');
    for (const n of next) lines.push(`  - ${n}`);
  }
  lines.push('', 'count: 0');
  return lines.join('\n');
}

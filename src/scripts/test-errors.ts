/**
 * Tool error contract.
 *
 * The caller here is a language model. The failure mode this guards against is
 * not a crash — it is a *plausible-looking success*: a friendly sentence
 * returned in a success envelope, which a model reads as an answer and carries
 * on from. Every check below exists because that failure is silent.
 *
 * Run with `npm run test:errors`.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { components } from '../data/components/index.js';
import { didYouMean, editDistance } from '../lib/errors.js';
import { createServer } from '../server.js';

let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) passed += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

/* ------------------------------------------------------------------ *
 * Fuzzy matching
 * ------------------------------------------------------------------ */

check('distance: identical strings', editDistance('button', 'button') === 0);
check('distance: one substitution', editDistance('buton', 'button') === 1);
// Plain Levenshtein scores a swap as 2, which pushes the right answer out.
check('distance: a transposition costs 1, not 2', editDistance('compoennt', 'component') === 1);
check('distance: empty against a word', editDistance('', 'tabs') === 4);

const ids = components.map((c) => c.id);
check('suggest: a missing hyphen still finds it', didYouMean('datepicker', ids)[0] === 'date-picker');
check('suggest: a typo finds the component', didYouMean('tabel', ids)[0] === 'table');
check('suggest: a prefix returns the family',
  didYouMean('date', ids).includes('date-picker') && didYouMean('date', ids).includes('date-range-picker'));
check('suggest: nonsense suggests nothing rather than everything',
  didYouMean('zzzzzzzzzz', ids).length === 0);
check('suggest: never dumps the whole namespace', didYouMean('b', ids).length <= 5);

/* ------------------------------------------------------------------ *
 * Every failing call is marked as a failure
 * ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  const client = new Client({ name: 'error-test', version: '1' }, { capabilities: {} });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);

  /** Bad arguments for each tool that takes a lookup id or a parsed value. */
  const badCalls: Array<[string, Record<string, unknown>]> = [
    ['get_component', { id: 'datepicker' }],
    ['get_component', { id: 'no-such-thing' }],
    ['get_component_code', { id: 'nope', framework: 'react' }],
    ['get_foundation', { id: 'colours' }],
    ['get_pattern', { id: 'not-a-pattern' }],
    ['get_layout', { id: 'not-a-layout' }],
    ['get_primitives', { ramp: 'puce' }],
    ['check_contrast', { foreground: 'not-a-colour', background: '#ffffff' }],
  ];

  for (const [tool, args] of badCalls) {
    const label = `${tool}(${JSON.stringify(args)})`;
    let result: Awaited<ReturnType<Client['callTool']>>;
    try {
      result = await client.callTool({ name: tool, arguments: args });
    } catch (err) {
      // A thrown protocol error is also a marked failure, which is acceptable —
      // the client can branch on it.
      check(`${label}: rejected`, true);
      void err;
      continue;
    }

    const body = (result.content as Array<{ text?: string }> | undefined)?.[0]?.text ?? '';

    /*
     * Two legitimate paths, and the essential contract is the same for both.
     *
     * A tool whose argument is a `z.enum` is rejected by the SDK at schema
     * validation, before the handler runs. That is the better outcome, not a
     * worse one: it costs no work, and a client that surfaces the schema shows
     * the model the allowed values before it ever calls. Those responses are
     * SDK-shaped rather than house-shaped, so the house-style extras below are
     * asserted only where this server wrote the message itself.
     */
    const schemaRejected = /Input validation error|Invalid arguments/i.test(body);

    check(`${label}: marked isError`, result.isError === true,
      'returned a SUCCESS envelope — a model will read this as an answer');
    check(`${label}: says it is an error`, /ERROR|error|invalid/i.test(body));
    check(`${label}: names valid values or how to get them`,
      /Closest matches|Did you mean|expected one of|Call `/i.test(body),
      'a model cannot guess a value it has never been shown');
    check(`${label}: is not a wall of the whole namespace`, body.length < 1400,
      `${body.length} characters`);

    if (!schemaRejected) {
      check(`${label}: states retryability`, /Retryable:/i.test(body),
        'a model told nothing about retrying will retry');
      check(`${label}: warns against pasting it as content`, /not content/i.test(body));

      // A semantic code a client can branch on without parsing English.
      check(`${label}: carries a semantic code`, /^ERROR [A-Z][A-Z0-9_]+$/m.test(body));

      // A hint from the fixed vocabulary, so behaviour is consistent across
      // tools rather than re-derived from fresh prose each time.
      check(`${label}: carries a standard recovery hint`,
        /Recovery hint: (RETRY_LATER|CHECK_INPUT|TRY_ALTERNATIVE|REPORT_TO_USER)/.test(body));

      // A correlation id, so a bug report can name a specific response.
      check(`${label}: carries a trace id`, /Trace: [0-9a-f]{8}/.test(body));

      // The same failure in machine-readable form.
      const json = /```json\n([\s\S]*?)\n```/.exec(body);
      check(`${label}: includes a parseable error object`, Boolean(json));
      if (json) {
        try {
          const parsed = JSON.parse(json[1]!) as { error?: Record<string, unknown> };
          check(`${label}: the object has code, hint and traceId`,
            typeof parsed.error?.code === 'string' &&
            typeof parsed.error?.hint === 'string' &&
            typeof parsed.error?.traceId === 'string');
        } catch {
          check(`${label}: the object parses`, false);
        }
      }

      // No stack traces, ever. A model shown one will quote it at the user.
      check(`${label}: leaks no stack trace`,
        !/\bat\s+\w+\s+\(|node_modules|\.ts:\d+:\d+/.test(body));
    }
  }

  /* A near-miss must actually point at the right answer. */
  {
    const r = await client.callTool({ name: 'get_component', arguments: { id: 'datepicker' } });
    const body = (r.content as Array<{ text?: string }>)[0]?.text ?? '';
    check('near-miss: names the intended component', body.includes('date-picker'));
    check('near-miss: names the tool that lists the rest', body.includes('list_components'));
  }

  /* And a valid call must still be a plain success. */
  {
    const r = await client.callTool({ name: 'get_component', arguments: { id: 'date-picker' } });
    check('valid call: not marked as an error', r.isError !== true);
    const body = (r.content as Array<{ text?: string }>)[0]?.text ?? '';
    check('valid call: returns the component', body.includes('Date picker'));
    check('valid call: carries no error scaffolding', !body.includes('Retryable:'));
  }

  /* ---------------- No fake-empty data ----------------
     A model cannot tell an empty list caused by "there genuinely are none"
     from one caused by "something broke and I substituted a default". So an
     empty result has to say which it is, and a broken lookup must never
     present itself as an empty one. */
  {
    const empties: Array<[string, Record<string, unknown>]> = [
      ['search', { query: 'zzzzqqqqvvvv' }],
      ['suggest_token', { intent: 'zzzzqqqqvvvv' }],
    ];
    for (const [tool, args] of empties) {
      const r = await client.callTool({ name: tool, arguments: args });
      const body = (r.content as Array<{ text?: string }>)[0]?.text ?? '';
      check(`${tool}: a genuine empty is NOT an error`, r.isError !== true,
        'marking a real empty result as a failure teaches a model to distrust valid answers');
      check(`${tool}: says the emptiness is real`, /real result, not a failure/i.test(body));
      check(`${tool}: states a count`, /count: 0/.test(body));
      check(`${tool}: is not silently blank`, body.trim().length > 40);
    }
  }

  await client.close();
  await server.close();

  console.log('Sekura tool error contract');
  console.log('='.repeat(70));
  console.log(`${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('');
    for (const f of failures) console.log(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log('');
  console.log('Every failing call is marked isError, names the closest valid values,');
  console.log('states whether retrying helps, and never dumps the whole namespace.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

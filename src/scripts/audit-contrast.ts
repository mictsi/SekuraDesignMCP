/**
 * Fails the build if any declared contrast promise is broken in any theme.
 * Run with `npm run audit:contrast`.
 */

import { auditThemes } from '../data/tokens.js';

const rows = auditThemes();
const failures = rows.filter((r) => !r.pass);

const byTheme = new Map<string, { total: number; failed: number }>();
for (const r of rows) {
  const entry = byTheme.get(r.theme) ?? { total: 0, failed: 0 };
  entry.total += 1;
  if (!r.pass) entry.failed += 1;
  byTheme.set(r.theme, entry);
}

console.log('Sekura contrast audit');
console.log('='.repeat(78));
for (const [theme, { total, failed }] of byTheme) {
  const mark = failed === 0 ? 'PASS' : 'FAIL';
  console.log(
    `${mark}  ${theme.padEnd(10)} ${total - failed}/${total} pairings satisfied`
  );
}

if (failures.length > 0) {
  console.log('');
  console.log('Failures');
  console.log('-'.repeat(78));
  for (const f of failures) {
    console.log(
      `[${f.theme}] ${f.foreground} (${f.foregroundValue}) on ${f.background} (${f.backgroundValue})`
    );
    console.log(`    ${f.display}  use=${f.use}  — ${f.note}`);
  }
  console.log('');
  console.log(`${failures.length} of ${rows.length} pairings failed.`);
  process.exit(1);
}

console.log('');
console.log(`All ${rows.length} declared pairings satisfied across every theme.`);

// Report the tightest margins so future edits do not silently erode headroom.
const tightest = [...rows]
  .filter((r) => r.use === 'body-text')
  .sort((a, b) => a.ratio - b.ratio)
  .slice(0, 8);
console.log('');
console.log('Tightest text pairings (least headroom):');
for (const r of tightest) {
  console.log(
    `  ${r.display.padStart(7)}  [${r.theme}] ${r.foreground} on ${r.background}`
  );
}

/**
 * Reference tests for the colour maths.
 *
 * The whole design system rests on `contrastRatio` being correct: 312 build-gate
 * checks, every token decision, and the claim that the palette is verified. If
 * this function is wrong, everything downstream is confidently wrong.
 *
 * So it is checked against values from the WCAG 2.2 definition and widely-used
 * reference checkers, rather than trusted.
 *
 * Run with `npm run test:color`.
 */

import {
  contrastRatio,
  evaluateContrast,
  flatten,
  parseHex,
  pickStepForContrast,
  relativeLuminance,
  rgbToHsl,
} from '../lib/color.js';
import { neutral } from '../data/primitives.js';

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) passed += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

function near(name: string, actual: number, expected: number, tolerance = 0.02): void {
  check(name, Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual.toFixed(4)}`);
}

/* ------------------------------------------------------------------ *
 * Relative luminance — the normative formula
 * ------------------------------------------------------------------ */

near('luminance: black is 0', relativeLuminance('#000000'), 0, 0.0001);
near('luminance: white is 1', relativeLuminance('#ffffff'), 1, 0.0001);
// Mid grey is NOT 0.5 luminance — sRGB is gamma encoded. Getting this wrong is
// the classic error, and it would make every contrast figure plausible but wrong.
near('luminance: #808080 is ~0.2159 (gamma, not 0.5)', relativeLuminance('#808080'), 0.2159, 0.001);
near('luminance: pure red', relativeLuminance('#ff0000'), 0.2126, 0.0001);
near('luminance: pure green', relativeLuminance('#00ff00'), 0.7152, 0.0001);
near('luminance: pure blue', relativeLuminance('#0000ff'), 0.0722, 0.0001);
// Below the 0.04045 threshold the formula is linear, not a power curve.
near('luminance: low channel uses the linear segment', relativeLuminance('#0a0a0a'), 0.00304, 0.0005);

/* ------------------------------------------------------------------ *
 * Contrast ratio — reference pairs
 * ------------------------------------------------------------------ */

const REFERENCE: Array<[string, string, number, string]> = [
  ['#000000', '#ffffff', 21.0, 'maximum possible'],
  ['#ffffff', '#ffffff', 1.0, 'minimum possible'],
  ['#767676', '#ffffff', 4.54, 'the classic smallest grey passing AA on white'],
  ['#777777', '#ffffff', 4.48, 'one step lighter — must FAIL AA'],
  ['#595959', '#ffffff', 7.0, 'the AAA threshold grey'],
  ['#0000ff', '#ffffff', 8.59, 'blue on white'],
  ['#ff0000', '#ffffff', 4.0, 'red on white'],
  ['#008000', '#ffffff', 5.13, 'green on white'],
  ['#ffff00', '#000000', 19.56, 'yellow on black'],
];

for (const [fg, bg, expected, note] of REFERENCE) {
  near(`contrast: ${fg} on ${bg} (${note})`, contrastRatio(fg, bg), expected);
}

// Order must not matter — the formula sorts by luminance internally.
check(
  'contrast: symmetric',
  Math.abs(contrastRatio('#123456', '#abcdef') - contrastRatio('#abcdef', '#123456')) < 1e-9
);

/* ------------------------------------------------------------------ *
 * Threshold behaviour — where the gates actually bite
 * ------------------------------------------------------------------ */

check('AA body: 4.54 passes', evaluateContrast('#767676', '#ffffff', 'body-text').passes.aaBodyText);
check('AA body: 4.48 fails', !evaluateContrast('#777777', '#ffffff', 'body-text').passes.aaBodyText);
check('AAA body: 7.00 passes', evaluateContrast('#595959', '#ffffff', 'body-text').passes.aaaBodyText);
check('grade: 7.00 is AAA', evaluateContrast('#595959', '#ffffff', 'body-text').grade === 'AAA');
check('grade: 4.54 is AA', evaluateContrast('#767676', '#ffffff', 'body-text').grade === 'AA');
check('grade: 4.48 is fail', evaluateContrast('#777777', '#ffffff', 'body-text').grade === 'fail');
// A ratio that fails for body text can still be fine for a control boundary.
check(
  'ui-component: 3.1 passes non-text',
  evaluateContrast('#949494', '#ffffff', 'ui-component').grade === 'AA'
);
check(
  'ui-component: same pair fails as body text',
  evaluateContrast('#949494', '#ffffff', 'body-text').grade === 'fail'
);
check('decorative: never fails', evaluateContrast('#fefefe', '#ffffff', 'decorative').grade !== 'fail');

/* ------------------------------------------------------------------ *
 * Parsing and compositing
 * ------------------------------------------------------------------ */

check('parse: 3-digit expands', parseHex('#abc').r === 0xaa && parseHex('#abc').b === 0xcc);
check('parse: 6-digit', parseHex('#102030').g === 0x20);
check('parse: 8-digit alpha', Math.abs(parseHex('#00000080').a - 128 / 255) < 0.01);
check('parse: tolerates no hash', parseHex('abcdef').r === 0xab);
check('parse: rejects nonsense', (() => { try { parseHex('#xyz'); return false; } catch { return true; } })());

// Translucent foregrounds must be judged as rendered, not as authored — this is
// what makes hover washes and scrims auditable at all.
// 0x80 alpha is 128/255 = 0.502, not exactly 0.5, so the composite is #7f7f7f
// rather than #808080. Asserting the round number here would be asserting a
// convenient fiction.
check(
  'flatten: 50% black over white composites to #7f7f7f',
  flatten('#00000080', '#ffffff').toLowerCase() === '#7f7f7f',
  flatten('#00000080', '#ffffff')
);
check('flatten: opaque is unchanged', flatten('#123456', '#ffffff').toLowerCase() === '#123456');
check(
  'flatten: composited value is what gets measured',
  Math.abs(
    contrastRatio(flatten('#00000080', '#ffffff'), '#ffffff') - contrastRatio('#7f7f7f', '#ffffff')
  ) < 1e-9
);
// A translucent foreground must never be measured as if it were opaque —
// that is what makes hover washes and scrims auditable.
check(
  'flatten: translucent is NOT measured as opaque',
  contrastRatio(flatten('#00000080', '#ffffff'), '#ffffff') < contrastRatio('#000000', '#ffffff')
);

check('hsl: pure red', (() => { const h = rgbToHsl('#ff0000'); return h.h === 0 && h.s === 100 && h.l === 50; })());
check('hsl: white is achromatic', (() => { const h = rgbToHsl('#ffffff'); return h.s === 0 && h.l === 100; })());

/* ------------------------------------------------------------------ *
 * Ramp step selection
 * ------------------------------------------------------------------ */

const step = pickStepForContrast(neutral, '#ffffff', 4.5);
check('pickStep: finds a passing step', step !== null);
check('pickStep: the chosen step really passes', step !== null && step.ratio >= 4.5);
// It should pick the *lowest* passing step, so the palette stays calm rather
// than defaulting everything to near-black.
check(
  'pickStep: picks the lowest passing step, not the darkest',
  step !== null && step.ratio < 6,
  step ? `chose ${step.step} at ${step.ratio.toFixed(2)}` : ''
);
check('pickStep: returns null when nothing qualifies', pickStepForContrast(neutral, '#ffffff', 25) === null);

/* ------------------------------------------------------------------ *
 * The two pinned neutral steps
 *
 * These are load-bearing: their values are chosen by contrast rather than by
 * eye, and the comments in primitives.ts assert exactly this.
 * ------------------------------------------------------------------ */

check(
  'neutral-400 clears 3:1 on white (borders stay locatable)',
  contrastRatio(neutral['400']!, '#ffffff') >= 3,
  `${contrastRatio(neutral['400']!, '#ffffff').toFixed(2)}`
);
check(
  'neutral-400 is the LIGHTEST step doing so (nothing lighter would pass)',
  contrastRatio(neutral['300']!, '#ffffff') < 3
);
check(
  'neutral-500 clears 4.5:1 on the sunken surface (tertiary text stays readable)',
  contrastRatio(neutral['500']!, neutral['100']!) >= 4.5,
  `${contrastRatio(neutral['500']!, neutral['100']!).toFixed(2)}`
);
check(
  'neutral-500 also clears 3:1 on a dark card (it is squeezed from both sides)',
  contrastRatio(neutral['500']!, neutral['900']!) >= 3,
  `${contrastRatio(neutral['500']!, neutral['900']!).toFixed(2)}`
);

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

console.log('Sekura colour maths');
console.log('='.repeat(70));
console.log(`${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('');
console.log('Implementation matches the WCAG 2.2 reference values.');

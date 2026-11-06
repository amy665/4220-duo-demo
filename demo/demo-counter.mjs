#!/usr/bin/env node
/**
 * Counter walk + RFC 4226 Appendix D verification.
 *
 *   node demo/demo-counter.mjs
 *   node demo/demo-counter.mjs --count 15
 *
 * Counters 0-9 are checked against the published expected values, so the
 * audience can see that this is the standard algorithm, not a re-invention.
 */

import { hotpFromBase32 } from "./otp.mjs";

const RFC_KEY = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const EXPECTED = [
  "755224", "287082", "359152", "969429", "338314",
  "254676", "287922", "162583", "399871", "520489",
];

const args = process.argv.slice(2);
const i = args.indexOf("--count");
const count = i === -1 ? 10 : Math.max(1, Number(args[i + 1]) || 10);

const rule = () => console.log("-".repeat(52));
console.log();
console.log("  HOTP counter walk   key = RFC 4226 test vector");
rule();
console.log("  counter   passcode    expected   result");
rule();

let allOk = true;
for (let c = 0; c < count; c++) {
  const code = hotpFromBase32(RFC_KEY, c);
  const expected = EXPECTED[c];
  let result = "";
  if (expected !== undefined) {
    const ok = code === expected;
    if (!ok) allOk = false;
    result = ok ? "OK" : `WRONG (want ${expected})`;
  }
  console.log(
    `  ${String(c).padEnd(10)}${code.padEnd(12)}${(expected ?? "-").padEnd(11)}${result}`
  );
}
rule();

console.log(`
  Read this table top to bottom: one code per counter value, always the
  same code for the same counter. That is why the counter must be stored
  and advanced - it is the only state in the whole system.
`);

if (count >= 10) {
  console.log(
    allOk
      ? "  Counters 0-9 match RFC 4226 Appendix D exactly. Standard algorithm.\n"
      : "  MISMATCH against RFC 4226 vectors - implementation is broken.\n"
  );
  process.exitCode = allOk ? 0 : 1;
}

console.log("  Next: node demo/demo-window.mjs   (how a server accepts these)\n");

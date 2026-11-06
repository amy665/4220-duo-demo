#!/usr/bin/env node
/**
 * Verification for demo/otp.mjs.
 *
 *   node tests/test-otp.mjs
 *
 * Checks the implementation against published test vectors, not against
 * itself. If these pass, the codes in the demo are the real algorithm.
 */

import assert from "node:assert/strict";
import {
  base32Decode,
  base32Encode,
  hotp,
  hotpTrace,
  totp,
  totpCounter,
  verify,
} from "../demo/otp.mjs";

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    console.error(`  FAIL  ${name}\n        ${e.message}`);
    process.exitCode = 1;
  }
};

const RFC_KEY_B32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // base32("12345678901234567890")
const key = base32Decode(RFC_KEY_B32);

console.log("\n  demo/otp.mjs verification\n");

/* ---------- encodings ---------- */

test("base32 decodes the RFC 4226 test key to its ASCII bytes", () => {
  assert.equal(key.toString("latin1"), "12345678901234567890");
  assert.equal(key.length, 20);
});

test("base32 round-trips arbitrary bytes", () => {
  for (const hex of ["00", "ff", "00010203", "deadbeefcafe", "12345678901234567890"]) {
    const buf = Buffer.from(hex, "hex");
    assert.equal(base32Decode(base32Encode(buf)).toString("hex"), buf.toString("hex"));
  }
});

test("base32 rejects invalid characters", () => {
  assert.throws(() => base32Decode("ABC1"), /Invalid base32/);
});

/* ---------- RFC 4226 Appendix D ---------- */

test("HOTP counters 0-9 match RFC 4226 Appendix D", () => {
  const expected = [
    "755224", "287082", "359152", "969429", "338314",
    "254676", "287922", "162583", "399871", "520489",
  ];
  expected.forEach((want, counter) => {
    assert.equal(hotp(key, counter), want, `counter ${counter}`);
  });
});

test("truncation uses the RFC offset rule on a known digest", () => {
  const t = hotpTrace(key, 0);
  assert.equal(t.macHex, "cc93cf18508d94934c64b65d8ba7667fb7cde4b0");
  assert.equal(t.lastByte, 0xb0);
  assert.equal(t.offset, 0);
  assert.equal(t.fourHex, "cc93cf18");
  assert.equal(t.binary, 0x4c93cf18); // top bit cleared
  assert.equal(t.code, "755224");
});

test("8 digits truncate the same 31-bit number", () => {
  // 0x4c93cf18 = 1284755224, so 8 digits keep the low 8 digits of the same value
  assert.equal(hotp(key, 0, 8), String(1284755224 % 10 ** 8).padStart(8, "0"));
});

test("a different key produces different codes at the same counter", () => {
  const other = base32Decode(base32Encode(Buffer.from("abcdefghij", "utf8")));
  assert.notEqual(hotp(key, 0), hotp(other, 0));
});

/* ---------- RFC 6238 (TOTP over the same HOTP) ---------- */

test("TOTP counter is floor(unix_seconds / 30)", () => {
  assert.equal(totpCounter(59_000, 30), 1);
  assert.equal(totpCounter(60_000, 30), 2);
  assert.equal(totpCounter(59_999, 30), 1);
});

test("TOTP equals HOTP at the time-derived counter", () => {
  const now = 1_111_111_109_000;
  assert.equal(totp(key, { now, digits: 8 }), hotp(key, totpCounter(now), 8));
});

test("TOTP matches RFC 6238 SHA-1 test vectors", () => {
  // RFC 6238 Appendix B, SHA-1 rows: secret is the same ASCII test key.
  const vectors = [
    [59, "94287082"],
    [1_111_111_109, "07081804"],
    [1_111_111_111, "14050471"],
    [1_234_567_890, "89005924"],
    [2_000_000_000, "69279037"],
    [20_000_000_000, "65353130"],
  ];
  for (const [seconds, want] of vectors) {
    assert.equal(totp(key, { now: seconds * 1000, digits: 8 }), want, `T=${seconds}`);
  }
});

/* ---------- verifier ---------- */

test("verifier accepts the next counter and advances its state", () => {
  const res = verify(key, hotp(key, 0), -1, 10);
  assert.deepEqual([res.ok, res.counter], [true, 0]);
});

test("verifier rejects a code it has already moved past", () => {
  assert.equal(verify(key, hotp(key, 0), 0, 10).ok, false);
});

test("verifier accepts a code inside the window and reports the skip", () => {
  const res = verify(key, hotp(key, 4), 0, 10);
  assert.deepEqual([res.ok, res.counter, res.skipped], [true, 4, 3]);
});

test("verifier rejects a code beyond the window", () => {
  assert.equal(verify(key, hotp(key, 40), 0, 10).ok, false);
});

test("verifier does not confuse one counter's code with another's", () => {
  // Every code in 0..9 is distinct, so a match identifies exactly one counter.
  const codes = Array.from({ length: 10 }, (_, c) => hotp(key, c));
  assert.equal(new Set(codes).size, codes.length);
});

console.log(`\n  ${passed} checks passed${process.exitCode ? ", some FAILED" : ""}\n`);

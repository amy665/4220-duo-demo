#!/usr/bin/env node
/**
 * One passcode, every intermediate value, printed.
 *
 *   node demo/demo-step.mjs
 *   node demo/demo-step.mjs --counter 5
 *   node demo/demo-step.mjs --key GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ --counter 2
 *
 * The default key is the RFC 4226 Appendix D test key. It is public test
 * data, not a credential, and cannot log in to anything.
 */

import { hotpTrace, base32Decode } from "./otp.mjs";

const RFC_KEY = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // base32("12345678901234567890")

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const keyB32 = String(flag("--key", RFC_KEY)).toUpperCase().replace(/=+$/, "");
const counter = Number(flag("--counter", 0));

let keyBytes;
try {
  keyBytes = base32Decode(keyB32);
} catch (e) {
  console.error(`\n  Not a valid base32 key: ${e.message}\n`);
  process.exit(1);
}
if (!Number.isInteger(counter) || counter < 0) {
  console.error("\n  --counter must be a non-negative integer\n");
  process.exit(1);
}

const t = hotpTrace(keyBytes, counter);
const print = (s = "") => console.log(s);
const rule = (ch = "-") => print(ch.repeat(64));
const head = (n, title) => {
  print();
  rule("=");
  print(` STEP ${n}  ${title}`);
  rule("=");
};
const row = (label, value) => print(`  ${label.padEnd(22)}${value}`);

print();
print("  HOTP - one passcode, step by step   (RFC 4226, HMAC-SHA1)");
print("  No network. No server. No encryption. Just a hash.");

head(1, "THE SHARED SECRET -> KEY BYTES");
row("base32 key", keyB32);
row("decoded (hex)", t.keyHex);
row("key length", `${t.keyLength} bytes`);
row("as text", JSON.stringify(Buffer.from(keyBytes).toString("latin1")));
print();
print("  base32 is an ENCODING, not encryption: no key needed to decode it.");
print("  This demo key is the published RFC 4226 test vector - safe to show.");

head(2, "THE COUNTER -> 8 BYTES, BIG-ENDIAN");
row("counter", String(t.counter));
row("as 8 bytes", t.msgHex);
row("in other words", `${t.counter} as a 64-bit integer, most significant byte first`);
print();
print("  HOTP replaces time with a counter. It goes 0, 1, 2, 3 ... one step");
print("  per use. TOTP is the same algorithm with floor(time / 30) here.");

head(3, "HMAC-SHA1(key, counter) -> 20-BYTE DIGEST");
row("digest", t.macHex);
print();
print("  HMAC = hash-based message authentication code.");
print("  One-way: from these 20 bytes you cannot recover the key.");

head(4, "DYNAMIC TRUNCATION -> ONE 31-BIT NUMBER");
row("last digest byte", `0x${t.lastByte.toString(16).padStart(2, "0")} = ${t.lastByte}`);
row("offset = last & 0x0f", String(t.offset));
row("4 bytes at offset", t.fourHex);
row("mask top bit (&0x7f)", `0x${t.binaryHex} = ${t.binary}`);
print();
print("  Why: the digest is 20 bytes, the code must be short. RFC 4226 says");
print("  pick a starting point from the last byte, take 4 bytes, clear the");
print("  sign bit. That is the whole trick.");

head(5, "MOD 10^6 -> THE 6-DIGIT PASSCODE");
row("binary % 10^6", `${t.binary} % ${t.mod} = ${t.remainder}`);
row("zero-padded", t.code);
print();
rule("-");
print(`   PASSCODE:  ${t.code}`);
rule("-");

head(6, "WHAT THE SERVER DOES WITH IT");
print("  The server holds the same key and a counter. It runs the exact same");
print("  steps, gets a number, and compares.");
print();
print("    client:  HOTP(key, counter)   ->  " + t.code);
print("    server:  HOTP(key, counter)   ->  " + t.code + "   === match");
print();
print("  It does NOT decrypt the code. There is nothing to decrypt:");
print("  HMAC is a one-way function, and 10^6 possible codes carry no data.");
print();
print("  This is why two devices that never talk to each other still agree:");
print("  they share a secret and a counter, not a message.");
print();
print("  Try next counter:   node demo/demo-step.mjs --counter " + (counter + 1));
print();

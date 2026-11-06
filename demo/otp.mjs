/**
 * OTP core - HOTP (RFC 4226) and TOTP (RFC 6238), Node built-ins only.
 *
 * Everything here is standard, published algorithm:
 *   code = HOTP(K, C) = Truncate(HMAC-SHA1(K, C))
 *
 * There is no encryption in this file. HMAC is a one-way function:
 * you cannot get K or C back out of the 6 digits.
 */

import { createHmac } from "node:crypto";

export const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 base32 decode. Padding optional, whitespace ignored. */
export function base32Decode(str) {
  const s = String(str).replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let acc = 0;
  const out = [];
  for (const ch of s) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    acc = (acc << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((acc >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** RFC 4648 base32 encode (used by the tests and the trace output). */
export function base32Encode(buf) {
  let bits = 0;
  let acc = 0;
  let out = "";
  for (const b of buf) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(acc >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(acc << (5 - bits)) & 31];
  return out;
}

/** 8-byte big-endian counter, the RFC 4226 message. */
export function counterBytes(counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  return buf;
}

/**
 * RFC 4226 HOTP, with every intermediate value exposed so a demo can show it.
 * Returns { code, ...trace }.
 */
export function hotpTrace(keyBytes, counter, digits = 6) {
  if (!Number.isInteger(counter) || counter < 0) {
    throw new Error("counter must be a non-negative integer");
  }
  const msg = counterBytes(counter);
  const mac = createHmac("sha1", keyBytes).update(msg).digest();

  const offset = mac[mac.length - 1] & 0x0f;
  const four = mac.subarray(offset, offset + 4);
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);

  const mod = 10 ** digits;
  const code = String(binary % mod).padStart(digits, "0");

  return {
    code,
    keyHex: Buffer.from(keyBytes).toString("hex"),
    keyLength: keyBytes.length,
    counter,
    msgHex: msg.toString("hex"),
    macHex: mac.toString("hex"),
    lastByte: mac[mac.length - 1],
    offset,
    fourHex: four.toString("hex"),
    binary,
    binaryHex: binary.toString(16).padStart(8, "0"),
    mod,
    remainder: binary % mod,
    digits,
  };
}

/** HOTP, digits only. */
export function hotp(keyBytes, counter, digits = 6) {
  return hotpTrace(keyBytes, counter, digits).code;
}

/** HOTP from a base32 key string. */
export function hotpFromBase32(base32, counter, digits = 6) {
  return hotp(base32Decode(base32), counter, digits);
}

/**
 * TOTP (RFC 6238) - the same HOTP, with the counter replaced by time.
 * C = floor((unix_seconds - T0) / period)
 */
export function totpCounter(nowMs = Date.now(), period = 30, t0 = 0) {
  return Math.floor((Math.floor(nowMs / 1000) - t0) / period);
}

export function totp(keyBytes, { digits = 6, period = 30, now = Date.now() } = {}) {
  return hotp(keyBytes, totpCounter(now, period), digits);
}

/**
 * A verifier, as a server would implement it: it never decrypts anything.
 * It recomputes codes for a window of counters ahead of the last one it
 * accepted, and compares. Codes at or below `lastAccepted` are dead.
 */
export function verify(keyBytes, code, lastAccepted = -1, window = 10, digits = 6) {
  const from = Math.max(0, lastAccepted + 1);
  for (let c = from; c <= lastAccepted + window; c++) {
    if (hotp(keyBytes, c, digits) === String(code)) {
      return { ok: true, counter: c, skipped: c - from, scanned: c - from + 1 };
    }
  }
  return { ok: false, counter: null, scanned: Math.max(0, lastAccepted + window - from + 1) };
}

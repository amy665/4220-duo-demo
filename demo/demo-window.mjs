#!/usr/bin/env node
/**
 * A tiny verifier, and what happens to old / skipped / future codes.
 *
 *   node demo/demo-window.mjs
 *
 * The server model:
 *   - it remembers the last counter it accepted;
 *   - it accepts a code whose counter is ahead of that, within a window;
 *   - a code it already moved past is dead, forever.
 *
 * This is why a HOTP client must keep the counter and why "skipping ahead
 * is safe, falling behind is fatal". No network, no real account.
 */

import { hotp, verify, base32Decode } from "./otp.mjs";

const RFC_KEY = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const key = base32Decode(RFC_KEY);
const WINDOW = 10;

let lastAccepted = -1;

const line = (s = "") => console.log(s);
const rule = (ch = "-") => line(ch.repeat(64));

function use(counter, label) {
  const code = hotp(key, counter);
  const res = verify(key, code, lastAccepted, WINDOW);
  const verdict = res.ok ? "ACCEPT" : "REJECT";
  line(
    `  ${label.padEnd(26)}counter ${String(counter).padStart(3)}  ` +
      `code ${code}  ->  ${verdict}` +
      (res.ok && res.skipped ? `  (skipped ${res.skipped})` : "")
  );
  if (res.ok) lastAccepted = res.counter;
  return res;
}

line();
line("  SERVER-SIDE VERIFICATION - shared key, remembered counter");
rule("=");
line(`  window: ${WINDOW} counters ahead of the last accepted one`);
line(`  server state: last accepted counter = ${lastAccepted} (nothing yet)`);
rule("=");
line();

use(0, "first login");
use(0, "same code again");
use(1, "next login");
use(0, "an old code");
use(6, "client jumped ahead");
use(40, "client jumped way ahead");
use(7, "normal login after that");
use(2, "a stale code from earlier");

line();
rule("=");
line(`  server state: last accepted counter = ${lastAccepted}`);
rule("=");
line(`
  What this shows
  ---------------
  1. A code is single-use. Submitting it twice fails the second time.
  2. A code behind the server's counter is dead. The client must move
     forward - that is the whole "counter drift" problem.
  3. Moving ahead inside the window is fine, and costs nothing. The
     server simply jumps its counter to whatever matched.
  4. Moving too far ahead fails: the window is bounded, to limit guessing.
  5. The server compared numbers. It never decrypted anything.

  Practical consequence for a real client: keep the counter, advance it
  on use, and if codes start being rejected, walk forward a few steps.
`);
line("  Next: open demo/demo.html in a browser (shared secret, live).");
line();

# Demo script - 6 minutes, three acts

Everything runs offline. Nothing to log into, nothing to hide. The key on screen is a published
test vector.

**Before you start**

```bash
cd 4220-duo-demo
node demo/demo-step.mjs        # once, to check Node is installed
```

Open two windows: a terminal (large font, ~18pt) and `demo/demo.html` in a browser. Set the
browser to full screen; press `Ctrl` + `+` once or twice so the digits are readable from the back.

---

## Act 1 - One code, step by step (2 min)

Run:

```bash
node demo/demo-step.mjs
```

Say, in this order:

1. *"This is the whole system. A secret, a counter, and one hash function."*
2. *"Step 1: the secret is stored as base32. That is an encoding, not encryption - anyone can
   decode it. The secrecy is the secret itself, not the format."*
3. *"Step 2: HOTP turns time into a counter. 0, 1, 2, 3 - one step per login. TOTP uses
   time divided by 30 instead. Everything else is identical."*
4. *"Step 3: HMAC-SHA1 mixes the key and the counter into 20 bytes. One-way. You cannot get the
   key back out."*
5. *"Steps 4 and 5: the 20 bytes are too long to type, so the RFC says take 4 of them, chosen by
   the last byte, and clear the sign bit. Then mod a million. That is the six digits."*
6. *"Step 6: the server does not decrypt this. It runs the same five steps and compares."*

Then run the next counter:

```bash
node demo/demo-step.mjs --counter 1
```

*"Same secret, counter 1, completely different code. The digits are a function of the pair
(secret, counter) - nothing else."*

---

## Act 2 - The counter is the hard part (2 min)

Run:

```bash
node demo/demo-window.mjs
```

Walk down the table:

1. *"First login: accepted. The server now remembers counter 0."*
2. *"Same code again: rejected. It is single-use."*
3. *"Counter 1: accepted. Normal."*
4. *"Old code: rejected. The server has moved past it. This is why a client that falls behind
   stops working - and why the counter has to be saved."*
5. *"Jumped ahead by 4: accepted, because the server checks a window ahead of its last counter.
   Skipping forward is free."*
6. *"Jumped ahead by 34: rejected. The window is bounded, otherwise guessing gets easy."*

Close with: *"HOTP is stateless on the server and stateful on the client. That one sentence explains
almost every real-world OTP bug."*

---

## Act 3 - Two devices, no communication (1.5 min)

Switch to `demo/demo.html`.

1. *"Two devices. Same secret. Neither has ever spoken to the other."*
2. *"Both show 755 224 at counter 0. Identical, computed locally, no network."*
3. Press **+** on Device A.
   *"Now A is on counter 1 and B is still on 0. Same secret, different code - this is counter drift.
   This is exactly what happens when you use the same account on two machines."*
4. Press **Reset**, then point at the TOTP card.
   *"Same key, but the counter is now the clock divided by 30. Watch it change on its own, no
   button press. That is the only difference between HOTP and TOTP."*
5. Point at the yellow box.
   *"Nothing on this page decrypts anything. The server recomputes the hash and compares. There is
   no decryption step in an OTP system."*

---

## Act 4 - Optional, if there is time (1 min)

```bash
npm test
```

*"Fifteen checks against the published RFC vectors - not against my own code. The vectors are the
specification's, so this proves the algorithm is the real one."*

---

## Questions you will get, and short answers

**"Can't you just guess 6 digits?"**
A million possibilities per code, but the code dies after one use (or 30 seconds for TOTP) and the
server rate-limits. The attacker also needs the secret, which is 160+ bits.

**"Why not just encrypt something?"**
Because there is no message to send. Both sides derive the same number from the same secret. A
ciphertext would need a channel and a key exchange at every login; OTP needs neither.

**"What if the clocks differ?"**
TOTP: the server checks a window of adjacent time steps (±1 usually). HOTP: no clock involved, but
the counter must be tracked.

**"Is the secret encrypted on the phone?"**
Not by the algorithm. The OS keychain or the hardware element protects it. In a plain file it is
plain text - which is a real weakness, and a good note to end on.

**"Why SHA-1? Isn't it broken?"**
SHA-1 collisions are broken; HMAC-SHA1 is not affected by collision attacks, and RFC 4226 predates
SHA-256 OTPs. Modern systems can use HMAC-SHA256 (RFC 6238 allows it), and the structure is
identical.

**"Where does the QR code fit in?"**
Nowhere in generation. The QR code is the enrolment step: it carries the shared secret from the
server to the device once. After that, it is never used again.

---

## Timing

| Act | Content | Time |
|---|---|---|
| 1 | one code, step by step | 2:00 |
| 2 | counter window | 2:00 |
| 3 | browser: shared secret + TOTP | 1:30 |
| 4 | tests (optional) | 1:00 |

If you only get 3 minutes: Act 1 + Act 3, and say the counter-window sentence out loud instead of
running it.

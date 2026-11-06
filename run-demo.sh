#!/usr/bin/env bash
# macOS / Linux equivalent of run-demo.cmd
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install it from https://nodejs.org/ and run this again."
  exit 1
fi

step() {
  echo
  echo "================================================================"
  echo "  $1"
  echo "================================================================"
}

step "ACT 1 - one passcode, every intermediate value"
node demo/demo-step.mjs
read -r -p "  [Enter] to continue..."

step "ACT 2 - counter walk, checked against RFC 4226"
node demo/demo-counter.mjs
read -r -p "  [Enter] to continue..."

step "ACT 3 - how a server accepts / rejects codes"
node demo/demo-window.mjs
read -r -p "  [Enter] to continue..."

step "ACT 4 - browser demo (two devices, shared secret)"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open demo/demo.html
elif command -v open >/dev/null 2>&1; then
  open demo/demo.html
else
  echo "  Open demo/demo.html in your browser."
fi

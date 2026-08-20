#!/bin/bash
# Copy the recording-layer sources into the loadable test extension.
set -euo pipefail
cd "$(dirname "$0")"
SRC="../src"
cp "$SRC/background/recording/engine.js" test-ext/engine.js
cp "$SRC/background/recording/adapter.js" test-ext/adapter.js
cp "$SRC/background/recording/selftest.js" test-ext/selftest.js
cp "$SRC/content/recording-content.js" test-ext/recording-content.js
mkdir -p test-ext/src/diagnostics
cp "$SRC/diagnostics/"* test-ext/src/diagnostics/
echo "synced"

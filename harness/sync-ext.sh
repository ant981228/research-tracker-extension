#!/bin/bash
# Copy the engine files from the worktree into the test extension.
set -euo pipefail
cd "$(dirname "$0")"
SRC="../rt-rec/src"
cp "$SRC/background/recording/engine.js" test-ext/engine.js
cp "$SRC/background/recording/adapter.js" test-ext/adapter.js
cp "$SRC/content/recording-content.js" test-ext/recording-content.js
echo "synced"

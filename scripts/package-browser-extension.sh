#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$ROOT_DIR/browser-extension/manifest.json"
OUTPUT_DIR="$ROOT_DIR/public/downloads"

VERSION="$(node -pe "JSON.parse(require('fs').readFileSync('$MANIFEST','utf8')).version")"
OUTPUT_FILE="$OUTPUT_DIR/nowbuild-publisher-extension-${VERSION}.zip"

mkdir -p "$OUTPUT_DIR"
rm -f "$OUTPUT_FILE"

cd "$ROOT_DIR"
zip -rq "$OUTPUT_FILE" browser-extension \
  -x "browser-extension/.DS_Store" \
  -x "browser-extension/**/*.map"

echo "Created $OUTPUT_FILE"

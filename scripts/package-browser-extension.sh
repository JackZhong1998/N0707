#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/public/downloads"
OUTPUT_FILE="$OUTPUT_DIR/nowbuild-publisher-extension-0.2.1.zip"

mkdir -p "$OUTPUT_DIR"
rm -f "$OUTPUT_FILE"

cd "$ROOT_DIR"
zip -rq "$OUTPUT_FILE" browser-extension \
  -x "browser-extension/.DS_Store" \
  -x "browser-extension/**/*.map"

echo "Created $OUTPUT_FILE"

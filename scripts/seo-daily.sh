#!/bin/bash

set -euo pipefail

PROJECT_DIR='/Users/bytedance/Documents/1啊啊aaacode/nowbuild0707'
AUTOMATION_DIR="${PROJECT_DIR}/.seo-automation"
REPORT_DIR="${AUTOMATION_DIR}/reports"
LOG_DIR="${AUTOMATION_DIR}/logs"
INPUT_DIR="${AUTOMATION_DIR}/input"
LOCK_DIR="${AUTOMATION_DIR}/run.lock"
PROMPT_FILE="${PROJECT_DIR}/scripts/seo-daily-prompt.md"
CODEX_BIN='/Applications/ChatGPT.app/Contents/Resources/codex'

mkdir -p "${REPORT_DIR}" "${LOG_DIR}" "${INPUT_DIR}"

if [[ "${1:-}" == '--check' ]]; then
  [[ -x "${CODEX_BIN}" ]] || { printf 'Missing Codex CLI: %s\n' "${CODEX_BIN}"; exit 1; }
  [[ -f "${PROMPT_FILE}" ]] || { printf 'Missing prompt: %s\n' "${PROMPT_FILE}"; exit 1; }
  [[ -f "${PROJECT_DIR}/SEO_BLUEPRINT.md" ]] || { printf 'Missing SEO blueprint\n'; exit 1; }
  printf 'SEO daily automation check passed.\n'
  exit 0
fi

if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
  exit 0
fi

cleanup() {
  rmdir "${LOCK_DIR}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

RUN_ID="$(date '+%Y-%m-%d_%H-%M-%S')"
REPORT_FILE="${REPORT_DIR}/${RUN_ID}.md"
LOG_FILE="${LOG_DIR}/${RUN_ID}.log"

if [[ ! -x "${CODEX_BIN}" ]]; then
  printf 'Codex CLI not found at %s\n' "${CODEX_BIN}" > "${LOG_FILE}"
  exit 1
fi

if [[ ! -f "${PROMPT_FILE}" ]]; then
  printf 'Prompt file not found at %s\n' "${PROMPT_FILE}" > "${LOG_FILE}"
  exit 1
fi

{
  printf 'NowBuild SEO daily task started: %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"
  "${CODEX_BIN}" exec \
    --cd "${PROJECT_DIR}" \
    --sandbox workspace-write \
    --ephemeral \
    --color never \
    --output-last-message "${REPORT_FILE}" \
    - < "${PROMPT_FILE}"
  printf 'NowBuild SEO daily task finished: %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"
} >> "${LOG_FILE}" 2>&1

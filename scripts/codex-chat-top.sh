#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/bensoncrew/bcrew-ai-os"
CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
SESSIONS_DIR="${CODEX_HOME_DIR}/sessions"
TARGET_FILE="${1:?target file required}"
CODEX_EXEC="${CODEX_CHAT_EXEC:-codex}"
shift

mkdir -p "$(dirname "$TARGET_FILE")"
: > "$TARGET_FILE"

BASELINE_FILE="$(mktemp)"

cleanup() {
  rm -f "$BASELINE_FILE"
}
trap cleanup EXIT

if [[ -d "$SESSIONS_DIR" ]]; then
  find "$SESSIONS_DIR" -type f -name '*.jsonl' -print | sort > "$BASELINE_FILE"
else
  : > "$BASELINE_FILE"
fi

detect_new_session() {
  local candidate
  while true; do
    if [[ -d "$SESSIONS_DIR" ]]; then
      while IFS= read -r candidate; do
        [[ -n "$candidate" ]] || continue
        if ! grep -Fqx "$candidate" "$BASELINE_FILE"; then
          printf '%s\n' "$candidate" > "$TARGET_FILE"
          return 0
        fi
      done < <(find "$SESSIONS_DIR" -type f -name '*.jsonl' -print | sort)
    fi
    sleep 0.2
  done
}

detect_new_session &
DETECT_PID=$!

exec "$CODEX_EXEC" "$@"

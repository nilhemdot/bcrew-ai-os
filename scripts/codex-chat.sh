#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/bensoncrew/bcrew-ai-os"
TMUX_BIN="${TMUX_BIN:-$(command -v tmux)}"
MONITOR_INTERVAL="${CODEX_MONITOR_INTERVAL:-5}"
DETACH=0
RUN_DIR="${TMPDIR:-/tmp}/codex-chat"

if [[ -z "${TMUX_BIN}" ]]; then
  echo "tmux is not installed." >&2
  exit 1
fi

mkdir -p "${RUN_DIR}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --detach)
      DETACH=1
      shift
      ;;
    --monitor-interval)
      MONITOR_INTERVAL="${2:-5}"
      shift 2
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

quote_args() {
  if [[ $# -eq 0 ]]; then
    return 0
  fi
  printf '%q ' "$@"
}

SESSION_NAME="codex-chat-$(date +%s)"
TARGET_FILE="${RUN_DIR}/${SESSION_NAME}.session"

CODEX_ARGS="$(quote_args "$@")"
ROOT_Q="$(printf '%q' "$ROOT")"
STATUS_SCRIPT_Q="$(printf '%q' "$ROOT/scripts/codex-status.mjs")"
TOP_SCRIPT_Q="$(printf '%q' "$ROOT/scripts/codex-chat-top.sh")"
TARGET_FILE_Q="$(printf '%q' "$TARGET_FILE")"

CODEX_CMD="${CODEX_CHAT_TOP_CMD:-cd ${ROOT_Q} && ${TOP_SCRIPT_Q} ${TARGET_FILE_Q} ${CODEX_ARGS}}"
MONITOR_CMD="while true; do printf '\\033[2J\\033[H'; if [[ -s ${TARGET_FILE_Q} ]]; then env -u CODEX_THREAD_ID node ${STATUS_SCRIPT_Q} --footer --session-file=\"\$(cat ${TARGET_FILE_Q})\" --no-color; else printf 'waiting for new Codex session...\\n'; fi; sleep ${MONITOR_INTERVAL}; done"
printf -v CODEX_TMUX_CMD 'zsh -lic %q' "$CODEX_CMD"
printf -v MONITOR_TMUX_CMD 'zsh -lc %q' "$MONITOR_CMD"

"${TMUX_BIN}" new-session -d -s "${SESSION_NAME}" "${CODEX_TMUX_CMD}"
"${TMUX_BIN}" set-option -t "${SESSION_NAME}" status off
"${TMUX_BIN}" set-option -t "${SESSION_NAME}" pane-border-status off
"${TMUX_BIN}" set-option -t "${SESSION_NAME}" mouse on
"${TMUX_BIN}" split-window -v -t "${SESSION_NAME}:0" -l 3 "${MONITOR_TMUX_CMD}"
"${TMUX_BIN}" select-pane -t "${SESSION_NAME}:0.0"

if [[ "${DETACH}" == "1" ]]; then
  echo "${SESSION_NAME}"
  exit 0
fi

if [[ -n "${TMUX:-}" ]]; then
  "${TMUX_BIN}" switch-client -t "${SESSION_NAME}"
else
  exec "${TMUX_BIN}" attach -t "${SESSION_NAME}"
fi

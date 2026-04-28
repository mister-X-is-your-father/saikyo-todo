#!/usr/bin/env bash
# loop-runner.sh — autonomous loop の deadline / lock / subprocess-claude 管理
#                  (Phase 6.15 iter256 系、v2: subprocess + git lock)
#
# cloud trigger 起動 1 回 = bash がオーケストレートする。Claude (subprocess) は
# loop の存在を知らない。各 iter は fresh `claude --print` を spawn することで
# context を完全リセット (effectively /clear)。
#
# v1 → v2 変更点:
#   - acquire-lock / release-lock: git push race を atomic CAS として serial 実行
#   - spawn-iter: `claude --print` を subprocess で起動 (毎 iter fresh context)
#   - main: 全部入りオーケストレータ (acquire → start → loop spawn → finalize → release)
#   - probe-claude: cloud env で claude CLI + OAuth 動作確認
#
# Usage:
#   loop-runner.sh probe-claude              # cloud env で claude CLI / 認証確認
#   loop-runner.sh main --mode=MODE --deadline=DUR  # 全部入り (trigger からはこれだけ)
#   loop-runner.sh start --mode=MODE --deadline=DUR # state file 作成
#   loop-runner.sh check [--json]            # 残り時間 KV
#   loop-runner.sh acquire-lock --mode=MODE [--ttl-min=N]  # repo 内 git lock
#   loop-runner.sh release-lock              # lock 解除
#   loop-runner.sh spawn-iter                # subprocess claude を spawn
#   loop-runner.sh finalize                  # state file 削除
#
# Duration format: "1h45m", "105m", "8h"
# State: $SAIKYO_LOOP_STATE (default /tmp/saikyo-loop.state)
# Lock: <repo>/.autonomous-lock (commit + push されるので across-fire で見える)
set -euo pipefail

STATE_FILE="${SAIKYO_LOOP_STATE:-/tmp/saikyo-loop.state}"
LAST_ORDER_BUFFER_MIN="${LAST_ORDER_BUFFER_MIN:-15}"
LOCK_TTL_MARGIN_MIN="${LOCK_TTL_MARGIN_MIN:-30}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCK_PATH="$REPO_ROOT/.autonomous-lock"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
ITER_LOG_DIR="${SAIKYO_ITER_LOG_DIR:-/tmp/saikyo-iter-logs}"

cmd="${1:-help}"
shift || true

parse_duration() {
  local d="$1"
  if [[ "$d" =~ ^([0-9]+)h([0-9]+)m$ ]]; then
    echo $(( BASH_REMATCH[1] * 60 + BASH_REMATCH[2] ))
  elif [[ "$d" =~ ^([0-9]+)m$ ]]; then
    echo "${BASH_REMATCH[1]}"
  elif [[ "$d" =~ ^([0-9]+)h$ ]]; then
    echo $(( BASH_REMATCH[1] * 60 ))
  else
    echo "ERROR: unknown duration format: $d (expected 1h45m / 105m / 8h)" >&2
    return 1
  fi
}

require_state() {
  [[ -f "$STATE_FILE" ]] || {
    echo "ERROR: state file missing ($STATE_FILE), did you call 'start'?" >&2
    exit 2
  }
}

# ----- subcommand: start -----
do_start() {
  local mode="" deadline_str=""
  for arg in "$@"; do
    case "$arg" in
      --mode=*) mode="${arg#--mode=}" ;;
      --deadline=*) deadline_str="${arg#--deadline=}" ;;
      *) echo "ERROR: unknown arg: $arg" >&2; exit 1 ;;
    esac
  done
  [[ -z "$mode" ]] && { echo "ERROR: --mode required (autonomous|playwright)" >&2; exit 1; }
  [[ "$mode" != "autonomous" && "$mode" != "playwright" ]] && {
    echo "ERROR: --mode must be 'autonomous' or 'playwright', got: $mode" >&2
    exit 1
  }
  [[ -z "$deadline_str" ]] && { echo "ERROR: --deadline required" >&2; exit 1; }
  local deadline_min last_order_min start_ts
  deadline_min=$(parse_duration "$deadline_str") || exit 1
  last_order_min=$(( deadline_min - LAST_ORDER_BUFFER_MIN ))
  [[ $last_order_min -lt 5 ]] && {
    echo "ERROR: deadline too short (last_order=${last_order_min}min < 5min)" >&2
    exit 1
  }
  start_ts=$(date +%s)
  cat > "$STATE_FILE" <<EOF
MODE=$mode
START_TS=$start_ts
DEADLINE_MIN=$deadline_min
LAST_ORDER_MIN=$last_order_min
ITER_COUNT=0
EOF
  echo "[loop-runner] started mode=$mode deadline=${deadline_min}min last_order=${last_order_min}min state=$STATE_FILE"
}

# ----- subcommand: check -----
do_check() {
  local json=0
  for arg in "$@"; do
    case "$arg" in
      --json) json=1 ;;
    esac
  done
  require_state
  # shellcheck disable=SC1090
  source "$STATE_FILE"
  local now_ts elapsed_min remaining_min over_last_order=0 over_deadline=0
  now_ts=$(date +%s)
  elapsed_min=$(( (now_ts - START_TS) / 60 ))
  remaining_min=$(( DEADLINE_MIN - elapsed_min ))
  [[ $elapsed_min -ge $LAST_ORDER_MIN ]] && over_last_order=1
  [[ $elapsed_min -ge $DEADLINE_MIN ]] && over_deadline=1
  if [[ $json -eq 1 ]]; then
    printf '{"mode":"%s","elapsedMin":%d,"remainingMin":%d,"lastOrderMin":%d,"overLastOrder":%s,"overDeadline":%s,"iterCount":%d}\n' \
      "$MODE" "$elapsed_min" "$remaining_min" "$LAST_ORDER_MIN" \
      "$( [[ $over_last_order -eq 1 ]] && echo true || echo false )" \
      "$( [[ $over_deadline -eq 1 ]] && echo true || echo false )" \
      "${ITER_COUNT:-0}"
  else
    echo "MODE=$MODE"
    echo "ELAPSED_MIN=$elapsed_min"
    echo "REMAINING_MIN=$remaining_min"
    echo "LAST_ORDER_MIN=$LAST_ORDER_MIN"
    echo "OVER_LAST_ORDER=$over_last_order"
    echo "OVER_DEADLINE=$over_deadline"
    echo "ITER_COUNT=${ITER_COUNT:-0}"
  fi
}

# ----- subcommand: finalize -----
do_finalize() {
  if [[ -f "$STATE_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$STATE_FILE"
    local elapsed_min
    elapsed_min=$(( ( $(date +%s) - START_TS ) / 60 ))
    echo "[loop-runner] finalize mode=$MODE elapsed=${elapsed_min}min iters=${ITER_COUNT:-0}"
    rm -f "$STATE_FILE"
  else
    echo "[loop-runner] finalize (no state file, idempotent OK)"
  fi
}

# ----- subcommand: probe-claude (cloud env で動作確認) -----
do_probe_claude() {
  echo "[probe] PATH=$PATH"
  echo "[probe] checking $CLAUDE_BIN..."
  if ! command -v "$CLAUDE_BIN" > /dev/null 2>&1; then
    echo "[probe] FAIL: '$CLAUDE_BIN' not found in PATH"
    echo "[probe] try: npm install -g @anthropic-ai/claude-code"
    exit 1
  fi
  local claude_path
  claude_path=$(command -v "$CLAUDE_BIN")
  echo "[probe] $CLAUDE_BIN at $claude_path"
  echo "[probe] $CLAUDE_BIN --version:"
  "$CLAUDE_BIN" --version || { echo "[probe] FAIL: --version exited non-zero"; exit 2; }
  echo "[probe] credentials:"
  if [[ -f "$HOME/.claude/.credentials.json" ]]; then
    echo "[probe]   ~/.claude/.credentials.json exists ($(stat -c%s "$HOME/.claude/.credentials.json" 2>/dev/null || stat -f%z "$HOME/.claude/.credentials.json") bytes)"
  elif [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
    echo "[probe]   ANTHROPIC_API_KEY env var set (\${#ANTHROPIC_API_KEY}=${#ANTHROPIC_API_KEY})"
  else
    echo "[probe]   FAIL: no credentials found at ~/.claude/.credentials.json or ANTHROPIC_API_KEY"
    exit 3
  fi
  echo "[probe] OK"
}

# ----- subcommand: acquire-lock -----
# git push race を atomic CAS として serial 実行を保証する。
# 既存 lock が valid なら exit 0 (skip)。stale なら take over。
# 我々の lock push が non-fast-forward で落ちたら別 agent が先取り → exit 0。
do_acquire_lock() {
  local mode="" ttl_min=""
  for arg in "$@"; do
    case "$arg" in
      --mode=*) mode="${arg#--mode=}" ;;
      --ttl-min=*) ttl_min="${arg#--ttl-min=}" ;;
    esac
  done
  [[ -z "$mode" ]] && { echo "ERROR: --mode required" >&2; exit 1; }
  [[ -z "$ttl_min" ]] && { echo "ERROR: --ttl-min required (deadline + margin)" >&2; exit 1; }

  cd "$REPO_ROOT"
  echo "[lock] fetching origin/main..."
  git fetch origin main --quiet
  # Be on main to push to it cleanly. Use a worktree-friendly flow: reset --hard if behind.
  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if [[ "$current_branch" == "main" ]]; then
    git pull --rebase origin main --quiet 2>&1 | tail -3 || true
  else
    echo "[lock] not on main (on $current_branch); will push HEAD:main with rebase fallback"
  fi

  if [[ -f "$LOCK_PATH" ]]; then
    # shellcheck disable=SC1090
    local LOCK_MODE LOCK_STARTED_AT LOCK_EXPIRES_TS LOCK_SESSION
    LOCK_MODE=""; LOCK_STARTED_AT=""; LOCK_EXPIRES_TS=0; LOCK_SESSION=""
    while IFS='=' read -r k v; do
      case "$k" in
        MODE) LOCK_MODE="$v" ;;
        STARTED_AT) LOCK_STARTED_AT="$v" ;;
        EXPIRES_TS) LOCK_EXPIRES_TS="$v" ;;
        SESSION) LOCK_SESSION="$v" ;;
      esac
    done < "$LOCK_PATH"
    local now_ts
    now_ts=$(date +%s)
    if [[ "$now_ts" -lt "$LOCK_EXPIRES_TS" ]]; then
      local remain_min=$(( (LOCK_EXPIRES_TS - now_ts) / 60 ))
      echo "[lock] HELD by mode=$LOCK_MODE since $LOCK_STARTED_AT (expires in ${remain_min}min, session=$LOCK_SESSION)"
      echo "[lock] exiting cleanly (skip this fire)"
      exit 0
    fi
    echo "[lock] previous lock is stale (expired at $LOCK_EXPIRES_TS), taking over"
  fi

  local started_at started_ts expires_ts session_hint
  started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  started_ts=$(date +%s)
  expires_ts=$(( started_ts + ttl_min * 60 ))
  session_hint="${SAIKYO_SESSION_ID:-$(hostname 2>/dev/null || echo unknown)-$$}"
  cat > "$LOCK_PATH" <<EOF
MODE=$mode
STARTED_AT=$started_at
STARTED_TS=$started_ts
EXPIRES_TS=$expires_ts
SESSION=$session_hint
EOF
  git add "$LOCK_PATH"
  git commit --no-verify -m "chore(autonomous): lock acquired ($mode, expires +${ttl_min}min)" >/dev/null

  echo "[lock] attempting atomic push (race CAS)..."
  if git push origin HEAD:main --no-verify 2>&1 | tail -3; then
    echo "[lock] ACQUIRED (mode=$mode, expires_ts=$expires_ts)"
    return 0
  fi
  echo "[lock] push FAILED — another agent took the lock first"
  echo "[lock] resetting local state and exiting cleanly"
  git reset --hard "origin/main" --quiet
  exit 0
}

# ----- subcommand: release-lock -----
do_release_lock() {
  cd "$REPO_ROOT"
  git fetch origin main --quiet || true
  if [[ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" == "main" ]]; then
    git pull --rebase origin main --quiet 2>&1 | tail -3 || true
  fi

  if [[ ! -f "$LOCK_PATH" ]]; then
    echo "[unlock] no lock file (already released or never acquired)"
    return 0
  fi
  git rm "$LOCK_PATH" >/dev/null
  git commit --no-verify -m "chore(autonomous): lock released" >/dev/null

  local attempts=3
  while (( attempts > 0 )); do
    if git push origin HEAD:main --no-verify 2>&1 | tail -3; then
      echo "[unlock] released"
      return 0
    fi
    echo "[unlock] push failed, rebase + retry ($attempts left)"
    git pull --rebase origin main --quiet 2>&1 | tail -3 || true
    attempts=$(( attempts - 1 ))
  done
  echo "[unlock] WARNING: persistent push failure, lock file may need manual cleanup"
  return 1
}

# ----- subcommand: spawn-iter -----
do_spawn_iter() {
  require_state
  # shellcheck disable=SC1090
  source "$STATE_FILE"
  local mode="$MODE"

  if ! command -v "$CLAUDE_BIN" > /dev/null 2>&1; then
    echo "[spawn-iter] FAIL: $CLAUDE_BIN not in PATH; run probe-claude first"
    return 1
  fi

  mkdir -p "$ITER_LOG_DIR"
  local iter_idx=$(( ${ITER_COUNT:-0} + 1 ))
  # 並列 spawn でも衝突しない unique 名: 秒単位 + nanos + PID (BASHPID は subshell でも別)
  local log_file="$ITER_LOG_DIR/iter-$(date +%Y%m%dT%H%M%S%N)-pid${BASHPID:-$$}-${mode}-${iter_idx}.log"

  local instruction_file="$SCRIPT_DIR/iter-instruction-${mode}.md"
  if [[ ! -f "$instruction_file" ]]; then
    echo "[spawn-iter] FAIL: instruction file missing: $instruction_file"
    return 1
  fi

  echo "[spawn-iter] mode=$mode iter=$iter_idx log=$log_file"
  local turns_limit="${SAIKYO_ITER_MAX_TURNS:-120}"
  local allowed_tools="Bash,Read,Write,Edit,Glob,Grep"
  if [[ "$mode" == "playwright" ]]; then
    allowed_tools="$allowed_tools,mcp__playwright__*"
  fi

  local exit_code=0
  cd "$REPO_ROOT"
  if "$CLAUDE_BIN" --print \
      --max-turns "$turns_limit" \
      --allowed-tools "$allowed_tools" \
      < "$instruction_file" \
      > "$log_file" 2>&1; then
    exit_code=0
  else
    exit_code=$?
  fi

  echo "[spawn-iter] subprocess exit=$exit_code (last 10 lines of log:)"
  tail -10 "$log_file" || true

  # state file の ITER_COUNT を更新
  if [[ -f "$STATE_FILE" ]]; then
    sed -i.bak "s/^ITER_COUNT=.*/ITER_COUNT=$iter_idx/" "$STATE_FILE" 2>/dev/null && rm -f "${STATE_FILE}.bak" || \
      sed -i '' "s/^ITER_COUNT=.*/ITER_COUNT=$iter_idx/" "$STATE_FILE" 2>/dev/null || true
  fi
  return $exit_code
}

# ----- subcommand: main (全部入りオーケストレータ) -----
# trigger prompt はこれを呼ぶだけにする。
do_main() {
  local mode="" deadline_str="" concurrency=1
  for arg in "$@"; do
    case "$arg" in
      --mode=*) mode="${arg#--mode=}" ;;
      --deadline=*) deadline_str="${arg#--deadline=}" ;;
      --concurrency=*) concurrency="${arg#--concurrency=}" ;;
    esac
  done
  [[ -z "$mode" || -z "$deadline_str" ]] && {
    echo "ERROR: --mode and --deadline required" >&2
    exit 1
  }
  if ! [[ "$concurrency" =~ ^[1-9][0-9]?$ ]] || [[ "$concurrency" -gt 8 ]]; then
    echo "ERROR: --concurrency must be 1-8 (got: $concurrency)" >&2
    exit 1
  fi
  local deadline_min ttl_min
  deadline_min=$(parse_duration "$deadline_str") || exit 1
  ttl_min=$(( deadline_min + LOCK_TTL_MARGIN_MIN ))

  echo "============================================================"
  echo " loop-runner main mode=$mode deadline=$deadline_str (=${deadline_min}min)"
  echo " lock TTL=${ttl_min}min, last_order_buffer=${LAST_ORDER_BUFFER_MIN}min"
  echo " concurrency=${concurrency} $( [[ $concurrency -gt 1 ]] && echo '(PARALLEL — 注意: HANDOFF.md merge conflict 多発の可能性、push-main.sh の rebase fallback 頼り)' )"
  echo " $(date -u)"
  echo "============================================================"

  # 1. acquire-lock (失敗 / skip なら exit 0 内部で発生)
  do_acquire_lock --mode="$mode" --ttl-min="$ttl_min"

  # 以降は EXIT trap で必ず lock を解除
  trap '_main_cleanup' EXIT INT TERM

  # 2. start state
  do_start --mode="$mode" --deadline="$deadline_str"

  # 3. ループ
  local consecutive_fail=0
  while true; do
    local check_out
    if ! check_out=$(do_check 2>&1); then
      echo "[main] check failed: $check_out"
      break
    fi
    local over_last_order remaining
    over_last_order=$(echo "$check_out" | grep '^OVER_LAST_ORDER=' | cut -d= -f2)
    remaining=$(echo "$check_out" | grep '^REMAINING_MIN=' | cut -d= -f2)
    if [[ "$over_last_order" == "1" ]]; then
      echo "[main] OVER_LAST_ORDER=1, ending loop"
      break
    fi
    if [[ "$remaining" -lt 25 ]]; then
      echo "[main] REMAINING_MIN=$remaining < 25, ending loop with safety margin"
      break
    fi

    if [[ "$concurrency" -eq 1 ]]; then
      # serial (default)
      echo "[main] starting iter (remaining=${remaining}min, serial)"
      if do_spawn_iter; then
        consecutive_fail=0
      else
        consecutive_fail=$(( consecutive_fail + 1 ))
        echo "[main] iter failed (consecutive=$consecutive_fail)"
        if [[ "$consecutive_fail" -ge 3 ]]; then
          echo "[main] 3 consecutive failures, aborting loop"
          break
        fi
      fi
    else
      # parallel batch (opt-in via --concurrency=N)
      echo "[main] starting parallel batch of $concurrency iters (remaining=${remaining}min)"
      local pids=()
      local i
      for ((i=1; i<=concurrency; i++)); do
        # 1-2 sec offset で git race を緩和 (lock は既に取得済なので実害は HANDOFF.md merge のみ)
        do_spawn_iter &
        pids+=("$!")
        sleep 2
      done
      local batch_fail=0
      for pid in "${pids[@]}"; do
        if ! wait "$pid"; then
          batch_fail=$(( batch_fail + 1 ))
        fi
      done
      echo "[main] parallel batch done (failed=$batch_fail/$concurrency)"
      if [[ "$batch_fail" -eq "$concurrency" ]]; then
        consecutive_fail=$(( consecutive_fail + 1 ))
        if [[ "$consecutive_fail" -ge 2 ]]; then
          echo "[main] 2 consecutive batch-all-fail, aborting loop"
          break
        fi
      else
        consecutive_fail=0
      fi
    fi
  done

  echo "[main] loop ended, cleanup will run via trap"
}

_main_cleanup() {
  trap - EXIT INT TERM
  echo "[main] cleanup: finalize + release-lock"
  do_finalize || true
  do_release_lock || true
}

# ----- dispatch -----
case "$cmd" in
  start) do_start "$@" ;;
  check) do_check "$@" ;;
  finalize) do_finalize "$@" ;;
  acquire-lock) do_acquire_lock "$@" ;;
  release-lock) do_release_lock "$@" ;;
  spawn-iter) do_spawn_iter "$@" ;;
  probe-claude) do_probe_claude "$@" ;;
  main) do_main "$@" ;;
  help|--help|-h)
    sed -n '2,30p' "$0"
    ;;
  *)
    echo "ERROR: unknown command: $cmd" >&2
    sed -n '2,30p' "$0" >&2
    exit 1
    ;;
esac

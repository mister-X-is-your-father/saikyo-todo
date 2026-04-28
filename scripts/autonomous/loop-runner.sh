#!/usr/bin/env bash
# loop-runner.sh — autonomous loop の deadline / state 管理 (Phase 6.15 iter256 系)
#
# cloud trigger 起動 1 回 = 1 session 内で複数 iter を回すための薄い tracker。
# 1 iter ごとの実装ロジックは agent (Claude) が担う。本 script は
# 「あとどれだけ時間があるか / ラストオーダーを越えたか」だけを判定する。
#
# 設計思想:
#   - cloud CCR の hard timeout (推測 60-90 min) で殺される可能性が高いので、
#     各 commit を immediate push して途中で死んでも push 済が安全に残る運用前提
#   - LAST_ORDER = 残り時間が LAST_ORDER_BUFFER_MIN (default 15) を切ったら新規 iter 着手禁止
#   - finalize は idempotent (state 無くても落ちない)
#
# Usage:
#   loop-runner.sh start --mode=autonomous|playwright --deadline=<DURATION>
#   loop-runner.sh check                 # parse-friendly KV を stdout に出す
#   loop-runner.sh check --json          # JSON で出す
#   loop-runner.sh finalize              # state file を消して 1 行サマリ
#
# Duration format: "1h45m", "105m", "8h", "7h45m"
#
# State file: $SAIKYO_LOOP_STATE (default /tmp/saikyo-loop.state)
#
# ローカル test: scripts/autonomous/loop-runner.test.sh
set -euo pipefail

STATE_FILE="${SAIKYO_LOOP_STATE:-/tmp/saikyo-loop.state}"
LAST_ORDER_BUFFER_MIN="${LAST_ORDER_BUFFER_MIN:-15}"

cmd="${1:-help}"
shift || true

# "1h45m" / "105m" / "8h" を 分単位の整数に変換
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

case "$cmd" in
  start)
    mode=""
    deadline_str=""
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
    deadline_min=$(parse_duration "$deadline_str") || exit 1
    last_order_min=$(( deadline_min - LAST_ORDER_BUFFER_MIN ))
    [[ $last_order_min -lt 5 ]] && {
      echo "ERROR: deadline too short (last_order=${last_order_min}min < 5min). need deadline > buffer($LAST_ORDER_BUFFER_MIN)min + 5min" >&2
      exit 1
    }
    start_ts=$(date +%s)
    cat > "$STATE_FILE" <<EOF
MODE=$mode
START_TS=$start_ts
DEADLINE_MIN=$deadline_min
LAST_ORDER_MIN=$last_order_min
EOF
    echo "[loop-runner] started mode=$mode deadline=${deadline_min}min last_order=${last_order_min}min state=$STATE_FILE"
    ;;
  check)
    json=0
    for arg in "$@"; do
      case "$arg" in
        --json) json=1 ;;
      esac
    done
    [[ ! -f "$STATE_FILE" ]] && {
      echo "ERROR: state file missing ($STATE_FILE), did you call 'start'?" >&2
      exit 2
    }
    # shellcheck disable=SC1090
    source "$STATE_FILE"
    now_ts=$(date +%s)
    elapsed_min=$(( (now_ts - START_TS) / 60 ))
    remaining_min=$(( DEADLINE_MIN - elapsed_min ))
    over_last_order=0
    [[ $elapsed_min -ge $LAST_ORDER_MIN ]] && over_last_order=1
    over_deadline=0
    [[ $elapsed_min -ge $DEADLINE_MIN ]] && over_deadline=1
    if [[ $json -eq 1 ]]; then
      printf '{"mode":"%s","elapsedMin":%d,"remainingMin":%d,"lastOrderMin":%d,"overLastOrder":%s,"overDeadline":%s}\n' \
        "$MODE" "$elapsed_min" "$remaining_min" "$LAST_ORDER_MIN" \
        "$( [[ $over_last_order -eq 1 ]] && echo true || echo false )" \
        "$( [[ $over_deadline -eq 1 ]] && echo true || echo false )"
    else
      echo "MODE=$MODE"
      echo "ELAPSED_MIN=$elapsed_min"
      echo "REMAINING_MIN=$remaining_min"
      echo "LAST_ORDER_MIN=$LAST_ORDER_MIN"
      echo "OVER_LAST_ORDER=$over_last_order"
      echo "OVER_DEADLINE=$over_deadline"
    fi
    ;;
  finalize)
    if [[ -f "$STATE_FILE" ]]; then
      # shellcheck disable=SC1090
      source "$STATE_FILE"
      now_ts=$(date +%s)
      elapsed_min=$(( (now_ts - START_TS) / 60 ))
      echo "[loop-runner] finalize mode=$MODE elapsed=${elapsed_min}min"
      rm -f "$STATE_FILE"
    else
      echo "[loop-runner] finalize (no state file, idempotent OK)"
    fi
    ;;
  help|--help|-h)
    sed -n '2,30p' "$0"
    ;;
  *)
    echo "ERROR: unknown command: $cmd" >&2
    sed -n '2,30p' "$0" >&2
    exit 1
    ;;
esac

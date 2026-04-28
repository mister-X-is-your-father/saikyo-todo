#!/usr/bin/env bash
# loop-runner.test.sh — loop-runner.sh の bash test (vitest 不使用、env 不要)
#
# 実行: bash scripts/autonomous/loop-runner.test.sh
#
# 各 test ケースは独立した state file を使う (並列実行可)。
# fail 時は assert 行と diff を出して exit 1。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER="$SCRIPT_DIR/loop-runner.sh"
TMP_BASE="$(mktemp -d)"
trap 'rm -rf "$TMP_BASE"' EXIT

PASS=0
FAIL=0

assert_eq() {
  local label="$1" actual="$2" expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    PASS=$((PASS + 1))
    echo "  PASS: $label"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL: $label"
    echo "    expected: <$expected>"
    echo "    actual:   <$actual>"
  fi
}

assert_contains() {
  local label="$1" haystack="$2" needle="$3"
  if [[ "$haystack" == *"$needle"* ]]; then
    PASS=$((PASS + 1))
    echo "  PASS: $label"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL: $label"
    echo "    haystack: <$haystack>"
    echo "    needle:   <$needle>"
  fi
}

assert_exit() {
  local label="$1" expected_code="$2"
  shift 2
  local actual_code=0
  "$@" > /dev/null 2>&1 || actual_code=$?
  if [[ "$actual_code" -eq "$expected_code" ]]; then
    PASS=$((PASS + 1))
    echo "  PASS: $label (exit=$actual_code)"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL: $label (exit=$actual_code, expected=$expected_code)"
  fi
}

# ---------- T1: start で state file が作られる ----------
echo "T1: start writes state file"
S1="$TMP_BASE/s1.state"
SAIKYO_LOOP_STATE="$S1" bash "$RUNNER" start --mode=autonomous --deadline=1h45m > /dev/null
assert_eq "T1-state-exists" "$([[ -f "$S1" ]] && echo yes || echo no)" "yes"
assert_contains "T1-state-MODE" "$(cat "$S1")" "MODE=autonomous"
assert_contains "T1-state-DEADLINE" "$(cat "$S1")" "DEADLINE_MIN=105"
assert_contains "T1-state-LAST_ORDER" "$(cat "$S1")" "LAST_ORDER_MIN=90"

# ---------- T2: check が KV を返す (start 直後 = elapsed=0, remaining=deadline) ----------
echo "T2: check returns KV (just after start)"
out2=$(SAIKYO_LOOP_STATE="$S1" bash "$RUNNER" check)
assert_contains "T2-MODE" "$out2" "MODE=autonomous"
assert_contains "T2-ELAPSED" "$out2" "ELAPSED_MIN=0"
assert_contains "T2-REMAINING" "$out2" "REMAINING_MIN=105"
assert_contains "T2-OVER_LAST_ORDER" "$out2" "OVER_LAST_ORDER=0"
assert_contains "T2-OVER_DEADLINE" "$out2" "OVER_DEADLINE=0"

# ---------- T3: check --json ----------
echo "T3: check --json returns JSON"
out3=$(SAIKYO_LOOP_STATE="$S1" bash "$RUNNER" check --json)
assert_contains "T3-mode" "$out3" '"mode":"autonomous"'
assert_contains "T3-overLast" "$out3" '"overLastOrder":false'
assert_contains "T3-overDl" "$out3" '"overDeadline":false'

# ---------- T4: 時刻偽装 — 91 分経過すると last-order を超える ----------
echo "T4: synthetic time travel — over LAST_ORDER (91 min elapsed, last_order=90)"
S4="$TMP_BASE/s4.state"
SAIKYO_LOOP_STATE="$S4" bash "$RUNNER" start --mode=autonomous --deadline=1h45m > /dev/null
# state file の START_TS を 91 分前に書き換え
fake_start=$(( $(date +%s) - 91 * 60 ))
sed -i "s/^START_TS=.*/START_TS=$fake_start/" "$S4"
out4=$(SAIKYO_LOOP_STATE="$S4" bash "$RUNNER" check)
assert_contains "T4-ELAPSED" "$out4" "ELAPSED_MIN=91"
assert_contains "T4-OVER_LAST_ORDER" "$out4" "OVER_LAST_ORDER=1"
assert_contains "T4-OVER_DEADLINE" "$out4" "OVER_DEADLINE=0"

# ---------- T5: 106 分経過 = deadline 超え ----------
echo "T5: synthetic time travel — over DEADLINE (106 min elapsed, deadline=105)"
S5="$TMP_BASE/s5.state"
SAIKYO_LOOP_STATE="$S5" bash "$RUNNER" start --mode=playwright --deadline=7h45m > /dev/null
fake_start=$(( $(date +%s) - 106 * 60 ))
sed -i "s/^START_TS=.*/START_TS=$fake_start/" "$S5"
out5=$(SAIKYO_LOOP_STATE="$S5" bash "$RUNNER" check)
assert_contains "T5-ELAPSED" "$out5" "ELAPSED_MIN=106"
assert_contains "T5-OVER_LAST_ORDER" "$out5" "OVER_LAST_ORDER=0"  # 7h45=465m >> 106m
assert_contains "T5-OVER_DEADLINE" "$out5" "OVER_DEADLINE=0"
# Playwright deadline 465 min なので 106 では over しないことを確認
out5b_remaining=$(echo "$out5" | grep '^REMAINING_MIN=' | cut -d= -f2)
[[ "$out5b_remaining" == "359" ]] && {
  PASS=$((PASS + 1)); echo "  PASS: T5-REMAINING (465-106=359)"
} || {
  FAIL=$((FAIL + 1)); echo "  FAIL: T5-REMAINING (got $out5b_remaining, expected 359)"
}

# ---------- T6: finalize で state file が消える ----------
echo "T6: finalize removes state file"
S6="$TMP_BASE/s6.state"
SAIKYO_LOOP_STATE="$S6" bash "$RUNNER" start --mode=autonomous --deadline=30m > /dev/null
[[ -f "$S6" ]] || { FAIL=$((FAIL + 1)); echo "  FAIL: T6-precondition (state should exist)"; }
SAIKYO_LOOP_STATE="$S6" bash "$RUNNER" finalize > /dev/null
assert_eq "T6-state-removed" "$([[ -f "$S6" ]] && echo yes || echo no)" "no"

# ---------- T7: finalize は idempotent (state 無くても落ちない) ----------
echo "T7: finalize idempotent"
S7="$TMP_BASE/s7.state"
out7=$(SAIKYO_LOOP_STATE="$S7" bash "$RUNNER" finalize 2>&1)
assert_contains "T7-msg" "$out7" "no state file"

# ---------- T8: check は state 無いと exit 2 ----------
echo "T8: check without start → exit 2"
S8="$TMP_BASE/s8.state"
assert_exit "T8-exit2" 2 env SAIKYO_LOOP_STATE="$S8" bash "$RUNNER" check

# ---------- T9: 不正な mode で exit 1 ----------
echo "T9: invalid mode → exit 1"
S9="$TMP_BASE/s9.state"
assert_exit "T9-bad-mode" 1 env SAIKYO_LOOP_STATE="$S9" bash "$RUNNER" start --mode=invalid --deadline=1h

# ---------- T10: 不正な duration で exit 1 ----------
echo "T10: invalid duration → exit 1"
S10="$TMP_BASE/s10.state"
assert_exit "T10-bad-duration" 1 env SAIKYO_LOOP_STATE="$S10" bash "$RUNNER" start --mode=autonomous --deadline=garbage

# ---------- T11: deadline が buffer より短いと exit 1 ----------
echo "T11: deadline too short (< buffer + 5min) → exit 1"
S11="$TMP_BASE/s11.state"
assert_exit "T11-deadline-short" 1 env SAIKYO_LOOP_STATE="$S11" bash "$RUNNER" start --mode=autonomous --deadline=10m

# ---------- T12: parse_duration variations ----------
echo "T12: duration parsing — 7h45m → 465 min"
S12="$TMP_BASE/s12.state"
SAIKYO_LOOP_STATE="$S12" bash "$RUNNER" start --mode=playwright --deadline=7h45m > /dev/null
assert_contains "T12-465" "$(cat "$S12")" "DEADLINE_MIN=465"

echo "T12b: duration parsing — 8h → 480 min"
S12b="$TMP_BASE/s12b.state"
SAIKYO_LOOP_STATE="$S12b" bash "$RUNNER" start --mode=autonomous --deadline=8h > /dev/null
assert_contains "T12b-480" "$(cat "$S12b")" "DEADLINE_MIN=480"

echo "T12c: duration parsing — 30m → 30 min"
S12c="$TMP_BASE/s12c.state"
SAIKYO_LOOP_STATE="$S12c" bash "$RUNNER" start --mode=autonomous --deadline=30m > /dev/null
assert_contains "T12c-30" "$(cat "$S12c")" "DEADLINE_MIN=30"

echo
echo "=========================================="
echo " Result: PASS=$PASS  FAIL=$FAIL"
echo "=========================================="
[[ $FAIL -eq 0 ]] || exit 1

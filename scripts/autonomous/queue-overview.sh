#!/usr/bin/env bash
# scripts/autonomous/queue-overview.sh
#
# FEEDBACK_QUEUE.md と直近 git log から、autonomous loop / 人間 agent が **5 秒で
# 現在地を把握する** visual ダッシュボード。
#
# 出力 sections (色付き):
#   1. 直近 5 commit (誰が何を land したか、parallel agent との競合 detect 用)
#   2. P0 entry summary (🔥 next iter / ★ priority 0 / 派生 P0 件数 / 全 [ ] 件数)
#   3. Methodology mode 進捗 (TC-1〜TC-4 / GT-1〜GT-4 / MS-1 の done/todo)
#   4. Fluffy widget series 進捗 (P0-1〜P0-8 の done/todo)
#   5. 直近 24h で land した commit 統計 (track 別)
#
# 用途:
#   - iter 冒頭: judge.sh の前後で叩いて重複 commit を避ける
#   - 人間 user: 「今 何が動いてる」 を git pull せず把握 (git fetch だけ要)
#
# 仕様の重要部分 (P0 規約 / fluffy 派生番号付け 等) を変えたいときは、本 file の上に
# 「変更前にやること」 を書き、parallel iter の取り込み後に bash side を直す。
#
# 使い方:
#   bash scripts/autonomous/queue-overview.sh         # 標準出力 (TTY なら色付き)
#   bash scripts/autonomous/queue-overview.sh --json  # JSON (CI / 集計用)
#   bash scripts/autonomous/queue-overview.sh --quiet # 集計値だけ (1 行 stats)

set -euo pipefail

JSON=0
QUIET=0
case "${1:-}" in
  --json) JSON=1 ;;
  --quiet) QUIET=1 ;;
  --help|-h)
    sed -n '2,24p' "$0"
    exit 0
    ;;
esac

cd "$(git rev-parse --show-toplevel)"

# 色 (TTY 判定、JSON / quiet では無効)
if [[ -t 1 && $JSON -eq 0 && $QUIET -eq 0 ]]; then
  C_RESET='\033[0m'
  C_BOLD='\033[1m'
  C_DIM='\033[2m'
  C_RED='\033[31m'
  C_GREEN='\033[32m'
  C_YELLOW='\033[33m'
  C_BLUE='\033[34m'
  C_MAGENTA='\033[35m'
  C_CYAN='\033[36m'
else
  C_RESET= C_BOLD= C_DIM= C_RED= C_GREEN= C_YELLOW= C_BLUE= C_MAGENTA= C_CYAN=
fi

QUEUE_FILE="FEEDBACK_QUEUE.md"
[[ -f "$QUEUE_FILE" ]] || { echo "ERROR: $QUEUE_FILE not found" >&2; exit 1; }

# ---------- 1. 直近 commit ----------
RECENT_COMMITS=$(git log --oneline -5 2>/dev/null)
# 全 commit を一度キャッシュ (methodology_done / fluffy_done が grep する)
LOG_ALL=$(git log --oneline 2>/dev/null || true)

# ---------- 2. P0 entry counts ----------
TODO_COUNT=$(grep -c '^- \[ \]' "$QUEUE_FILE" || true)
DONE_COUNT=$(grep -c '^- \[x\]' "$QUEUE_FILE" || true)
HOT_COUNT=$(grep -c '^#### 🌟' "$QUEUE_FILE" || true)
P0_COUNT=$(grep -cE '優先度 0|最優先 0|★★★' "$QUEUE_FILE" || true)

# ---------- 3. Methodology mode 進捗 ----------
# 各 P0 (TC-1〜4 / GT-1〜4 / MS-1) について「commit message に登場 + queue 完了マーク」
# の 2 経路で done 判定 (どちらかでも done なら done)
methodology_done() {
  local key="$1"
  # set -euo pipefail + grep -q SIGPIPE early-exit が原因で git log が失敗扱いに
  # なるので、log を一度変数に取ってから grep する。
  local n
  n=$(echo "$LOG_ALL" | grep -cE "queue: methodology $key" 2>/dev/null || true)
  [[ ${n:-0} -gt 0 ]] && echo "done" || echo "todo"
}
MS1=$(methodology_done MS-1)
TC1=$(methodology_done TC-1)
TC2=$(methodology_done TC-2)
TC3=$(methodology_done TC-3)
TC4=$(methodology_done TC-4)
GT1=$(methodology_done GT-1)
GT2=$(methodology_done GT-2)
GT3=$(methodology_done GT-3)
GT4=$(methodology_done GT-4)

# ---------- 4. Fluffy widget series 進捗 ----------
fluffy_done() {
  local n="$1"
  local cnt
  cnt=$(echo "$LOG_ALL" | grep -cE "queue: fluffy-$n" 2>/dev/null || true)
  [[ ${cnt:-0} -gt 0 ]] && echo "done" || echo "todo"
}
FL1=$(fluffy_done 1)
FL2=$(fluffy_done 2)
FL3=$(fluffy_done 3)
FL4=$(fluffy_done 4)
FL5=$(fluffy_done 5)
FL6=$(fluffy_done 6)
FL7=$(fluffy_done 7)
FL8=$(fluffy_done 8)

# ---------- 5. 24h commit 統計 ----------
SINCE="24 hours ago"
COMMITS_24H=$(git log --since="$SINCE" --oneline 2>/dev/null | wc -l | tr -d ' ')
BASICS_24H=$(git log --since="$SINCE" --oneline 2>/dev/null | grep -cE 'basics|\[iter[0-9]+ basics' || true)
AI_24H=$(git log --since="$SINCE" --oneline 2>/dev/null | grep -cE 'ai-automation|\[iter[0-9]+ ai-automation' || true)
PW_24H=$(git log --since="$SINCE" --oneline 2>/dev/null | grep -cE 'playwright-iter|playwright [0-9]' || true)
QUEUE_24H=$(git log --since="$SINCE" --oneline 2>/dev/null | grep -c '(queue:' || true)

# ---------- 出力 ----------
if [[ $JSON -eq 1 ]]; then
  cat <<JSON
{
  "queue": {
    "todo": $TODO_COUNT,
    "done": $DONE_COUNT,
    "hot_p0": $HOT_COUNT,
    "priority_zero": $P0_COUNT
  },
  "methodology": {
    "MS-1": "$MS1", "TC-1": "$TC1", "TC-2": "$TC2", "TC-3": "$TC3", "TC-4": "$TC4",
    "GT-1": "$GT1", "GT-2": "$GT2", "GT-3": "$GT3", "GT-4": "$GT4"
  },
  "fluffy": {
    "1": "$FL1", "2": "$FL2", "3": "$FL3", "4": "$FL4",
    "5": "$FL5", "6": "$FL6", "7": "$FL7", "8": "$FL8"
  },
  "last_24h": {
    "total": $COMMITS_24H,
    "basics": $BASICS_24H,
    "ai_automation": $AI_24H,
    "playwright": $PW_24H,
    "queue_consumed": $QUEUE_24H
  }
}
JSON
  exit 0
fi

if [[ $QUIET -eq 1 ]]; then
  echo "queue todo=$TODO_COUNT done=$DONE_COUNT p0=$P0_COUNT | 24h commits=$COMMITS_24H queue=$QUEUE_24H"
  exit 0
fi

# 視覚出力
mark() {
  if [[ "$1" == "done" ]]; then
    echo -e "${C_GREEN}✓${C_RESET}"
  else
    echo -e "${C_DIM}·${C_RESET}"
  fi
}

echo -e "${C_BOLD}━━━ saikyo-todo queue overview ━━━${C_RESET}"
echo
echo -e "${C_BOLD}1. 直近 5 commit${C_RESET}  ${C_DIM}(parallel agent との衝突 detect 用)${C_RESET}"
echo "$RECENT_COMMITS" | sed "s/^/  /"
echo
echo -e "${C_BOLD}2. queue 全体${C_RESET}"
echo -e "  未処理 ${C_YELLOW}[ ]${C_RESET}: $TODO_COUNT 件"
echo -e "  完了済 ${C_GREEN}[x]${C_RESET}: $DONE_COUNT 件"
echo -e "  🌟 hoist 中  : $HOT_COUNT 件"
echo -e "  ${C_RED}優先度 0${C_RESET}        : $P0_COUNT 件"
echo
echo -e "${C_BOLD}3. methodology mode 進捗${C_RESET}  ${C_DIM}(docs/methodology-modes-plan.md §5)${C_RESET}"
printf "  %s MS-1  %s TC-1  %s TC-2  %s TC-3  %s TC-4\n" \
  "$(mark $MS1)" "$(mark $TC1)" "$(mark $TC2)" "$(mark $TC3)" "$(mark $TC4)"
printf "  %s GT-1  %s GT-2  %s GT-3  %s GT-4\n" \
  "$(mark $GT1)" "$(mark $GT2)" "$(mark $GT3)" "$(mark $GT4)"
echo
echo -e "${C_BOLD}4. fluffy → widget series 進捗${C_RESET}  ${C_DIM}(FEEDBACK_QUEUE 「fluffy 撲滅 8 件」)${C_RESET}"
printf "  %s P0-1 standup  %s P0-2 premortem  %s P0-3 retro  %s P0-4 research-rm\n" \
  "$(mark $FL1)" "$(mark $FL2)" "$(mark $FL3)" "$(mark $FL4)"
printf "  %s P0-5 recovery %s P0-6 plan-strct %s P0-7 brief  %s P0-8 weekly\n" \
  "$(mark $FL5)" "$(mark $FL6)" "$(mark $FL7)" "$(mark $FL8)"
echo
echo -e "${C_BOLD}5. 直近 24h commit 統計${C_RESET}"
echo -e "  total           : ${C_CYAN}$COMMITS_24H${C_RESET} 件"
echo -e "  basics track    : $BASICS_24H 件"
echo -e "  ai-automation   : $AI_24H 件"
echo -e "  playwright      : $PW_24H 件"
echo -e "  queue 消化      : ${C_MAGENTA}$QUEUE_24H${C_RESET} 件"
echo
echo -e "${C_DIM}# 詳細は: bash scripts/autonomous/judge.sh / detect-patterns.sh${C_RESET}"

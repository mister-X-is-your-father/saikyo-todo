#!/usr/bin/env bash
# scripts/autonomous/judge.sh
#
# autonomous loop の冒頭で 1 回叩く「現在地判定」スクリプト。
#   - 直近 git log から最新 iter 番号を抽出
#   - 次 iter 番号 + base track (% 5 マップ) を表示
#   - リファクタ割り込み条件 (lint warning / TODO / any leak / hotspot) を
#     ざっくり要約 (詳細は detect-patterns.sh)
#
# 使い方:
#   bash scripts/autonomous/judge.sh         # iter 番号 + track + 直近 commit 一覧
#   bash scripts/autonomous/judge.sh --json  # JSON 出力 (他 script から食う用)
#
# 仕様の正解は src/lib/autonomous/iter-info.ts (vitest で固定)。
# ここはその bash 移植 (高速化用)。挙動が乖離したら iter-info.test.ts が落ちないので、
# 修正時は両方手当てする。

set -euo pipefail

JSON=0
case "${1:-}" in
  --json) JSON=1 ;;
  --help|-h)
    sed -n '2,18p' "$0"
    exit 0
    ;;
esac

cd "$(git rev-parse --show-toplevel)"

# 直近 20 commit から iter\d+ を全部拾って max を取る
LATEST_ITER=$(git log --oneline -50 \
  | grep -oE 'iter[0-9]+' \
  | sed -E 's/iter//' \
  | sort -n \
  | tail -1)
LATEST_ITER=${LATEST_ITER:-0}
NEXT_ITER=$((LATEST_ITER + 1))
MOD=$((NEXT_ITER % 5))

case "$MOD" in
  1|3) TRACK="basics" ;;
  2|4) TRACK="ai-automation" ;;
  0)   TRACK="refactor" ;;
esac

# リファクタ割り込み条件の軽量チェック (詳細値は detect-patterns.sh が出す)。
# TODO regex は src/lib/autonomous/patterns.ts::isActionableCodeTodo と同義:
#   コメント文脈 (// or /* or JSDoc `* `) + actionable 接尾 (`:` か `(`)。
# any-leak regex は src/lib/autonomous/patterns.ts::parseAnyLeaks と同義:
#   TS 構文として escape-hatch を意味する形だけ拾う。
TODO_COUNT=$({ git grep -nE '(//|/\*|^[[:space:]]*\*[[:space:]]).*\b(TODO|FIXME|HACK)\b[[:space:]]*[:(]|(//|/\*|^[[:space:]]*\*[[:space:]]).*あとで[[:space:]]*[:(]' \
  -- 'src/**/*.ts' 'src/**/*.tsx' ':(exclude)src/lib/autonomous/' 2>/dev/null || true; } | wc -l | tr -d ' ')
RECENT_ANY=$(git log -5 -p -- 'src/**/*.ts' 'src/**/*.tsx' 2>/dev/null \
  | grep -v '^+++' \
  | grep -cE '^\+.*(:[[:space:]]*any\b|\bas[[:space:]]+any\b|\bas[[:space:]]+unknown[[:space:]]+as\b|<[[:space:]]*any[[:space:]]*[,>]|,[[:space:]]*any[[:space:]]*[,>]|@ts-(expect-error|ignore)\b)' \
  || true)

INTERRUPTS=()
if [[ "$TODO_COUNT" -ge 5 ]]; then
  INTERRUPTS+=("refactor:TODO≥5(=$TODO_COUNT)")
fi
if [[ "${RECENT_ANY:-0}" -ge 1 ]]; then
  INTERRUPTS+=("refactor:recent-any-leak(=$RECENT_ANY)")
fi
if ! ls scripts/autonomous/*.sh >/dev/null 2>&1; then
  INTERRUPTS+=("tooling:cold-start(no-autonomous-scripts)")
fi

if [[ "$JSON" -eq 1 ]]; then
  printf '{"latest_iter":%d,"next_iter":%d,"base_track":"%s","interrupts":[' \
    "$LATEST_ITER" "$NEXT_ITER" "$TRACK"
  first=1
  for i in "${INTERRUPTS[@]:-}"; do
    [[ -z "$i" ]] && continue
    if [[ $first -eq 1 ]]; then first=0; else printf ','; fi
    printf '"%s"' "$i"
  done
  printf '],"todo_count":%d,"recent_any_leak":%d}\n' "$TODO_COUNT" "${RECENT_ANY:-0}"
  exit 0
fi

echo "=== iter judge ==="
echo "Latest iter: $LATEST_ITER"
echo "Next iter:   $NEXT_ITER"
echo "Base track:  $TRACK  (next % 5 = $MOD)"
echo
echo "Recent commits:"
git log --oneline -8
echo
echo "Interrupt signals:"
if [[ ${#INTERRUPTS[@]} -eq 0 ]]; then
  echo "  (none — proceed with base track)"
else
  for i in "${INTERRUPTS[@]:-}"; do
    [[ -z "$i" ]] && continue
    echo "  - $i"
  done
fi
echo
echo "Hint: bash scripts/autonomous/detect-patterns.sh で詳細値を見る"

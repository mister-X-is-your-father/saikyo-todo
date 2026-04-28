#!/usr/bin/env bash
# scripts/autonomous/detect-patterns.sh
#
# 「リファクタ割り込み条件」をひとつのレポートにまとめる軽量診断スクリプト。
# judge.sh が出す bool より一段詳しい数値を一望できるのが目的。
#
# 計測項目:
#   1. lint warning 件数        (≥10 で refactor 割り込み)
#   2. TODO/FIXME/あとで/hack    (≥5 で refactor 割り込み)
#   3. 直近 5 commit の any leak (≥1 で refactor 割り込み)
#   4. hotspot ファイル top 5    (直近 10 commit で 5 回以上変更)
#   5. 巨大ファイル              (.tsx >250 / service.ts >300)
#
# 集計ロジックの正解は src/lib/autonomous/patterns.ts (vitest 固定)。
#
# 使い方:
#   bash scripts/autonomous/detect-patterns.sh
#   bash scripts/autonomous/detect-patterns.sh --no-lint   # lint を skip (高速モード)

set -euo pipefail

SKIP_LINT=0
case "${1:-}" in
  --no-lint) SKIP_LINT=1 ;;
  --help|-h)
    sed -n '2,17p' "$0"
    exit 0
    ;;
esac

cd "$(git rev-parse --show-toplevel)"

echo "=== detect-patterns ==="

# 1. lint warning
if [[ "$SKIP_LINT" -eq 0 ]] && command -v pnpm >/dev/null 2>&1 && [[ -d node_modules ]]; then
  LINT_OUT=$(pnpm -s lint 2>&1 || true)
  LINT_WARNINGS=$(echo "$LINT_OUT" | grep -oE '[0-9]+ warnings?' | head -1 | awk '{print $1}')
  LINT_WARNINGS=${LINT_WARNINGS:-0}
  echo "1. Lint warnings: $LINT_WARNINGS"
else
  LINT_WARNINGS=0
  echo "1. Lint warnings: skipped (--no-lint or pnpm/node_modules 不在)"
fi

# 2. 実際にコメントとして書かれた actionable TODO/FIXME/HACK/あとで のみ。
#    旧実装は `(TODO|FIXME|あとで|hack)` を素朴 grep していたため製品名 `最強TODO` /
#    enum `'todo'` / 説明文 `TODO サービス` が大量に false positive 化していた
#    (iter254 で 18/18 中 17 件が偽陽性)。
#    src/lib/autonomous/patterns.ts::isActionableCodeTodo と同義: コメント文脈
#    (`//` / `/*` / JSDoc `* `) + actionable 接尾 (`:` か `(`) を要求。
#    `src/lib/autonomous/` は本検出器自身のソース + テスト fixture が住む場所
#    なので exclude する (それ以外で TODO が出たら本物の actionable コメント)。
TODO_COUNT=$({ git grep -nE '(//|/\*|^[[:space:]]*\*[[:space:]]).*\b(TODO|FIXME|HACK)\b[[:space:]]*[:(]|(//|/\*|^[[:space:]]*\*[[:space:]]).*あとで[[:space:]]*[:(]' \
  -- 'src/**/*.ts' 'src/**/*.tsx' ':(exclude)src/lib/autonomous/' 2>/dev/null || true; } | wc -l | tr -d ' ')
echo "2. Actionable TODO/FIXME/HACK in code comments: $TODO_COUNT"

# 3. 直近 5 commit の TS escape-hatch 追加。
#    src/lib/autonomous/patterns.ts::parseAnyLeaks と同義の構文限定 regex で
#    `recentAnyLeak` 等 identifier 内 substring を拾わない。pathspec で md / json
#    の単純な文字列 hit (HANDOFF.md 等) も除外。
ANY_LEAK=$(git log -5 -p -- 'src/**/*.ts' 'src/**/*.tsx' 2>/dev/null \
  | grep -v '^+++' \
  | grep -cE '^\+.*(:[[:space:]]*any\b|\bas[[:space:]]+any\b|\bas[[:space:]]+unknown[[:space:]]+as\b|<[[:space:]]*any[[:space:]]*[,>]|,[[:space:]]*any[[:space:]]*[,>]|@ts-(expect-error|ignore)\b)' \
  || true)
ANY_LEAK=${ANY_LEAK:-0}
echo "3. Recent TS escape-hatch additions (\`: any\` / \`as any\` / \`as unknown as\` / generic any / @ts-expect-error|ignore) in src/, last 5 commits: $ANY_LEAK"

# 4. hotspot ファイル top 5 (直近 10 commit で 5 回以上)
echo "4. Hotspot files (≥5 changes in last 10 commits):"
HOTSPOT_OUT=$(git log -10 --name-only --pretty='format:%h %s' 2>/dev/null \
  | awk 'NF==1' \
  | sort | uniq -c | sort -rn \
  | awk '$1 >= 5 { printf "   %s × %d\n", $2, $1 }')
if [[ -z "$HOTSPOT_OUT" ]]; then
  echo "   (none)"
  HOTSPOT_COUNT=0
else
  echo "$HOTSPOT_OUT" | head -5
  HOTSPOT_COUNT=$(echo "$HOTSPOT_OUT" | wc -l | tr -d ' ')
fi

# 5. 巨大ファイル (component .tsx > 250、service.ts > 300)
echo "5. Large files:"
LARGE_OUT=$(
  {
    find src/components -name '*.tsx' -type f 2>/dev/null \
      | xargs -I{} sh -c 'wc -l "{}" 2>/dev/null' \
      | awk '$1 > 250 { printf "   component  %d  %s\n", $1, $2 }'
    find src/features -name 'service.ts' -type f 2>/dev/null \
      | xargs -I{} sh -c 'wc -l "{}" 2>/dev/null' \
      | awk '$1 > 300 { printf "   service    %d  %s\n", $1, $2 }'
  } | sort -k2 -rn
)
if [[ -z "$LARGE_OUT" ]]; then
  echo "   (none)"
  LARGE_COUNT=0
else
  echo "$LARGE_OUT" | head -10
  LARGE_COUNT=$(echo "$LARGE_OUT" | wc -l | tr -d ' ')
fi

# Triggered conditions サマリ
echo
echo "Triggered refactor conditions:"
TRIGGERS=()
[[ "$LINT_WARNINGS" -ge 10 ]] && TRIGGERS+=("lint-warnings≥10(=$LINT_WARNINGS)")
[[ "$TODO_COUNT" -ge 5 ]] && TRIGGERS+=("todo-fixme≥5(=$TODO_COUNT)")
[[ "$ANY_LEAK" -ge 1 ]] && TRIGGERS+=("recent-any-leak(=$ANY_LEAK)")
[[ "$HOTSPOT_COUNT" -ge 1 ]] && TRIGGERS+=("hotspot-files(=$HOTSPOT_COUNT)")
[[ "$LARGE_COUNT" -ge 1 ]] && TRIGGERS+=("large-files(=$LARGE_COUNT)")

if [[ ${#TRIGGERS[@]} -eq 0 ]]; then
  echo "  (none — base track でそのまま進行)"
else
  for t in "${TRIGGERS[@]:-}"; do
    [[ -z "$t" ]] && continue
    echo "  - $t"
  done
fi

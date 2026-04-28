#!/usr/bin/env bash
# scripts/autonomous/push-main.sh
#
# autonomous loop の最後で「現在 branch の HEAD を origin/main に直接乗せる」
# ためのフォールバック付き push スクリプト。
#
# 段階:
#   1. fast push: `git push origin HEAD:main --no-verify`
#   2. non-fast-forward なら fetch + rebase してリトライ
#   3. 完了確認: `git fetch origin && git log origin/main --oneline -N` で
#      自分の HEAD が top に乗っていることを確認
#
# main プロンプトの「main 直行 push 必須」セクション (1, 2, 3 段) と意味的に等価。
#
# 使い方:
#   bash scripts/autonomous/push-main.sh             # 実行
#   bash scripts/autonomous/push-main.sh --dry-run   # 何が起きるかだけ表示
#   bash scripts/autonomous/push-main.sh --verify-N=5 # 確認時に top 5 を表示 (default 10)

set -euo pipefail

DRY_RUN=0
VERIFY_N=10
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --verify-N=*) VERIFY_N="${arg#--verify-N=}" ;;
    --help|-h)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *)
      echo "unknown arg: $arg" >&2
      exit 2
      ;;
  esac
done

cd "$(git rev-parse --show-toplevel)"

LOCAL_HEAD=$(git rev-parse HEAD)
LOCAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "=== push-main ==="
echo "Local HEAD:   $LOCAL_HEAD"
echo "Local branch: $LOCAL_BRANCH"
echo "Pushing to:   origin/main"
echo "Mode:         $([[ $DRY_RUN -eq 1 ]] && echo dry-run || echo live)"
echo

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  echo "+ $*"
  "$@"
}

push_once() {
  run git push origin HEAD:main --no-verify
}

# 1. fast push
echo ">>> step 1: fast push"
if push_once 2>&1; then
  PUSH_OK=1
else
  PUSH_OK=0
fi

# 2. non-fast-forward 等で失敗したら fetch + rebase してリトライ
if [[ $PUSH_OK -eq 0 ]]; then
  echo
  echo ">>> step 2: fast push 失敗 — fetch + rebase してリトライ"
  run git fetch origin main
  if ! run git rebase origin/main; then
    echo "!! rebase で conflict が発生。手動解決 → git rebase --continue → push-main.sh を再実行"
    exit 1
  fi
  if ! push_once; then
    echo "!! 再 push も失敗。gh CLI 経由 PR 作成 + admin merge を検討"
    exit 1
  fi
fi

# 3. 確認
echo
echo ">>> step 3: 確認"
if [[ $DRY_RUN -eq 1 ]]; then
  echo "[dry-run] git fetch origin && git log origin/main --oneline -$VERIFY_N"
  exit 0
fi

run git fetch origin
echo
echo "origin/main の top $VERIFY_N commit:"
git log origin/main --oneline -"$VERIFY_N"

REMOTE_HEAD=$(git rev-parse origin/main)
if [[ "$REMOTE_HEAD" == "$LOCAL_HEAD" ]]; then
  echo
  echo "✓ 成功: origin/main の HEAD = local HEAD ($LOCAL_HEAD)"
  exit 0
fi

# rebase 後に local HEAD が変わっているケースもありえる (rebase 後の resolve commit)
if git merge-base --is-ancestor "$LOCAL_HEAD" "$REMOTE_HEAD"; then
  echo
  echo "✓ 成功: local HEAD は origin/main の ancestor (rebase 後の前進が含まれる)"
  exit 0
fi

echo
echo "!! 確認失敗: origin/main = $REMOTE_HEAD だが local HEAD = $LOCAL_HEAD"
echo "   差分を確認: git log $LOCAL_HEAD..$REMOTE_HEAD --oneline"
exit 1

#!/usr/bin/env bash
# leo-deploy.sh — leo (本番代用、Tailscale Serve :10443 → pnpm dev :3001) で
#                 origin/main を polling pull するスクリプト。
#
# 設計:
#   - cron で 4 時間ごとに呼ばれる想定 (crontab エントリは下記参照)
#   - WT clean かつ branch=main の時だけ `git pull --ff-only` を実行
#   - dirty / 別 branch / non-fast-forward なら何もせず exit 0 (ローカル開発を妨げない)
#   - flock で多重起動防止 (cron が長 pull で重なっても安全)
#   - next dev (file watch + turbopack hot reload) が pull 後の変更を自動反映
#
# 出力:
#   - stdout: 必要時のみ 1 行 (cron でメール抑止のため通常時は黙る)
#   - 失敗時は exit 1 (cron が STDERR を mail/log する想定)
#
# Cron 例 (`crontab -e` に追加、4 時間毎 = 6 回/日):
#   0 */4 * * * /home/neo/saikyo-todo/scripts/leo-deploy.sh >> /tmp/saikyo-leo-deploy.log 2>&1
#
# ログ確認: tail -f /tmp/saikyo-leo-deploy.log
# 一時停止: crontab エントリを # でコメントアウト
set -euo pipefail

REPO="${SAIKYO_LEO_REPO:-/home/neo/saikyo-todo}"
LOCKFILE="${SAIKYO_LEO_LOCK:-/tmp/saikyo-leo-deploy.lock}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# 多重起動防止 (例: pnpm install が走ってる時に次 cron が重複)
exec 200>"$LOCKFILE"
flock -n 200 || { echo "[$TS] another instance running, skipping"; exit 0; }

cd "$REPO" || { echo "[$TS] ERROR: cannot cd to $REPO"; exit 1; }

# detached HEAD / 別 branch なら skip (ローカル feature 作業中)
current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [[ "$current_branch" != "main" ]]; then
  # 通常は黙る (ログ汚さないため)。debug したければ次行を有効化
  # echo "[$TS] not on main (on '$current_branch'), skipping"
  exit 0
fi

# WT dirty なら skip (ローカル編集中)
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  # echo "[$TS] working tree dirty, skipping"
  exit 0
fi

# fetch
if ! git fetch origin main --quiet 2>/dev/null; then
  echo "[$TS] ERROR: fetch failed (network down?)"
  exit 1
fi

local_head=$(git rev-parse HEAD)
remote_head=$(git rev-parse origin/main)
if [[ "$local_head" == "$remote_head" ]]; then
  # 既に最新、何もしない (黙る)
  exit 0
fi

# fast-forward が可能か事前確認 (`git merge-base --is-ancestor` で)
if ! git merge-base --is-ancestor "$local_head" "$remote_head" 2>/dev/null; then
  echo "[$TS] WARN: local diverged from origin/main ($local_head ≠ ancestor of $remote_head), skipping ff-only pull"
  exit 0
fi

# ff pull
if git pull --ff-only origin main --quiet 2>&1; then
  new_head=$(git rev-parse HEAD)
  short_old="${local_head:0:7}"
  short_new="${new_head:0:7}"
  count=$(git rev-list --count "$local_head..$new_head")
  echo "[$TS] pulled $short_old → $short_new (+$count commits)"
else
  echo "[$TS] ERROR: pull --ff-only failed unexpectedly"
  exit 1
fi

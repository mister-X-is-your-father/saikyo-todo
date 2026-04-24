#!/bin/sh
# ================================================================
# pg_dump 日次バックアップ (保持 7 日)
# ================================================================
# docker-compose.yml の db-backup サービスがこのスクリプトを entrypoint として実行。
# DATABASE_URL は必須 (postgres://user:pass@host:port/db 形式)。
#
# /backups/YYYY-MM-DD.sql.gz として保存、7 日経ったものは削除。
# 本格運用では rclone で別ホストに転送 (POST_MVP.md 参照)。
# ================================================================

set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[backup] DATABASE_URL not set, aborting"
  exit 1
fi

while true; do
  STAMP=$(date -u +"%Y-%m-%d_%H%M")
  DAY=$(date -u +"%Y-%m-%d")
  OUT="/backups/${DAY}.sql.gz"
  echo "[backup] starting $STAMP → $OUT"
  # gzip 圧縮、フォルダ無ければ作成
  mkdir -p /backups
  if pg_dump "$DATABASE_URL" | gzip > "$OUT.partial"; then
    mv "$OUT.partial" "$OUT"
    echo "[backup] ok $OUT"
  else
    echo "[backup] FAILED $OUT.partial"
    rm -f "$OUT.partial"
  fi
  # 7 日超のファイルを削除
  find /backups -type f -name '*.sql.gz' -mtime +7 -delete || true
  # 24 時間スリープ
  sleep 86400
done

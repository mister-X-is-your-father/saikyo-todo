-- Postgres 拡張機能の有効化。
-- これらは saikyo-todo の前提として常に有効である必要がある。
-- 実装プラン §3.2 / REQUIREMENTS.md §2.2 参照。

-- LTREE: Item / TemplateItem の parent_path (ツリー構造)
create extension if not exists "ltree";

-- pgvector: doc_chunks.embedding (RAG セマンティック検索)
create extension if not exists "vector";

-- pg_trgm: 部分一致 ILIKE の高速化補助 + 日本語 FTS フォールバック
create extension if not exists "pg_trgm";

-- pg_bigm: 日本語 N-gram 全文検索 (Item.title / Doc.body の FTS)
-- Supabase ローカルでは未バンドル (確認済 2026-04)。本番自前ホストで pg_bigm を
-- 入れた Postgres を使う場合のみ有効化する。MVP では pg_trgm + tsvector フォールバックを
-- Service 層で採用する (Plan §7 リスク緩和)。
-- create extension if not exists "pg_bigm";

-- pg_cron: recurring Template の定期展開 / PM Agent Stand-up
-- Supabase デフォルトで有効。スケジュール登録は別マイグレーションで行う。
create extension if not exists "pg_cron";

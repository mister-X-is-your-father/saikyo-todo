-- Day 17 P2: Full-text 検索用 pg_trgm GIN index。
--
-- ARCHITECTURE.md #U は当初 pg_bigm 採用だったが、Supabase local には
-- pg_bigm が含まれておらず、代わりに pg_trgm (0001_extensions.sql で既に install 済) と
-- pgroonga が利用可能だった。pg_trgm は trigram ベースで日本語も実用十分、
-- かつ追加 extension 不要で保守的なため採用。
--
-- 使う演算子: `word_similarity()`, `<%` (閾値判定、GIN 対応), `<<->` (距離、ORDER BY 用)
-- 閾値は session 変数 `pg_trgm.word_similarity_threshold` で制御 (既定 0.6)。

create index if not exists doc_chunks_content_trgm_idx
  on public.doc_chunks
  using gin (content gin_trgm_ops);

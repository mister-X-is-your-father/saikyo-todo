-- Day 16: RAG セマンティック検索用 HNSW index
--
-- pgvector の hnsw index は Drizzle Kit が未対応なので手書き SQL で追加する。
-- cosine 距離 (`vector_cosine_ops`): e5 embedding は normalize 済なので cosine
-- similarity = dot product。HNSW は recall/性能のトレードオフだが MVP 規模では既定値で十分。
--
-- 参考:
--   https://github.com/pgvector/pgvector#hnsw
--   m=16, ef_construction=64 が既定 (ここでは明示しない)

create index if not exists doc_chunks_embedding_hnsw_idx
  on public.doc_chunks
  using hnsw (embedding vector_cosine_ops);

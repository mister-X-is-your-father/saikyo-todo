-- =====================================================================
-- items.position を numeric(30,15) から text (fractional-indexing base62) へ変換
-- =====================================================================
-- 理由: fractional-indexing lib (既に install 済) は base62 文字列を返すため、
--       numeric との型ミスマッチを解消。文字列 lex sort で並び順が一致。
--       numeric の中点計算は ~50 回で精度枯渇、rebalance が必要になるが、
--       文字列 append 方式は無限分割可能。
--
-- 既存データは PoC のみなので、numeric '0' を 'a0' (lib の canonical first) に置換。
-- =====================================================================

alter table public.items
  alter column position drop default;

alter table public.items
  alter column position type text using position::text;

update public.items set position = 'a0' where position = '0';

alter table public.items
  alter column position set default 'a0';

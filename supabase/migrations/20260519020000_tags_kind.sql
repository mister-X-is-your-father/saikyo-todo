-- queue: methodology GT-2 — tags.kind 列 + context tag 慣習
-- 詳細: docs/methodology-modes-plan.md §1 G-3 + FEEDBACK_QUEUE.md GT-2
--
-- GTD context tag (@home / @office / @phone / @errands 等) を 「kind='context'」 で区別。
-- UI で「context 専用 filter」 を出すための data 軸。

alter table public.tags
  add column if not exists kind text not null default 'normal'
  check (kind in ('normal', 'context'));

-- context tag だけ拾う partial index
create index if not exists tags_workspace_context_idx
  on public.tags (workspace_id)
  where kind = 'context';

comment on column public.tags.kind is
  'tag 種別。normal=一般、context=GTD context (@home / @office 等)。GT-2';
